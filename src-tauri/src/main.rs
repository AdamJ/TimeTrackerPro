#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod menu;
mod quit_flush;

use backup::BackupState;
use quit_flush::QuitState;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(BackupState::default())
        .manage(QuitState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
            quit_flush::before_quit_flush_done,
        ])
        .setup(|app| {
            let app_menu = menu::build_menu(app)?;
            app.set_menu(app_menu)?;
            Ok(())
        })
        .on_menu_event(menu::handle_menu_event)
        .on_window_event(quit_flush::handle_window_event)
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(quit_flush::handle_run_event);
}
