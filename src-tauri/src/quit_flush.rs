use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Window, WindowEvent};
use tokio::sync::Notify;

const QUIT_FLUSH_TIMEOUT_MS: u64 = 3000;

pub struct QuitState {
    pub quitting_for_real: AtomicBool,
    pub quit_intent: AtomicBool,
    pub flush_pending: AtomicBool,
    pub flush_notify: Notify,
}

impl Default for QuitState {
    fn default() -> Self {
        Self {
            quitting_for_real: AtomicBool::new(false),
            quit_intent: AtomicBool::new(false),
            flush_pending: AtomicBool::new(false),
            flush_notify: Notify::new(),
        }
    }
}

// Intercepts the window's own close (Cmd+Q, the Quit menu item, or a plain
// click on the close button all route here first) so the frontend gets one
// last chance to flush to localStorage/disk before the window actually
// closes, with a timeout so quit is never blocked indefinitely. Mirrors
// electron/main.ts's beginQuitFlush — see that file's comments for why this
// hooks the window-close event rather than an app-level "before quit" event.
pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let app_handle = window.app_handle();
        let state = app_handle.state::<QuitState>();

        if state.quitting_for_real.load(Ordering::SeqCst) {
            return;
        }
        api.prevent_close();

        if state.flush_pending.swap(true, Ordering::SeqCst) {
            return;
        }

        let window = window.clone();
        let app_handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let state = app_handle.state::<QuitState>();
            let _ = window.emit("before-quit-flush", ());

            let timeout = tokio::time::sleep(Duration::from_millis(QUIT_FLUSH_TIMEOUT_MS));
            tokio::pin!(timeout);
            tokio::select! {
                _ = state.flush_notify.notified() => {}
                _ = &mut timeout => {}
            }

            state.quitting_for_real.store(true, Ordering::SeqCst);
            state.flush_pending.store(false, Ordering::SeqCst);
            if state.quit_intent.load(Ordering::SeqCst) {
                app_handle.exit(0);
            } else {
                let _ = window.close();
            }
        });
    }
}

// Fires when the whole app is asked to exit (Cmd+Q, the Quit menu item) —
// distinct from a single window's close button. Records the intent so the
// spawned task above knows whether to fully exit or just close the window
// once the flush completes.
pub fn handle_run_event(app_handle: &AppHandle, event: RunEvent) {
    if let RunEvent::ExitRequested { api, .. } = event {
        let state = app_handle.state::<QuitState>();
        if !state.quitting_for_real.load(Ordering::SeqCst) {
            state.quit_intent.store(true, Ordering::SeqCst);
            api.prevent_exit();
        }
    }
}

#[tauri::command]
pub fn before_quit_flush_done(app: AppHandle) {
    app.state::<QuitState>().flush_notify.notify_one();
}
