import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setPendingMenuAction } from "@/lib/electronMenuActions";

interface UseKeyboardShortcutsOptions {
  onSave: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

// Global shortcuts for the web/PWA build: N (new task), Cmd/Ctrl+S (save),
// Cmd/Ctrl+K (command palette), and ? (shortcuts help). New task uses a plain
// key rather than Cmd/Ctrl+N because Chrome/Firefox reserve that combination
// for opening a new browser window and never deliver it to page JS from a
// regular tab — it only works as a preventable shortcut in an installed PWA.
// Electron intercepts Cmd/Ctrl+N/S/K at the native menu layer (electron/menu.ts)
// before they reach this window listener, so the two never double-fire; its
// menu keeps the native Cmd/Ctrl+N accelerator for New Task since Electron
// doesn't have the browser's reservation.
export function useKeyboardShortcuts({
  onSave,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
}: UseKeyboardShortcutsOptions): void {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (hasModifier && key === "k") {
        event.preventDefault();
        onOpenCommandPalette();
        return;
      }

      if (hasModifier && key === "s") {
        event.preventDefault();
        onSave();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (!hasModifier && !event.altKey && key === "n") {
        event.preventDefault();
        setPendingMenuAction("new-task");
        navigate("/");
        return;
      }

      if (!hasModifier && event.key === "?") {
        event.preventDefault();
        onOpenShortcutsHelp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, onSave, onOpenCommandPalette, onOpenShortcutsHelp]);
}
