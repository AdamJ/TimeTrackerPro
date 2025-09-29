# AGENTS.md

## Dev environment tips

- Specific `Agents.md` files are located in the `/backend` and `/frontend` directories.
- Run `npm install` in the root of the project to install all dependencies.
- Use `npm run build` to build the project.
- Use `npm run dev` to run the development environment.
- Data resides on in the browser's localStorage, so there is nothing to refer to outside of the browser.
- Reference agent information in `/agents/`.

## Coding Styles

- Use tabs instead of spaces.
- Tabs should be set to 2 (two) spaces.
- Always use double quotes `""` instead of single quotes `''`.
- Use [styles.md](agents/styles.md) to govern the stylistic guidance of the project.

## Testing instructions

- From the package root you can just call `npm run lint`. The commit should pass all tests before you merge.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `npm run build` to be sure all rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## PR instructions

- Follow the PR guidance as written in [pull_requests.md](pull_requests.md). Always keep your branch rebased instead of merged.
- When creating a PR, use Title format: [<project_name>] <Title>
- Always run `npm lint` and `npm run build` before committing.
