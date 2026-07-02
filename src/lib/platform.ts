// Detects macOS so shortcut hints can render the platform-appropriate modifier
// glyph (⌘ vs Ctrl) in the command palette and shortcuts help dialog.
export const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

export const modKey = isMac ? "⌘" : "Ctrl";
