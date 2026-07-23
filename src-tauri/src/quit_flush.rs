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

// What to do once the flush wait (notify-or-timeout) settles. Kept as a plain
// enum decided by a pure function so the branching is unit-testable without a
// running AppHandle/Window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlushOutcome {
    /// A real app-level quit was requested at some point before the flush
    /// finished: fully exit the process.
    Exit,
    /// No quit intent was recorded — this was just a single window being
    /// closed: close that window and let the app keep running.
    CloseWindow,
}

// Pure decision logic extracted for testing: given whatever quit_intent was
// recorded by the time the flush settled, what should happen next. Whether
// the flush settled via an explicit notify or via the timeout fallback does
// not change this decision — both are "the frontend's chance is over, proceed" —
// so only quit_intent is an input.
pub fn decide_flush_outcome(quit_intent: bool) -> FlushOutcome {
    if quit_intent {
        FlushOutcome::Exit
    } else {
        FlushOutcome::CloseWindow
    }
}

// Races the frontend's before_quit_flush_done ack against a timeout. Returns
// true if the ack won (notified), false if the timeout fired first. The
// timeout is a parameter (rather than always reading QUIT_FLUSH_TIMEOUT_MS
// directly) so tests can exercise both branches under `tokio::time::pause()`
// without depending on the production constant's value.
pub async fn wait_for_flush_or_timeout(notify: &Notify, timeout_ms: u64) -> bool {
    let timeout = tokio::time::sleep(Duration::from_millis(timeout_ms));
    tokio::pin!(timeout);
    tokio::select! {
        _ = notify.notified() => true,
        _ = &mut timeout => false,
    }
}

// Shared flush-and-decide task, spawned by both the per-window close path and
// the app-level exit-requested path (see handle_window_event / handle_run_event
// below). `window` is Some only when triggered by a specific window's close
// button, so a CloseWindow outcome has something to close; the exit-requested
// path passes None since a bare quit intent always resolves to Exit.
//
// Callers must perform the `flush_pending` swap-guard themselves *before*
// calling this, synchronously, so two racing triggers only ever result in one
// spawn. This function assumes that guard already passed.
fn spawn_flush_task(app_handle: AppHandle, window: Option<Window>) {
    tauri::async_runtime::spawn(async move {
        let state = app_handle.state::<QuitState>();
        let _ = app_handle.emit("before-quit-flush", ());

        wait_for_flush_or_timeout(&state.flush_notify, QUIT_FLUSH_TIMEOUT_MS).await;

        state.quitting_for_real.store(true, Ordering::SeqCst);
        state.flush_pending.store(false, Ordering::SeqCst);

        match decide_flush_outcome(state.quit_intent.load(Ordering::SeqCst)) {
            FlushOutcome::Exit => {
                app_handle.exit(0);
            }
            FlushOutcome::CloseWindow => {
                if let Some(window) = window {
                    let _ = window.close();
                }
            }
        }
    });
}

// Intercepts a window's own close (a plain click on the close button, or the
// OS routing a single-window close through here) so the frontend gets one
// last chance to flush to localStorage/disk before the window actually
// closes, with a timeout so quit is never blocked indefinitely. Mirrors
// electron/main.ts's beginQuitFlush — see that file's comments for why this
// hooks the window-close event rather than an app-level "before quit" event.
//
// This is NOT the only path that can trigger the flush — see handle_run_event
// below for why the app-level exit path needs its own trigger too.
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

        spawn_flush_task(app_handle.clone(), Some(window.clone()));
    }
}

// Fires when the whole app is asked to exit — Cmd+Q, the custom "quit" menu
// item (see menu.rs), or any AppHandle::exit() call — distinct from a single
// window's close button.
//
// This DOES need to spawn the same flush-and-wait task itself, not just
// record intent and rely on handle_window_event having already run first.
// Investigation of the actual tauri/tao/muda source (tauri 2.11.5, tauri-runtime-wry
// 2.11.4, tao 0.35.3, muda 0.19.3, all under
// ~/.cargo/registry/src/index.crates.io-*/) found two independent ways
// ExitRequested can fire *without* CloseRequested having fired for every
// window first:
//
//   1. `AppHandle::exit()` sends `Message::RequestExit`, which
//      tauri-runtime-wry's event loop (src/lib.rs, `Event::UserEvent(Message::RequestExit(code))`)
//      turns directly into `RunEvent::ExitRequested`. It never touches any
//      window's CloseRequested handler.
//   2. On macOS, muda's `PredefinedMenuItemType::Quit` (the item this project
//      used to use for the app-menu "Quit" entry, and the item macOS's native
//      Cmd+Q accelerator activates) is bound directly to the native
//      `terminate:` Cocoa selector (muda's
//      platform_impl/macos/mod.rs: `PredefinedMenuItemType::Quit => Some(sel!(terminate:))`).
//      `NSApplication`'s default `terminate:` implementation calls
//      `applicationShouldTerminate:` on the app delegate and, if that method
//      isn't implemented, immediately proceeds to terminate the process.
//      tao's macOS app delegate (platform_impl/macos/app_delegate.rs) only
//      implements `applicationWillTerminate:` (a no-op trace log) — it does
//      NOT implement `applicationShouldTerminate:` anywhere in tao 0.35.3, and
//      no crate in this dependency tree does (confirmed: the only occurrence
//      of that selector in the whole registry tree is the raw FFI binding in
//      objc2-app-kit, never called). So the native Quit item / Cmd+Q on macOS
//      terminates the process via Cocoa's default path WITHOUT going through
//      tao's tao/wry event loop at all — no CloseRequested, no ExitRequested,
//      nothing for Rust to intercept.
//
// Because of (2), this fix has two parts: (a) menu.rs no longer uses
// PredefinedMenuItem::quit for the macOS app-menu Quit entry — it uses a
// plain custom "quit" MenuItem (still accelerated Cmd+Q) whose click is
// dispatched through the normal MenuEvent -> handle_menu_event path and calls
// AppHandle::exit(), which *does* route through RunEvent::ExitRequested (per
// (1) above); and (b) this function spawns the same flush task
// handle_window_event uses, guarded by the same flush_pending swap, so
// ExitRequested reliably gets its own flush regardless of whether any
// window's CloseRequested happened to fire first.
pub fn handle_run_event(app_handle: &AppHandle, event: RunEvent) {
    if let RunEvent::ExitRequested { api, .. } = event {
        let state = app_handle.state::<QuitState>();

        if state.quitting_for_real.load(Ordering::SeqCst) {
            return;
        }
        state.quit_intent.store(true, Ordering::SeqCst);
        api.prevent_exit();

        if state.flush_pending.swap(true, Ordering::SeqCst) {
            return;
        }

        spawn_flush_task(app_handle.clone(), None);
    }
}

#[tauri::command]
pub fn before_quit_flush_done(app: AppHandle) {
    app.state::<QuitState>().flush_notify.notify_one();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quit_state_default_has_expected_initial_values() {
        let state = QuitState::default();
        assert!(!state.quitting_for_real.load(Ordering::SeqCst));
        assert!(!state.quit_intent.load(Ordering::SeqCst));
        assert!(!state.flush_pending.load(Ordering::SeqCst));
    }

    #[test]
    fn decide_flush_outcome_exits_when_quit_intent_is_set() {
        assert_eq!(decide_flush_outcome(true), FlushOutcome::Exit);
    }

    #[test]
    fn decide_flush_outcome_closes_window_without_quit_intent() {
        assert_eq!(decide_flush_outcome(false), FlushOutcome::CloseWindow);
    }

    #[tokio::test(start_paused = true)]
    async fn wait_for_flush_returns_true_when_notified_before_timeout() {
        let notify = Notify::new();
        notify.notify_one();

        let notified = wait_for_flush_or_timeout(&notify, 3000).await;

        assert!(notified, "notify_one() before the wait should win the race");
    }

    #[tokio::test(start_paused = true)]
    async fn wait_for_flush_falls_back_to_timeout_when_never_notified() {
        let notify = Notify::new();

        // No notify_one() call — the real-world "frontend never acked" case.
        // start_paused + a background task advancing virtual time lets this
        // resolve instantly instead of actually sleeping 3s.
        let wait = wait_for_flush_or_timeout(&notify, 3000);
        tokio::pin!(wait);

        tokio::time::advance(Duration::from_millis(3001)).await;

        let notified = wait.await;
        assert!(!notified, "with no notify, the timeout fallback must still proceed");
    }

    #[tokio::test(start_paused = true)]
    async fn flush_pending_swap_guard_only_lets_one_caller_through() {
        // Mirrors the guard both handle_window_event and handle_run_event use
        // before calling spawn_flush_task: two "concurrent" callers racing the
        // same swap should see exactly one `false` (i.e. only one of them is
        // responsible for spawning the flush task).
        let state = QuitState::default();

        let first_was_pending = state.flush_pending.swap(true, Ordering::SeqCst);
        let second_was_pending = state.flush_pending.swap(true, Ordering::SeqCst);

        assert!(!first_was_pending, "first caller should win the guard and spawn");
        assert!(second_was_pending, "second caller must back off, not spawn a duplicate");
    }

    #[tokio::test(start_paused = true)]
    async fn app_level_quit_intent_resolves_to_exit_even_without_a_prior_window_close() {
        // The regression this whole fix is about: simulate handle_run_event's
        // path end-to-end (minus the AppHandle-specific glue, which needs a
        // running app) — quit_intent gets set, no window ever sent
        // CloseRequested, and the flush still resolves to Exit once the
        // frontend acks (or the timeout fires).
        let state = QuitState::default();
        state.quit_intent.store(true, Ordering::SeqCst);

        assert!(
            !state.flush_pending.swap(true, Ordering::SeqCst),
            "guard should be open on a fresh QuitState"
        );

        state.flush_notify.notify_one();
        let notified = wait_for_flush_or_timeout(&state.flush_notify, 3000).await;
        assert!(notified);

        state.quitting_for_real.store(true, Ordering::SeqCst);
        state.flush_pending.store(false, Ordering::SeqCst);

        assert_eq!(
            decide_flush_outcome(state.quit_intent.load(Ordering::SeqCst)),
            FlushOutcome::Exit,
            "an app-level quit with no prior window close must still resolve to Exit"
        );
    }
}
