#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod menu;

use backup::BackupState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackupState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
        ])
        .setup(|app| {
            let app_menu = menu::build_menu(app)?;
            app.set_menu(app_menu)?;
            Ok(())
        })
        .on_menu_event(menu::handle_menu_event)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
