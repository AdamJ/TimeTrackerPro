import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Separate from eslint.config.js so `pnpm check:a11y` reports only a11y rules.
// react-hooks/react-refresh are registered (no rules enabled) so existing
// eslint-disable comments for their rules still resolve.
export default tseslint.config(
  { ignores: ["src/components/ui"] },
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ["src/**/*.tsx"],
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      parser: tseslint.parser,
    },
    plugins: {
      ...jsxA11y.flatConfigs.recommended.plugins,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Dialogs/sheets autofocus their first field on open (shadcn components).
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
    },
  }
);
