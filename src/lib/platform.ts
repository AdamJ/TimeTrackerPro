const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
const maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0;

// iPadOS has spoofed a "Macintosh" user agent since iPadOS 13, so telling an
// iPad apart from a real Mac requires the touch-point check too (real Macs
// report 0 touch points).
export const isIOS = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

// Detects macOS so shortcut hints can render the platform-appropriate modifier
// glyph (⌘ vs Ctrl) in the command palette and shortcuts help dialog.
export const isMac = /Mac/.test(userAgent) && !isIOS;

export const modKey = isMac ? "⌘" : "Ctrl";
