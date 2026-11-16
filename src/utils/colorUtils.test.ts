import { describe, it, expect } from "vitest";
import { getReadableTextColor } from "@/utils/colorUtils";

describe("getReadableTextColor", () => {
  it("uses white text on dark backgrounds", () => {
    expect(getReadableTextColor("#000000")).toBe("#fff");
    expect(getReadableTextColor("#6D28D9")).toBe("#fff");
    expect(getReadableTextColor("#1e40af")).toBe("#fff");
  });

  it("uses black text on light backgrounds", () => {
    expect(getReadableTextColor("#ffffff")).toBe("#000");
    expect(getReadableTextColor("#facc15")).toBe("#000");
    expect(getReadableTextColor("#a7f3d0")).toBe("#000");
    // Mid-tone violet (the default category color): black scores 4.96:1 vs white 4.23:1
    expect(getReadableTextColor("#8B5CF6")).toBe("#000");
  });

  it("accepts 3-digit hex, missing #, and mixed case", () => {
    expect(getReadableTextColor("#FF0")).toBe("#000");
    expect(getReadableTextColor("fff")).toBe("#000");
  });

  it("falls back to white for colors it can't parse", () => {
    expect(getReadableTextColor("hsl(10, 50%, 50%)")).toBe("#fff");
    expect(getReadableTextColor("")).toBe("#fff");
  });
});
