mod backup;
#[cfg(desktop)]
mod menu;
mod quit_flush;

use backup::BackupState;
use quit_flush::QuitState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(BackupState::default())
        .manage(QuitState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
            quit_flush::before_quit_flush_done,
        ])
        .on_window_event(quit_flush::handle_window_event);

    // Native menu bar, self-hosted updater, and process-restart-on-update are
    // desktop concepts with no iOS analog: there's no menu bar on iOS, and
    // App Store review requires distribution/update flows to go through the
    // App Store rather than a self-hosted updater plugin.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_menu = menu::build_menu(app)?;
            app.set_menu(app_menu)?;
            Ok(())
        })
        .on_menu_event(menu::handle_menu_event);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(quit_flush::handle_run_event);
}
