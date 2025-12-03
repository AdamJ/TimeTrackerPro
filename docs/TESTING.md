# Testing Documentation

## Overview

TimeTracker Pro has a comprehensive test suite with 41 tests covering core functionality including time entry, task management, archiving, and data persistence.

## Test Coverage Summary

**Total Tests:** 41
**Test Files:** 4
**Status:** ✅ All tests passing

### Test Breakdown by File

| Test File | Tests | Description |
|-----------|-------|-------------|
| `dateParsing.test.ts` | 10 | Date parsing consistency and timezone handling |
| `timeUtil.test.ts` | 9 | Time formatting and duration calculations |
| `dataService.test.ts` | 10 | localStorage persistence and data operations |
| `TimeTracking.test.tsx` | 12 | Core time tracking and archiving functionality |

## Running Tests

### Development Mode (Watch Mode)
```bash
npm run test
```

Tests will re-run automatically when files change.

### CI Mode (Run Once)
```bash
npm run test -- --run
```

This is the mode used in GitHub Actions.

### Run Specific Test File
```bash
npm run test -- src/components/dateParsing.test.ts
```

### Run Tests with Coverage (Future)
```bash
npm run test -- --coverage
```

## Test Structure

### Date Parsing Tests (`src/components/dateParsing.test.ts`)

Tests the critical date parsing fix that ensures consistent timezone handling across the app.

**Key Tests:**
- ✅ Correct date parsing using split method (local timezone)
- ✅ Demonstrates UTC timezone bug with `new Date(string)`
- ✅ Timezone-safe parsing for all date inputs
- ✅ Date formatting for input fields
- ✅ Edge cases: leap years, end of year, beginning of year

**Why This Matters:**
The original bug caused archived day date editing to show the previous day in certain timezones. These tests verify the fix works correctly.

### Time Utility Tests (`src/utils/timeUtil.test.ts`)

Tests time formatting and duration calculations used throughout the app.

**Key Tests:**
- ✅ Duration formatting in H:MM format
- ✅ Decimal hours conversion
- ✅ Negative duration handling
- ✅ Date and time formatting
- ✅ Partial minutes rounding

### Data Service Tests (`src/services/dataService.test.ts`)

Tests the data persistence layer that handles localStorage operations.

**Key Tests:**
- ✅ Save current day state
- ✅ Load current day state
- ✅ Save archived days
- ✅ Load archived days
- ✅ Handle corrupted data gracefully
- ✅ Return null for missing data
- ✅ Factory pattern creates correct service

### TimeTracking Context Tests (`src/contexts/TimeTracking.test.tsx`)

Tests the main application state management and business logic.

**Key Tests:**

**Day Management:**
- ✅ Start a new work day
- ✅ End a day and archive it
- ✅ Calculate total day duration

**Task Management:**
- ✅ Create a new task
- ✅ End current task by starting a new one
- ✅ Update task properties
- ✅ Delete a task

**Archive Management:**
- ✅ Archive a completed day
- ✅ Update archived day
- ✅ Delete archived day
- ✅ Restore archived day

**Duration Calculations:**
- ✅ Calculate task duration correctly

## Test Configuration

### Vitest Configuration
Location: `vite.config.ts`

```typescript
test: {
  globals: true,
  environment: "jsdom",
  setupFiles: ["./src/test-setup.ts"],
  include: ["src/**/*.test.{ts,tsx}"],
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.spec.ts" // Playwright E2E tests
  ]
}
```

### Test Setup File
Location: `src/test-setup.ts`

Provides:
- Cleanup after each test
- localStorage mock
- Date mocking for consistent testing
- Jest DOM matchers

## Writing Tests

### Example: Testing a Component

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Example: Testing Context

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

it("should start day", async () => {
  const { result } = renderHook(() => useTimeTracking(), { wrapper });

  await act(async () => {
    result.current.startDay(new Date());
  });

  await waitFor(() => {
    expect(result.current.isDayStarted).toBe(true);
  });
});
```

## Best Practices

### 1. Test Behavior, Not Implementation
Focus on what the component does, not how it does it.

### 2. Use Descriptive Test Names
```typescript
// Good
it("should archive day when postDay is called")

// Bad
it("test 1")
```

### 3. Arrange, Act, Assert Pattern
```typescript
it("should do something", () => {
  // Arrange - Set up test data
  const data = { ... };

  // Act - Perform the action
  const result = doSomething(data);

  // Assert - Check the result
  expect(result).toBe(expected);
});
```

### 4. Clean Up After Tests
The test setup automatically cleans up after each test, but be mindful of:
- Clearing mocks
- Resetting state
- Cleaning up side effects

### 5. Mock External Dependencies
```typescript
// Mock auth context
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false, user: null })
}));
```

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main/master
- See [CI_CD.md](./CI_CD.md) for details

**GitHub Actions Workflow:** `.github/workflows/test.yml`

## Debugging Tests

### Run Tests in Headed Mode
```bash
npm run test -- --ui
```

Opens Vitest UI for interactive debugging.

### Debug Single Test
Add `.only` to focus on one test:
```typescript
it.only("should test specific thing", () => {
  // This test will run alone
});
```

### View Console Output
```bash
npm run test -- --reporter=verbose
```

### Check Coverage (When Enabled)
```bash
npm run test -- --coverage
open coverage/index.html
```

## Common Issues

### Tests Timeout
Increase timeout for async operations:
```typescript
it("should do async thing", async () => {
  await waitFor(() => {
    expect(something).toBe(true);
  }, { timeout: 5000 }); // 5 second timeout
});
```

### Mock Not Working
Ensure mocks are defined before imports:
```typescript
vi.mock("module-to-mock");
import { ThingToTest } from "./thing";
```

### State Leaking Between Tests
Check that `beforeEach` properly resets state:
```typescript
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
```

## Future Improvements

- [ ] Add test coverage reporting
- [ ] Add visual regression tests
- [ ] Add E2E tests with Playwright
- [ ] Add performance benchmarks
- [ ] Add accessibility tests
- [ ] Increase coverage to 80%+
- [ ] Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [CI/CD Documentation](./CI_CD.md)
