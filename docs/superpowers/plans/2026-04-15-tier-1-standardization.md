# Tier 1 Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native `confirm()` dialog calls with shadcn/ui `AlertDialog` components and standardize hardcoded color classes to theme variables across `App.tsx` and `Settings.tsx`.

**Architecture:** Each `confirm()` call is replaced by: (1) a state variable holding the pending action target, (2) a handler that sets that state instead of calling confirm, and (3) an `AlertDialog` rendered at the bottom of the component that fires the real action on confirm. The Settings color sweep maps hardcoded Tailwind color classes to Radix theme variables.

**Tech Stack:** React 18, TypeScript, shadcn/ui (`AlertDialog`, `Button`), Vitest, React Testing Library

---

## Files Modified

| File                                    | Change                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/App.tsx`                           | Fix `border-gray-900` → `border-primary` on spinner                                            |
| `src/pages/Settings.tsx`                | Replace two-step `confirm()` with `AlertDialog`; sweep ~15 hardcoded color classes             |
| `src/components/CategoryManagement.tsx` | Replace `confirm()` in `handleDelete` with `AlertDialog`                                       |
| `src/components/ProjectManagement.tsx`  | Replace `confirm()` in `handleDelete` and `handleResetToDefaults` with two `AlertDialog`s      |
| `src/components/ArchiveItem.tsx`        | Replace `confirm()` in `handleRestore` with `AlertDialog`                                      |
| `src/components/ArchiveEditDialog.tsx`  | Replace `confirm()` in `handleRestoreDay` with `AlertDialog`; replace `alert()` with `toast()` |
| `src/pages/ProjectList.tsx`             | Replace `confirm()` in `handleDelete` and `handleResetToDefaults` with two `AlertDialog`s      |
| `src/pages/Categories.tsx`              | Replace `confirm()` in `handleDelete` with `AlertDialog`                                       |

---

## Task 1: Fix PageLoader spinner color

**Files:**

- Modify: `src/App.tsx:26`

- [ ] **Step 1: Edit App.tsx**

Change line 26 from:

```tsx
<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
```

To:

```tsx
<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: use theme variable for PageLoader spinner color"
```

---

## Task 2: Settings.tsx — replace confirm() and fix colors

**Files:**

- Modify: `src/pages/Settings.tsx`
- Test: `src/contexts/TimeTracking.test.tsx` (add Settings smoke test)

- [ ] **Step 1: Write the failing test**

Open `src/contexts/TimeTracking.test.tsx` and add this test at the end of the file (before the closing of any describe block, or as a standalone describe):

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from '@/pages/Settings';

// Settings needs the TimeTrackingContext — wrap it.
// The existing test file already has a renderWithProviders or similar helper;
// if not, use the inline wrapper below.
describe('Settings — Clear All Data', () => {
  it('shows AlertDialog when Clear All Data is clicked', async () => {
    render(<Settings />);
    fireEvent.click(screen.getByText('Clear All Data'));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it('does not clear data when Cancel is clicked', async () => {
    const clearSpy = vi.spyOn(Storage.prototype, 'clear');
    render(<Settings />);
    fireEvent.click(screen.getByText('Clear All Data'));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByText('Cancel'));
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test -- --reporter=verbose src/contexts/TimeTracking.test.tsx
```

Expected: FAIL — `alertdialog` role not found because `confirm()` is still being used.

- [ ] **Step 3: Rewrite Settings.tsx**

Replace the entire file with:

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ExportDialog } from '@/components/ExportDialog';
import {
  Briefcase,
  Tag,
  Download,
  Database,
  Trash2,
  CogIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import SiteNavigationMenu from '@/components/Navigation';

const SettingsContent: React.FC = () => {
  const { archivedDays, projects, categories } = useTimeTracking();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  const handleClearAllData = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <SiteNavigationMenu />
      {/* Main Content */}
      <div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-4">
        <div className="flex items-center justify-between">
          <h1 className="md:text-2xl font-bold text-foreground flex items-center space-x-1">
            <CogIcon className="w-6 h-6 mr-1" />
            <span>Settings</span>
          </h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:hidden">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {archivedDays.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Archived Days
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {projects.length}
                </div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {categories.length}
                </div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </CardContent>
            </Card>
          </div>
          {/* Management Sections */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Project Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>Project Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage your projects, clients, and hourly rates. Projects help
                  organize your tasks and calculate revenue automatically.
                </p>
                <Link to="/projectlist">
                  <Button variant="outline" className="w-full">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Manage Projects
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {/* Category Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="w-5 h-5" />
                  <span>Category Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create and manage task categories like Development, Design,
                  Meetings, etc. Categories help classify your work.
                </p>
                <Link to="/categories">
                  <Button variant="outline" className="w-full">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Manage Categories
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Exports/Imports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Export your time tracking data as CSV or JSON files. Generate
                  invoice data for specific clients and date ranges. You can
                  also import data from CSV files.
                </p>
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Data Export/Import
                </Button>
              </CardContent>
            </Card>
            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage your stored data. All data is stored locally in your
                  browser. Use export before clearing data.
                </p>
                <div className="space-y-2">
                  <Link to="/archive">
                    <Button variant="outline" className="w-full">
                      <Database className="w-4 h-4 mr-2" />
                      View Archive
                    </Button>
                  </Link>
                  <Button
                    onClick={() => setShowClearDataDialog(true)}
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    Getting Started
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Set up projects with hourly rates for automatic revenue
                      calculation
                    </li>
                    <li>
                      • Create categories to classify different types of work
                    </li>
                    <li>• Use task descriptions for detailed work notes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    Best Practices
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Export your data regularly as backup</li>
                    <li>
                      • Adjust task times in 15-minute intervals for accuracy
                    </li>
                    <li>• Use consistent project and category naming</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
      <AlertDialog
        open={showClearDataDialog}
        onOpenChange={setShowClearDataDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all archived days, projects, and
              categories. This action cannot be undone. Export your data first
              if you want a backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Settings: React.FC = () => {
  return <SettingsContent />;
};

export default Settings;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- --reporter=verbose src/contexts/TimeTracking.test.tsx
```

Expected: PASS — both Settings AlertDialog tests green.

- [ ] **Step 5: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Settings.tsx src/contexts/TimeTracking.test.tsx
git commit -m "fix: replace confirm() with AlertDialog and standardize colors in Settings"
```

---

## Task 3: CategoryManagement.tsx — replace confirm()

**Files:**

- Modify: `src/components/CategoryManagement.tsx`

- [ ] **Step 1: Add AlertDialog import**

At the top of the file, after the existing imports, add:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: Add delete dialog state**

Inside `CategoryManagement` component, after the existing `useState` declarations, add:

```tsx
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
```

- [ ] **Step 3: Replace handleDelete**

Replace:

```tsx
const handleDelete = async (categoryId: string) => {
  if (
    confirm(
      'Are you sure you want to delete this category? This action cannot be undone.'
    )
  ) {
    deleteCategory(categoryId);
    // Save changes to database
    await forceSyncToDatabase();
  }
};
```

With:

```tsx
const handleDeleteConfirm = async () => {
  if (!deleteTargetId) return;
  deleteCategory(deleteTargetId);
  await forceSyncToDatabase();
  setDeleteTargetId(null);
};
```

- [ ] **Step 4: Update delete button call sites**

Find all `onClick` calls that call the old `handleDelete(category.id)` and change them to `onClick={() => setDeleteTargetId(category.id)}`. There will be one such button in the category list rendering.

- [ ] **Step 5: Add AlertDialog before the closing Dialog tag**

Just before the final `</Dialog>` closing tag at the bottom of the return statement, add:

```tsx
<AlertDialog
  open={deleteTargetId !== null}
  onOpenChange={open => !open && setDeleteTargetId(null)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this category?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeleteConfirm}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 6: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CategoryManagement.tsx
git commit -m "fix: replace confirm() with AlertDialog in CategoryManagement"
```

---

## Task 4: ProjectManagement.tsx — replace two confirm() calls

**Files:**

- Modify: `src/components/ProjectManagement.tsx`

- [ ] **Step 1: Add AlertDialog import**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: Add dialog state variables**

After existing `useState` declarations:

```tsx
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [showResetDialog, setShowResetDialog] = useState(false);
```

- [ ] **Step 3: Replace handleDelete**

Replace:

```tsx
const handleDelete = (projectId: string) => {
  if (confirm('Are you sure you want to delete this project?')) {
    deleteProject(projectId);
  }
};
```

With:

```tsx
const handleDeleteConfirm = () => {
  if (!deleteTargetId) return;
  deleteProject(deleteTargetId);
  setDeleteTargetId(null);
};
```

- [ ] **Step 4: Replace handleResetToDefaults**

Replace:

```tsx
const handleResetToDefaults = () => {
  if (
    confirm(
      "Are you sure you want to reset all projects to defaults? This will remove any custom projects you've added."
    )
  ) {
    resetProjectsToDefaults();
  }
};
```

With:

```tsx
const handleResetConfirm = () => {
  resetProjectsToDefaults();
  setShowResetDialog(false);
};
```

- [ ] **Step 5: Update button call sites**

- Change the delete button `onClick` from `handleDelete(project.id)` to `() => setDeleteTargetId(project.id)`
- Change the Reset to Defaults button `onClick` from `handleResetToDefaults` to `() => setShowResetDialog(true)`

- [ ] **Step 6: Add two AlertDialogs before the closing Dialog tag**

```tsx
<AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete this project?</AlertDialogTitle>
			<AlertDialogDescription>
				This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancel</AlertDialogCancel>
			<AlertDialogAction
				onClick={handleDeleteConfirm}
				className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Delete
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

<AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Reset projects to defaults?</AlertDialogTitle>
			<AlertDialogDescription>
				This will remove any custom projects you've added. This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancel</AlertDialogCancel>
			<AlertDialogAction
				onClick={handleResetConfirm}
				className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Reset
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 7: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/ProjectManagement.tsx
git commit -m "fix: replace confirm() with AlertDialog in ProjectManagement"
```

---

## Task 5: ArchiveItem.tsx and ArchiveEditDialog.tsx — replace confirm()

**Files:**

- Modify: `src/components/ArchiveItem.tsx`
- Modify: `src/components/ArchiveEditDialog.tsx`

### ArchiveItem.tsx

- [ ] **Step 1: Add AlertDialog import to ArchiveItem.tsx**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: Add restore dialog state**

After the `useMemo` and `useTimeTracking` calls, add:

```tsx
const [showRestoreDialog, setShowRestoreDialog] = useState(false);
```

Also add `useState` to the React import if not already present:

```tsx
import React, { useMemo, useState } from 'react';
```

- [ ] **Step 3: Replace handleRestore**

Replace:

```tsx
const handleRestore = () => {
  if (isDayStarted) {
    if (
      !confirm(
        'You currently have an active day. Restoring to this day will replace your current work. Continue restoring?'
      )
    ) {
      return;
    }
  }
  restoreArchivedDay(day.id);
};
```

With:

```tsx
const handleRestore = () => {
  if (isDayStarted) {
    setShowRestoreDialog(true);
  } else {
    restoreArchivedDay(day.id);
  }
};

const handleRestoreConfirm = () => {
  restoreArchivedDay(day.id);
  setShowRestoreDialog(false);
};
```

- [ ] **Step 4: Add AlertDialog at the bottom of the return statement**

Just before the final closing `</Card>` tag:

```tsx
<AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Replace active day?</AlertDialogTitle>
      <AlertDialogDescription>
        You currently have an active day. Restoring to this archived day will
        replace your current work.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleRestoreConfirm}>
        Restore anyway
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### ArchiveEditDialog.tsx

- [ ] **Step 5: Add AlertDialog import and useToast import to ArchiveEditDialog.tsx**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
```

- [ ] **Step 6: Add restore dialog state and useToast**

At the top of the component, alongside other state:

```tsx
const [showRestoreDialog, setShowRestoreDialog] = useState(false);
const { toast } = useToast();
```

- [ ] **Step 7: Replace alert() with toast()**

Find:

```tsx
alert('Failed to save changes. Please try again.');
```

Replace with:

```tsx
toast({
  title: 'Save failed',
  description: 'Failed to save changes. Please try again.',
  variant: 'destructive'
});
```

- [ ] **Step 8: Replace handleRestoreDay confirm()**

Replace:

```tsx
const handleRestoreDay = () => {
  if (isDayStarted) {
    if (
      !confirm(
        'You currently have an active day. Restoring to this day will replace your current work. Continue restoring?'
      )
    ) {
      return;
    }
  }
  restoreArchivedDay(day.id);
  onClose();
};
```

With:

```tsx
const handleRestoreDay = () => {
  if (isDayStarted) {
    setShowRestoreDialog(true);
  } else {
    restoreArchivedDay(day.id);
    onClose();
  }
};

const handleRestoreConfirm = () => {
  restoreArchivedDay(day.id);
  setShowRestoreDialog(false);
  onClose();
};
```

- [ ] **Step 9: Add AlertDialog inside the outer Dialog**

Before the final closing `</DialogContent>` tag:

```tsx
<AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Replace active day?</AlertDialogTitle>
      <AlertDialogDescription>
        You currently have an active day. Restoring to this archived day will
        replace your current work.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleRestoreConfirm}>
        Restore anyway
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 10: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/ArchiveItem.tsx src/components/ArchiveEditDialog.tsx
git commit -m "fix: replace confirm()/alert() with AlertDialog/toast in ArchiveItem and ArchiveEditDialog"
```

---

## Task 6: ProjectList.tsx — replace two confirm() calls

**Files:**

- Modify: `src/pages/ProjectList.tsx`

- [ ] **Step 1: Add AlertDialog import**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: Add dialog state variables**

```tsx
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [showResetDialog, setShowResetDialog] = useState(false);
```

- [ ] **Step 3: Replace handleDelete**

Replace:

```tsx
const handleDelete = async (projectId: string) => {
  if (confirm('Are you sure you want to delete this project?')) {
    deleteProject(projectId);
    // Save changes to database
    await forceSyncToDatabase();
  }
};
```

With:

```tsx
const handleDeleteConfirm = async () => {
  if (!deleteTargetId) return;
  deleteProject(deleteTargetId);
  await forceSyncToDatabase();
  setDeleteTargetId(null);
};
```

- [ ] **Step 4: Replace handleResetToDefaults**

Replace:

```tsx
const handleResetToDefaults = () => {
  if (
    confirm(
      "Are you sure you want to reset all projects to defaults? This will remove any custom projects you've added."
    )
  ) {
    resetProjectsToDefaults();
  }
};
```

With:

```tsx
const handleResetConfirm = () => {
  resetProjectsToDefaults();
  setShowResetDialog(false);
};
```

- [ ] **Step 5: Update button call sites**

- Change delete button `onClick` from `handleDelete(project.id)` to `() => setDeleteTargetId(project.id)`
- Change Reset to Defaults button `onClick` from `handleResetToDefaults` to `() => setShowResetDialog(true)`

- [ ] **Step 6: Add two AlertDialogs at the bottom of the return, before the closing outer div**

```tsx
<AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete this project?</AlertDialogTitle>
			<AlertDialogDescription>
				This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancel</AlertDialogCancel>
			<AlertDialogAction
				onClick={handleDeleteConfirm}
				className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Delete
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

<AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Reset projects to defaults?</AlertDialogTitle>
			<AlertDialogDescription>
				This will remove any custom projects you've added. This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancel</AlertDialogCancel>
			<AlertDialogAction
				onClick={handleResetConfirm}
				className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Reset
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 7: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProjectList.tsx
git commit -m "fix: replace confirm() with AlertDialog in ProjectList"
```

---

## Task 7: Categories.tsx — replace confirm()

**Files:**

- Modify: `src/pages/Categories.tsx`

- [ ] **Step 1: Add AlertDialog import**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: Add delete dialog state**

```tsx
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
```

- [ ] **Step 3: Replace handleDelete**

Replace:

```tsx
const handleDelete = async (categoryId: string) => {
  if (
    confirm(
      'Are you sure you want to delete this category? This action cannot be undone.'
    )
  ) {
    deleteCategory(categoryId);
    // Save changes to database
    await forceSyncToDatabase();
  }
};
```

With:

```tsx
const handleDeleteConfirm = async () => {
  if (!deleteTargetId) return;
  deleteCategory(deleteTargetId);
  await forceSyncToDatabase();
  setDeleteTargetId(null);
};
```

- [ ] **Step 4: Update delete button call site**

Change delete button `onClick` from `handleDelete(category.id)` to `() => setDeleteTargetId(category.id)`.

- [ ] **Step 5: Add AlertDialog at the bottom of the return, before the closing outer div**

```tsx
<AlertDialog
  open={deleteTargetId !== null}
  onOpenChange={open => !open && setDeleteTargetId(null)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this category?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeleteConfirm}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 6: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 7: Final verification — confirm no confirm() calls remain**

```bash
grep -rn "confirm(" src/ --include="*.tsx"
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Categories.tsx
git commit -m "fix: replace confirm() with AlertDialog in Categories"
```
