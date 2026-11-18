import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { twMerge } from "tailwind-merge";

const css = readFileSync(resolve(__dirname, "../../public/pwa.css"), "utf8");

/** The text of every top-level `@media <query> { ... }` block, keyed by its query. */
function mediaBlocks(source: string): { query: string; body: string }[] {
  const blocks: { query: string; body: string }[] = [];
  const opener = /@media\s*([^{]+)\{/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source))) {
    let depth = 1;
    let i = opener.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    blocks.push({ query: match[1].trim(), body: source.slice(opener.lastIndex, i - 1) });
  }
  return blocks;
}

describe("public/pwa.css touch targets", () => {
  const targetBlocks = mediaBlocks(css).filter((b) => /min-height:\s*44px/.test(b.body));

  it("applies the 44px minimum by input device (pointer: coarse), not by viewport width", () => {
    expect(targetBlocks.length).toBeGreaterThan(0);
    for (const block of targetBlocks) {
      expect(block.query).toBe("(pointer: coarse)");
    }
  });

  it("covers both buttons and form fields", () => {
    const bodies = targetBlocks.map((b) => b.body).join("\n");
    expect(bodies).toMatch(/button:not/);
    expect(bodies).toMatch(/input:not/);
  });
});

describe("tailwind-merge", () => {
  it("understands the Tailwind 4 w-(--var) shorthand, so a later one replaces w-full", () => {
    expect(twMerge("w-full", "w-(--sidebar-width)")).toBe("w-(--sidebar-width)");
    expect(twMerge("sm:w-3/4", "sm:w-(--sidebar-width)")).toBe("sm:w-(--sidebar-width)");
  });
});
