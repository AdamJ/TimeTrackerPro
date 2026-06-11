# Radix Colors Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full Radix UI color palette as Tailwind utility classes (`bg-mauve-1` through `bg-mauve-12`, etc.) with automatic dark mode support via CSS variables.

**Architecture:** Install `@radix-ui/colors`, import each scale's light and dark CSS files into `index.css` (Radix defines CSS custom properties; dark variants override in `.dark`), then map all scales to Tailwind via a `radixScale()` generator in `tailwind.config.ts`. Existing semantic tokens (`primary`, `muted`, etc.) are untouched — this is purely additive.

**Tech Stack:** `@radix-ui/colors`, Tailwind CSS 3, CSS custom properties

---

## File Map

| File | Change |
|---|---|
| `package.json` / `pnpm-lock.yaml` | Add `@radix-ui/colors` dependency |
| `src/index.css` | Import all ~30 light + dark CSS scale files |
| `tailwind.config.ts` | Add `radixScale()` helper + 30 scale mappings under `theme.extend.colors` |
| `CLAUDE.md` | Update Colors constraint (line 62) |
| `agents/styles.md` | Update Colors section with step semantics |
| `agents/conventions.md` | Update Colors rule (line 60-61) |

---

### Task 1: Install `@radix-ui/colors`

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install the package**

```bash
pnpm add @radix-ui/colors
```

Expected output: `+ @radix-ui/colors x.x.x` added to dependencies.

- [ ] **Step 2: Verify the package is available**

```bash
ls node_modules/@radix-ui/colors/*.css | head -10
```

Expected: CSS files like `mauve.css`, `mauve-dark.css`, `blue.css`, `blue-dark.css`, etc.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @radix-ui/colors"
```

---

### Task 2: Import all Radix color CSS files in `index.css`

**Files:**
- Modify: `src/index.css` (top of file, before existing `@tailwind` directives)

- [ ] **Step 1: Add all CSS imports to the top of `src/index.css`**

Open `src/index.css` and add the following imports as the very first lines (before `@tailwind base`):

```css
/* Radix Colors — light scales */
@import "@radix-ui/colors/gray.css";
@import "@radix-ui/colors/mauve.css";
@import "@radix-ui/colors/slate.css";
@import "@radix-ui/colors/sage.css";
@import "@radix-ui/colors/olive.css";
@import "@radix-ui/colors/sand.css";
@import "@radix-ui/colors/tomato.css";
@import "@radix-ui/colors/red.css";
@import "@radix-ui/colors/ruby.css";
@import "@radix-ui/colors/crimson.css";
@import "@radix-ui/colors/pink.css";
@import "@radix-ui/colors/plum.css";
@import "@radix-ui/colors/purple.css";
@import "@radix-ui/colors/violet.css";
@import "@radix-ui/colors/iris.css";
@import "@radix-ui/colors/indigo.css";
@import "@radix-ui/colors/blue.css";
@import "@radix-ui/colors/cyan.css";
@import "@radix-ui/colors/teal.css";
@import "@radix-ui/colors/jade.css";
@import "@radix-ui/colors/green.css";
@import "@radix-ui/colors/grass.css";
@import "@radix-ui/colors/brown.css";
@import "@radix-ui/colors/orange.css";
@import "@radix-ui/colors/amber.css";
@import "@radix-ui/colors/yellow.css";
@import "@radix-ui/colors/lime.css";
@import "@radix-ui/colors/mint.css";
@import "@radix-ui/colors/sky.css";
@import "@radix-ui/colors/gold.css";
@import "@radix-ui/colors/bronze.css";

/* Radix Colors — dark scales */
@import "@radix-ui/colors/gray-dark.css";
@import "@radix-ui/colors/mauve-dark.css";
@import "@radix-ui/colors/slate-dark.css";
@import "@radix-ui/colors/sage-dark.css";
@import "@radix-ui/colors/olive-dark.css";
@import "@radix-ui/colors/sand-dark.css";
@import "@radix-ui/colors/tomato-dark.css";
@import "@radix-ui/colors/red-dark.css";
@import "@radix-ui/colors/ruby-dark.css";
@import "@radix-ui/colors/crimson-dark.css";
@import "@radix-ui/colors/pink-dark.css";
@import "@radix-ui/colors/plum-dark.css";
@import "@radix-ui/colors/purple-dark.css";
@import "@radix-ui/colors/violet-dark.css";
@import "@radix-ui/colors/iris-dark.css";
@import "@radix-ui/colors/indigo-dark.css";
@import "@radix-ui/colors/blue-dark.css";
@import "@radix-ui/colors/cyan-dark.css";
@import "@radix-ui/colors/teal-dark.css";
@import "@radix-ui/colors/jade-dark.css";
@import "@radix-ui/colors/green-dark.css";
@import "@radix-ui/colors/grass-dark.css";
@import "@radix-ui/colors/brown-dark.css";
@import "@radix-ui/colors/orange-dark.css";
@import "@radix-ui/colors/amber-dark.css";
@import "@radix-ui/colors/yellow-dark.css";
@import "@radix-ui/colors/lime-dark.css";
@import "@radix-ui/colors/mint-dark.css";
@import "@radix-ui/colors/sky-dark.css";
@import "@radix-ui/colors/gold-dark.css";
@import "@radix-ui/colors/bronze-dark.css";
```

- [ ] **Step 2: Verify CSS variables are available**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: build succeeds with no errors. If import errors appear, check that the file names match what's in `node_modules/@radix-ui/colors/` (run `ls node_modules/@radix-ui/colors/` to verify).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: import Radix color CSS variables"
```

---

### Task 3: Map Radix scales to Tailwind

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add `radixScale` helper and all 31 scale mappings to `tailwind.config.ts`**

Open `tailwind.config.ts`. Add the helper function before the `export default` statement, and add all scale entries into `theme.extend.colors`:

Add this before `export default`:

```ts
const radixScale = (name: string): Record<number, string> =>
  Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [i + 1, `var(--${name}-${i + 1})`])
  );
```

Then inside `theme.extend.colors`, after the existing `sidebar` entry, add:

```ts
        /* Radix color scales — steps 1-12 */
        gray: radixScale("gray"),
        mauve: radixScale("mauve"),
        slate: radixScale("slate"),
        sage: radixScale("sage"),
        olive: radixScale("olive"),
        sand: radixScale("sand"),
        tomato: radixScale("tomato"),
        red: radixScale("red"),
        ruby: radixScale("ruby"),
        crimson: radixScale("crimson"),
        pink: radixScale("pink"),
        plum: radixScale("plum"),
        purple: radixScale("purple"),
        violet: radixScale("violet"),
        iris: radixScale("iris"),
        indigo: radixScale("indigo"),
        blue: radixScale("blue"),
        cyan: radixScale("cyan"),
        teal: radixScale("teal"),
        jade: radixScale("jade"),
        green: radixScale("green"),
        grass: radixScale("grass"),
        brown: radixScale("brown"),
        orange: radixScale("orange"),
        amber: radixScale("amber"),
        yellow: radixScale("yellow"),
        lime: radixScale("lime"),
        mint: radixScale("mint"),
        sky: radixScale("sky"),
        gold: radixScale("gold"),
        bronze: radixScale("bronze"),
```

- [ ] **Step 2: Verify build succeeds**

```bash
pnpm run build 2>&1 | tail -5
```

Expected: build succeeds. No TypeScript or Tailwind errors.

- [ ] **Step 3: Spot-check that classes are generated**

```bash
pnpm run build && grep -r "mauve" dist/assets/*.css | head -5
```

Expected: CSS output contains colour values for the mauve scale.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: map Radix color scales to Tailwind utilities"
```

---

### Task 4: Update CLAUDE.md color constraint

**Files:**
- Modify: `CLAUDE.md` (line 62)

- [ ] **Step 1: Update the Colors rule**

Find this line in `CLAUDE.md`:

```
- **Colors**: Always use Radix/theme variables — never custom Tailwind colors like `bg-blue-500`
```

Replace with:

```
- **Colors**: Prefer semantic tokens (`bg-primary`, `bg-muted`, etc.) for theming. Radix scale classes (`bg-mauve-3`, `text-blue-11`, `border-violet-6`) are allowed for explicit color needs — use steps 1-2 for backgrounds, 3-5 for component fills, 6-8 for borders, 9-10 for solid fills, 11-12 for text. Never use arbitrary Tailwind palette colors like `bg-blue-500`.
```

Also update the `❌ WRONG` comment in the code example block from:

```
// ❌ WRONG — spaces, single quotes, custom color
```

to:

```
// ❌ WRONG — spaces, single quotes, arbitrary Tailwind color (use bg-blue-9 instead)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update color constraints to allow Radix scale classes"
```

---

### Task 5: Update `agents/styles.md`

**Files:**
- Modify: `agents/styles.md`

- [ ] **Step 1: Replace the Colors section**

Find this section in `agents/styles.md`:

```markdown
## Colors

- Follow the color usage guidelines under [Radix Colors](https://www.radix-ui.com/colors/docs/overview/usage).
```

Replace with:

```markdown
## Colors

- Follow the color usage guidelines under [Radix Colors](https://www.radix-ui.com/colors/docs/overview/usage).
- All 31 Radix color scales are available as Tailwind utilities (`bg-mauve-1` through `bg-mauve-12`, etc.).
- Prefer semantic tokens (`bg-primary`, `bg-muted`, `text-foreground`) for theming and dark mode.
- Use Radix scale classes for explicit color needs. Step semantics:

| Steps | Use for |
|---|---|
| 1–2 | App and page backgrounds |
| 3–5 | Component backgrounds and subtle fills |
| 6–8 | Borders and separators |
| 9–10 | Solid fills, buttons, badges |
| 11–12 | Text and high-contrast content |

- Dark mode is automatic — Radix dark CSS vars activate when the `.dark` class is present on the root element.
- Never use arbitrary Tailwind palette colors like `bg-blue-500` — use `bg-blue-9` instead.
```

- [ ] **Step 2: Commit**

```bash
git add agents/styles.md
git commit -m "docs: document Radix color scale steps and Tailwind usage"
```

---

### Task 6: Update `agents/conventions.md`

**Files:**
- Modify: `agents/conventions.md` (lines 60-61)

- [ ] **Step 1: Update the Colors rule**

Find this block in `agents/conventions.md`:

```markdown
- **Use Radix Colors**: [https://www.radix-ui.com/colors](https://www.radix-ui.com/colors)
- **Avoid custom colors** — Use theme variables instead
```

Replace with:

```markdown
- **Use Radix Colors**: [https://www.radix-ui.com/colors](https://www.radix-ui.com/colors)
- **Prefer semantic tokens** (`bg-primary`, `bg-muted`, etc.) for theming
- **Radix scale classes allowed** for explicit color: `bg-mauve-3`, `text-blue-11`, `border-violet-6` (steps 1-12)
- **Never** use arbitrary Tailwind palette numbers like `bg-blue-500`
```

- [ ] **Step 2: Commit**

```bash
git add agents/conventions.md
git commit -m "docs: update conventions to reflect Radix scale class availability"
```
