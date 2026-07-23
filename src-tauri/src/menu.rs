use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{App, AppHandle, Emitter, Wry};
use tauri_plugin_opener::OpenerExt;

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
        // Deliberately NOT PredefinedMenuItem::quit: that binds directly to
        // the native Cocoa `terminate:` selector, which bypasses Tauri's
        // event loop entirely (no CloseRequested, no ExitRequested — see
        // quit_flush.rs's handle_run_event doc comment for the full
        // investigation) and so never gives the frontend a chance to flush.
        // A plain custom item dispatches through handle_menu_event below,
        // which calls AppHandle::exit() — that DOES route through
        // RunEvent::ExitRequested.
        let quit = MenuItemBuilder::with_id("quit", "Quit Timetraked")
            .accelerator("Cmd+Q")
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
            .item(&quit)
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
// here, unlike Electron's main-process-only updater. "quit" is also handled
// here rather than emitted — see the custom "quit" MenuItem's comment in
// build_menu for why this goes through AppHandle::exit() (which reliably
// fires RunEvent::ExitRequested) instead of a native predefined item.
pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();
    match menu_action_for_id(id) {
        MenuAction::OpenGithub => {
            let _ = app.opener().open_url("https://github.com/AdamJ/TimeTrackerPro", None::<String>);
        }
        MenuAction::Quit => {
            app.exit(0);
        }
        MenuAction::Emit => {
            let _ = app.emit("menu:action", id);
        }
    }
}

// Pure dispatch decision extracted from handle_menu_event so it's unit
// testable without a running AppHandle/window (mirroring the quit_flush.rs
// refactor's decide_flush_outcome).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MenuAction {
    OpenGithub,
    Quit,
    Emit,
}

fn menu_action_for_id(id: &str) -> MenuAction {
    match id {
        "open-github" => MenuAction::OpenGithub,
        "quit" => MenuAction::Quit,
        _ => MenuAction::Emit,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_github_id_dispatches_to_open_github_action() {
        assert_eq!(menu_action_for_id("open-github"), MenuAction::OpenGithub);
    }

    #[test]
    fn quit_id_dispatches_to_quit_action() {
        assert_eq!(menu_action_for_id("quit"), MenuAction::Quit);
    }

    #[test]
    fn known_action_ids_dispatch_to_emit() {
        for id in [
            "new-task",
            "save",
            "export",
            "settings",
            "command-palette",
            "shortcuts-help",
            "check-updates",
        ] {
            assert_eq!(menu_action_for_id(id), MenuAction::Emit, "id {id} should emit menu:action");
        }
    }

    #[test]
    fn unknown_id_falls_back_to_emit() {
        assert_eq!(menu_action_for_id("some-future-menu-item"), MenuAction::Emit);
    }
}
