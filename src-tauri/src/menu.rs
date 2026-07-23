use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{App, AppHandle, Emitter, Wry};
use tauri_plugin_shell::ShellExt;

pub fn build_menu(app: &App) -> tauri::Result<Menu<Wry>> {
    let is_mac = cfg!(target_os = "macos");

    let new_task = MenuItemBuilder::with_id("new-task", "New Task")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let save = MenuItemBuilder::with_id("save", "Save Changes")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let export = MenuItemBuilder::with_id("export", "Export Data…")
        .accelerator("CmdOrCtrl+E")
        .build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator(if is_mac { "Cmd+," } else { "Ctrl+," })
        .build(app)?;

    let mut file_builder = SubmenuBuilder::new(app, "File")
        .item(&new_task)
        .item(&save)
        .item(&export);
    if !is_mac {
        file_builder = file_builder.separator().item(&settings);
    }
    let file_menu = file_builder
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let command_palette = MenuItemBuilder::with_id("command-palette", "Command Palette…")
        .accelerator("CmdOrCtrl+K")
        .build(app)?;
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&command_palette)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let github = MenuItemBuilder::with_id("open-github", "Timetraked on GitHub").build(app)?;
    let shortcuts_help = MenuItemBuilder::with_id("shortcuts-help", "Keyboard Shortcuts").build(app)?;
    let check_updates = MenuItemBuilder::with_id("check-updates", "Check for Updates…").build(app)?;
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&github)
        .separator()
        .item(&shortcuts_help)
        .item(&check_updates)
        .build()?;

    let mut builder = MenuBuilder::new(app);
    if is_mac {
        let preferences = MenuItemBuilder::with_id("settings", "Preferences…")
            .accelerator("Cmd+,")
            .build(app)?;
        let app_menu = SubmenuBuilder::new(app, "Timetraked")
            .item(&PredefinedMenuItem::about(app, None, None)?)
            .separator()
            .item(&preferences)
            .separator()
            .item(&PredefinedMenuItem::services(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::hide(app, None)?)
            .item(&PredefinedMenuItem::hide_others(app, None)?)
            .item(&PredefinedMenuItem::show_all(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::quit(app, None)?)
            .build()?;
        builder = builder.item(&app_menu);
    }

    builder = builder.item(&file_menu).item(&edit_menu).item(&view_menu).item(&help_menu);
    builder.build()
}

// Menu clicks are dispatched here rather than handled per-item, mirroring
// electron/menu.ts's sendMenuAction: this process only tells the frontend
// what was clicked (or, for open-github, opens the URL itself) — the
// frontend owns routing/dialog state. "check-updates" is emitted the same
// way and intercepted by the frontend shim (Task 9) rather than special-cased
// here, unlike Electron's main-process-only updater.
pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();
    if id == "open-github" {
        let _ = app.shell().open("https://github.com/AdamJ/TimeTrackerPro", None);
        return;
    }
    let _ = app.emit("menu:action", id);
}
