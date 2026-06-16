# Pull Requests — Timetraked

## Title Format

```text
[Timetraked] <Descriptive Title>
```

Prefix the title with one of the release-triggering types to control version bumps:

| Prefix | Type | Bump |
| --- | --- | --- |
| `major:` | Breaking change | Major version |
| `feat:` / `feature:` / `fix:` | Feature/bugfix | Minor version |
| `patch:` | Patch fix | Patch version |
| `bump:` / `maint:` / `refactor:` / `a11y:` | Maintenance | Patch version |
| `docs:` / `chore:` / others | Documentation/chore | No version bump |

## Requirements

- Always include a clear title and description explaining the purpose of the PR
- Keep your branch rebased (not merged) against the base branch
- Run `pnpm lint && pnpm build && pnpm test` before pushing — all must pass
- Wait until all CI checks have completed before merging
- Add appropriate labels to every PR
- Document any changes to the data schema or API
- Add tests for new features or bug fixes

## Pre-Merge Checklist

- [ ] All lint errors fixed (`pnpm lint`)
- [ ] No TypeScript errors (`pnpm build`)
- [ ] All tests passing (`pnpm test`)
- [ ] Tested in both guest and authenticated modes
- [ ] No breaking changes without documentation
- [ ] CI checks passing (GitHub Actions)
