#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;

use backup::BackupState;

fn main() {
    tauri::Builder::default()
        .manage(BackupState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
