# Styles — Timetraked

The following rules govern style choices for UI and visual design.

## Library

- This project uses [Radix](https://www.radix-ui.com) for it's frontend library.

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

## Components

- Follow the component references and structures as defined in the [Radix documentation](https://www.radix-ui.com/primitives/docs/overview/introduction).

## Styling

- Follow the guidelines from the [Radix Styling Guide](https://www.radix-ui.com/primitives/docs/guides/styling).

## Typography

- Follow the typography rules as laid out on [https://www.radix-ui.com/themes/docs/theme/typography](https://www.radix-ui.com/themes/docs/theme/typography).

## Spacing

- Radix has specific guidance on Spacing. Follow the guideline found here: [Spacing](https://www.radix-ui.com/themes/docs/theme/spacing).
- If there are conflicts in spacing, default to the Radix defaults.

## Icons

- By default, use [Radix icons](https://www.radix-ui.com/icons).
- If an icon does not exist, use [Lucid](https://lucide.dev) as a fallback.

## Avoid

- Avoid using custom colors as there is no guarantee that they will fit the Radix theme nor provide proper contrast.
- Avoid custom spacing and font sizes in order to keep readability to a premium.
- Avoid breaking Radix rules governing typography.
