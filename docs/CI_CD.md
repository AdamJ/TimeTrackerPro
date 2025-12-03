# CI/CD Documentation

## Overview

TimeTracker Pro uses GitHub Actions for continuous integration and continuous deployment. The CI/CD pipeline automatically runs tests, linting, and builds on every pull request and push to the main branch.

## Workflows

### Test Workflow (`.github/workflows/test.yml`)

**Triggers:**
- Pull requests to `main` or `master` branches
- Pushes to `main` or `master` branches

**Jobs:**
1. **Checkout code** - Retrieves the repository code
2. **Setup Node.js** - Configures Node.js 20.x environment
3. **Install dependencies** - Runs `npm ci` for clean install
4. **Run linter** - Executes ESLint to check code quality
5. **Run tests** - Runs the Vitest test suite (41 tests) with mock Supabase environment
6. **Build project** - Verifies the production build succeeds with mock Supabase environment
7. **Upload test results** - Archives test results and coverage (if generated)

**Environment Variables:**
The workflow sets mock Supabase credentials for testing:
- `VITE_SUPABASE_URL`: Test URL (not a real Supabase instance)
- `VITE_SUPABASE_ANON_KEY`: Test key (not a real key)

These are only used for CI/CD and are completely mocked in tests.

**Status Badge:**
The test workflow status is displayed at the top of the README.md file.

### Release Workflow (`.github/workflows/release.yml`)

Handles automated versioning and releases when pull requests are merged to main.

## Test Suite

The test suite includes 41 comprehensive tests covering:

### Test Files

1. **Date Parsing Tests** (`src/components/dateParsing.test.ts`) - 10 tests
   - Verifies timezone-safe date parsing
   - Tests date formatting consistency
   - Validates edge cases (leap years, year boundaries)

2. **Time Utility Tests** (`src/utils/timeUtil.test.ts`) - 9 tests
   - Duration formatting (H:MM format)
   - Decimal hours conversion
   - Date and time formatting

3. **Data Service Tests** (`src/services/dataService.test.ts`) - 10 tests
   - localStorage persistence operations
   - Current day save/load operations
   - Archived days management
   - Error handling for corrupted data

4. **TimeTracking Context Tests** (`src/contexts/TimeTracking.test.tsx`) - 12 tests
   - Day management (start, end, archive)
   - Task management (create, update, delete)
   - Archive operations (update, delete, restore)
   - Duration calculations

## Running Tests Locally

### Quick Test Run
```bash
npm run test
```

### Run Tests Once (CI Mode)
```bash
npm run test -- --run
```

### Run Linter
```bash
npm run lint
```

### Run Build
```bash
npm run build
```

### Run All CI Checks Locally
```bash
npm run lint && npm run test -- --run && npm run build
```

## Test Configuration

- **Framework**: Vitest
- **Environment**: jsdom (simulates browser environment)
- **Setup File**: `src/test-setup.ts`
- **Coverage**: Not yet configured (can be added)

## CI/CD Best Practices

### For Contributors

1. **Run tests locally** before pushing:
   ```bash
   npm run lint
   npm run test -- --run
   npm run build
   ```

2. **Check CI status** on your pull request - all checks must pass before merging

3. **Fix failing tests** - Don't merge PRs with failing tests

4. **Keep tests updated** - Update tests when modifying functionality

### For Maintainers

1. **Review test results** in the Actions tab
2. **Don't merge PRs** with failing CI checks
3. **Monitor test coverage** and add tests for new features
4. **Keep dependencies updated** to avoid security vulnerabilities

## Troubleshooting

### Tests Fail Locally but Pass in CI (or vice versa)

1. **Node version mismatch** - CI uses Node 20.x, ensure you're using the same
2. **Dependency differences** - Run `npm ci` instead of `npm install`
3. **Environment variables** - Check if tests depend on env vars
4. **Timezone issues** - Tests use mocked dates to avoid timezone problems

### Lint Errors

```bash
npm run lint -- --fix
```

This will auto-fix many common linting issues.

### Build Failures

1. Check TypeScript errors: `npm run build`
2. Verify all imports are correct
3. Ensure all dependencies are installed

## Future Enhancements

Potential improvements to the CI/CD pipeline:

- [ ] Add test coverage reporting with codecov.io
- [ ] Add performance benchmarking
- [ ] Add visual regression testing with Playwright
- [ ] Add E2E tests for critical user flows
- [ ] Add automatic dependency updates with Dependabot
- [ ] Add security scanning with Snyk or similar
- [ ] Add bundle size tracking
- [ ] Add preview deployments for PRs

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Vite Build Documentation](https://vitejs.dev/guide/build.html)
