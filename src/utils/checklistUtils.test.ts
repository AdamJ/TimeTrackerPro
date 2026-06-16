import { describe, it, expect } from "vitest";
import { parseTaskChecklist, toggleDescriptionChecklistItem } from "@/utils/checklistUtils";

describe("checklistUtils", () => {
  describe("parseTaskChecklist", () => {
    it("returns empty array for empty string", () => {
      expect(parseTaskChecklist("")).toEqual([]);
    });

    it("returns empty array for text with no checklist items", () => {
      expect(parseTaskChecklist("Just a plain description\nWith multiple lines")).toEqual([]);
    });

    it("parses a single unchecked item", () => {
      const result = parseTaskChecklist("- [ ] Write tests");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Write tests");
      expect(result[0].completed).toBe(false);
      expect(result[0].lineIndex).toBe(0);
    });

    it("parses a single checked item", () => {
      const result = parseTaskChecklist("- [x] Update docs");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Update docs");
      expect(result[0].completed).toBe(true);
    });

    it("parses mixed checked and unchecked items", () => {
      const description = "- [ ] Write unit tests\n- [x] Update README\n- [ ] Fix lint errors";
      const result = parseTaskChecklist(description);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ text: "Write unit tests", completed: false, lineIndex: 0 });
      expect(result[1]).toMatchObject({ text: "Update README", completed: true, lineIndex: 1 });
      expect(result[2]).toMatchObject({ text: "Fix lint errors", completed: false, lineIndex: 2 });
    });

    it("ignores non-checklist lines interspersed with checklist items", () => {
      const description = "Some intro text\n- [ ] First item\nSome other text\n- [x] Second item";
      const result = parseTaskChecklist(description);
      expect(result).toHaveLength(2);
      expect(result[0].lineIndex).toBe(1);
      expect(result[1].lineIndex).toBe(3);
    });

    it("handles uppercase X in checked item", () => {
      const result = parseTaskChecklist("- [X] Capital X item");
      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });

    it("correctly assigns lineIndex for each item", () => {
      const description = "- [ ] item0\n- [x] item1\n- [ ] item2";
      const result = parseTaskChecklist(description);
      expect(result[0].lineIndex).toBe(0);
      expect(result[1].lineIndex).toBe(1);
      expect(result[2].lineIndex).toBe(2);
    });
  });

  describe("toggleDescriptionChecklistItem", () => {
    it("toggles unchecked to checked", () => {
      const desc = "- [ ] Write tests";
      const result = toggleDescriptionChecklistItem(desc, 0);
      expect(result).toBe("- [x] Write tests");
    });

    it("toggles checked to unchecked", () => {
      const desc = "- [x] Write tests";
      const result = toggleDescriptionChecklistItem(desc, 0);
      expect(result).toBe("- [ ] Write tests");
    });

    it("only toggles the item at the specified lineIndex", () => {
      const desc = "- [ ] First\n- [x] Second\n- [ ] Third";
      const result = toggleDescriptionChecklistItem(desc, 1);
      const lines = result.split("\n");
      expect(lines[0]).toBe("- [ ] First");
      expect(lines[1]).toBe("- [ ] Second");
      expect(lines[2]).toBe("- [ ] Third");
    });

    it("returns original description unchanged for out-of-bounds lineIndex", () => {
      const desc = "- [ ] Only item";
      expect(toggleDescriptionChecklistItem(desc, 99)).toBe(desc);
    });

    it("leaves non-checklist lines unchanged", () => {
      const desc = "Plain text";
      expect(toggleDescriptionChecklistItem(desc, 0)).toBe("Plain text");
    });
  });
});
