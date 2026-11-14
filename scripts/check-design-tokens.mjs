#!/usr/bin/env node
// Flags default Tailwind palette classes (e.g. `bg-blue-500`) and arbitrary
// hex color classes (e.g. `text-[#ff0000]`) in src/. Use semantic tokens
// (`bg-primary`) or Radix scale steps (`bg-blue-9`) instead — see agents/styles.md.
//
// Suppress a line with a `design-allow` comment on it.
// src/components/ui is vendored shadcn code and is not checked.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const SKIP_DIRS = new Set([join(ROOT, "components", "ui")]);
const EXTENSIONS = [".ts", ".tsx", ".css"];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITIES =
  "bg|text|border(?:-[xytrbl])?|ring(?:-offset)?|fill|stroke|from|via|to|outline|divide|placeholder|accent|caret|shadow|decoration";
const PALETTE_RE = new RegExp(`(?<![\\w-])(?:${UTILITIES})-(?:${PALETTE})-(?:50|[1-9]00|950)(?![\\w-])`, "g");
const HEX_CLASS_RE = new RegExp(`(?<![\\w-])(?:${UTILITIES})-\\[#[0-9a-fA-F]{3,8}\\]`, "g");

function walk(dir) {
  if (SKIP_DIRS.has(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return EXTENSIONS.some((ext) => path.endsWith(ext)) ? [path] : [];
  });
}

const violations = [];
for (const file of walk(ROOT)) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (line.includes("design-allow")) return;
    for (const re of [PALETTE_RE, HEX_CLASS_RE]) {
      for (const match of line.matchAll(re)) {
        violations.push(`${relative(".", file)}:${i + 1}  ${match[0]}`);
      }
    }
  });
}

if (violations.length) {
  console.error(`Found ${violations.length} non-token color class(es):\n`);
  console.error(violations.join("\n"));
  console.error("\nUse semantic tokens (bg-primary) or Radix steps (bg-blue-9). See agents/styles.md.");
  process.exit(1);
}
console.log("check:design-tokens: no non-token color classes found.");
