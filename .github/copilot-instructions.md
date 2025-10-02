# Copilot Usage Guidelines

This repository uses **GitHub Copilot** to assist with code generation, refactoring, and documentation. The following guidelines help you use Copilot effectively while maintaining code quality, security, and project consistency.

## 1. General Principles

| Guideline | What it means | Why it matters |
|-----------|---------------|----------------|
| **Use Copilot as a helper, not a replacement** | Treat Copilot suggestions as *ideas* that you review and adapt. | Prevents accidental bugs or insecure patterns.
| **Verify all generated code** | Run tests, linting, and type checks after accepting a suggestion. | Ensures the code compiles and passes existing tests.
| **Keep security in mind** | Avoid generating code that handles credentials, file paths, or external input without validation. | Protects against injection and other vulnerabilities.
| **Respect project style** | Copilot may produce code that diverges from the project's style guide. | Maintains readability and consistency.

## 2. Working with Copilot in VS Code

1. **Enable Copilot** – Install the official GitHub Copilot extension.
2. **Use inline suggestions** – Press `Ctrl+Enter` (Windows/Linux) or `⌘+Enter` (macOS) to accept a suggestion.
3. **Cycle suggestions** – Press `Ctrl+Space` (Windows/Linux) or `⌘+Space` (macOS) to view alternative completions.
4. **Review the diff** – After accepting, review the changes in the *Source Control* panel.
5. **Run tests** – Execute `npm test` or `npm run test:watch` to confirm the change.

## 3. Code Review Checklist

When reviewing Copilot‑generated code, check:

- **Type safety** – All new types are correctly inferred or explicitly declared.
- **Linting** – `npm run lint` passes without errors.
- **Security** – No hard‑coded secrets or unsafe API usage.
- **Performance** – No obvious O(n²) loops or unnecessary re‑renders.
- **Documentation** – Add JSDoc comments if the function is non‑trivial.

## 4. Common Patterns in This Project

| Feature | Typical Copilot usage | Example
|---------|-----------------------|--------
| Context API | Generate provider skeletons | `createContext<...>()` + `useContext` hook
| React Router | Generate route components | `const Page = () => <div>...</div>`
| Tailwind CSS | Generate class strings | `cn('bg-blue-500', 'text-white')`
| Utility functions | Generate formatting helpers | `formatDuration(ms)`

## 5. Security & Privacy

- **Never** let Copilot generate code that includes your personal access tokens or API keys.
- **Avoid** using Copilot to write code that directly accesses `localStorage` with unvalidated keys.
- **Review** any code that manipulates dates or times for timezone correctness.

## 6. Troubleshooting

- **Suggestion not relevant** – Try re‑typing the prompt or adding a comment to guide Copilot.
- **Copilot stalls** – Restart VS Code or clear the extension cache.
- **Unexpected code** – Disable Copilot for the file or folder if it interferes with the build.

## 7. Contribution Workflow

1. **Create a branch** for your feature or bug fix.
2. **Use Copilot** to draft code, but always review.
3. **Run `npm run lint && npm test`** before committing.
4. **Open a PR** and request a review.
5. **Address feedback** and re‑run tests.

---

For more information, see the official [GitHub Copilot documentation](https://docs.github.com/en/copilot).
