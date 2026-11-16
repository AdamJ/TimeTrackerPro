const LIGHT_TEXT = "#fff";
const DARK_TEXT = "#000";

function parseHex(color: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((c) => c + c).join("")
    : match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

// Category colors are user-chosen, so badge text can't be a fixed color.
// Picks whichever of black/white has the higher WCAG contrast ratio.
// Unparseable colors fall back to white text, the previous fixed choice.
export function getReadableTextColor(background: string): string {
  const rgb = parseHex(background);
  if (!rgb) return LIGHT_TEXT;
  const luminance = relativeLuminance(rgb);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithBlack > contrastWithWhite ? DARK_TEXT : LIGHT_TEXT;
}
