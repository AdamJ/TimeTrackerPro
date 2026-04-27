---
name: ios-health-check
description: >
  Runs a full iOS/Capacitor environment health check and auto-fixes any failures
  before proceeding with iOS-related work. Use before making any changes to iOS
  code, Capacitor config, or Xcode project files.
---

# iOS Environment Health Check — TimeTracker Pro

## When to Use

Run this skill **before** making any changes to:

- `capacitor.config.ts`
- `ios/App/CapApp-SPM/Package.swift`
- `ios/App/App.xcodeproj/project.pbxproj`
- Any file under `ios/`
- Any feature gated by `VITE_IOS_BUILD`

Do not skip this check. Fix every failure before starting the actual task.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `ios/App/CapApp-SPM/Package.swift` | SPM manifest — defines swift-tools-version and iOS platform target |
| `ios/App/CapApp-SPM/Package.resolved` | Resolved dependency lockfile |
| `ios/App/App.xcodeproj/project.pbxproj` | Xcode project — contains `IPHONEOS_DEPLOYMENT_TARGET` entries |
| `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | Workspace-level resolved lockfile |
| `capacitor.config.ts` | Capacitor config — `experimental.ios.spm.swiftToolsVersion` must match Package.swift |
| `.env.ios` | iOS build env (`VITE_IOS_BUILD=true`, no Supabase keys) |

---

## Check 1 — swift-tools-version drift

**Read both values:**

```bash
head -1 ios/App/CapApp-SPM/Package.swift
# Expected: // swift-tools-version:X.X
```

```bash
node -e "const c = require('./capacitor.config.ts'); console.log(c.default?.experimental?.ios?.spm?.swiftToolsVersion ?? 'NOT SET')"
```

Or read `capacitor.config.ts` directly and look for:

```ts
experimental: {
  ios: {
    spm: {
      swiftToolsVersion: "X.X"
    }
  }
}
```

**Pass condition:** Both values are identical.

**Auto-fix:** Update `swiftToolsVersion` in `capacitor.config.ts` to match the
value in `Package.swift`, then run:

```bash
npm run sync:ios
```

---

## Check 2 — Stale Package.resolved

```bash
cd ios/App/CapApp-SPM
swift package resolve
cd ../../..
```

**Pass condition:** Command exits 0 with no errors or warnings about missing packages.

**Auto-fix:** Delete the stale lockfile and regenerate:

```bash
rm ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved
cd ios/App/CapApp-SPM
swift package resolve
cd ../../..
```

---

## Check 3 — iOS build target mismatch

Extract the platform version from `Package.swift`:

```bash
grep -E "\.iOS\(" ios/App/CapApp-SPM/Package.swift
# Expected: .iOS("26.0") or similar
```

Extract all `IPHONEOS_DEPLOYMENT_TARGET` values from the Xcode project:

```bash
grep IPHONEOS_DEPLOYMENT_TARGET ios/App/App.xcodeproj/project.pbxproj | sort -u
```

**Pass condition:** All `IPHONEOS_DEPLOYMENT_TARGET` values match the version
declared in the `.iOS("X.X")` platform entry of `Package.swift`.

**Auto-fix:** Update every `IPHONEOS_DEPLOYMENT_TARGET` entry in
`ios/App/App.xcodeproj/project.pbxproj` to match the Package.swift value.
Use a targeted sed or direct file edit — do not change any other keys.

> ⚠️ `cap sync` overwrites `Package.swift`. Always make version changes in
> `capacitor.config.ts`, not directly in Xcode project files.

---

## Check 4 — Workspace integrity

Check for dangling references in the Xcode workspace:

```bash
grep -rE "path = .*;" ios/App/App.xcodeproj/project.pbxproj \
  | sed 's/.*path = //;s/;//' \
  | sort -u
```

For any path that looks like a file (not a directory), verify it exists relative
to `ios/App/`. Flag any reference whose target is missing.

**Pass condition:** No referenced paths are missing from the filesystem.

**Auto-fix:** Remove the dangling `PBXFileReference` and any `PBXBuildFile`
entries that reference it from `project.pbxproj`. Do not remove group or
directory entries — only file references.

---

## Check 5 — Build validation

```bash
npm run build:ios
```

**Pass condition:** Exits 0 with no TypeScript errors, no Vite errors.

**Auto-fix:** Read the full error output carefully. Common causes:

| Error pattern | Fix |
|---------------|-----|
| `Cannot find module` | Check import alias — must use `@/`, never relative paths |
| `Type error` in iOS-only code | Ensure `VITE_IOS_BUILD` guard uses `import.meta.env.VITE_IOS_BUILD !== "true"` |
| Vite PWA plugin error | Confirm `.env.ios` sets `VITE_IOS_BUILD=true` to disable PWA plugin |
| Missing env variable | Add to `.env.ios` (never add Supabase keys here) |

---

## Reporting

After all checks, output a table before proceeding with the actual task:

| Check | Status | Action Taken |
|-------|--------|--------------|
| swift-tools-version drift | ✅ Pass / ❌ Fixed | (describe fix or "none") |
| Stale Package.resolved | ✅ Pass / ❌ Fixed | (describe fix or "none") |
| iOS build target mismatch | ✅ Pass / ❌ Fixed | (describe fix or "none") |
| Workspace integrity | ✅ Pass / ❌ Fixed | (describe fix or "none") |
| Build validation | ✅ Pass / ❌ Fixed | (describe fix or "none") |

If any check could not be auto-fixed, stop and report the blocker clearly
before touching any other files.

---

## Rules

- Always run all five checks — do not skip any because a previous one passed.
- Never modify `Package.swift` directly for version changes — always go through `capacitor.config.ts`.
- Never add Supabase credentials to `.env.ios`.
- Never commit `ios/App/App/public/` — it is gitignored and regenerated by `cap sync ios`.
- The minimum iOS deployment target for this project is **iOS 26**.
