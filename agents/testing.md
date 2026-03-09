# Testing & Quality — TimeTracker Pro

## Running Tests

```bash
# Unit tests
npm run test

# Linting
npm run lint

# Type checking (via build)
npm run build
```

---

## Manual Testing Checklist

**Before submitting any change:**

- [ ] Test in guest mode (no authentication)
- [ ] Test in authenticated mode
- [ ] Test on mobile viewport
- [ ] Test data persistence (refresh page)
- [ ] Test export/import functionality if relevant
- [ ] Verify no console errors
- [ ] Check responsive design

---

## PWA-Specific Testing

- [ ] Service worker registers successfully (DevTools → Application → Service Workers)
- [ ] App works offline (DevTools → Network → Offline)
- [ ] Install prompt appears (wait 30 seconds or test manually)
- [ ] App installs correctly on desktop (Chrome/Edge)
- [ ] Bottom navigation visible on mobile viewports
- [ ] Touch targets are large enough (44×44px minimum)
- [ ] Manifest loads without errors (DevTools → Application → Manifest)
- [ ] Update notification works when service worker updates

---

## Code Quality Requirements

1. **All lint errors must be fixed** before committing — run `npm run lint`
2. **All TypeScript errors must be fixed** before merging — run `npm run build`
3. **Manual testing** of changed functionality required
4. **No breaking changes** without documentation

---

## Pre-Commit Checklist

Before every commit, verify:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` passes with no type errors
- [ ] Tabs (not spaces) used throughout
- [ ] Double quotes used throughout
- [ ] `@/` import aliases used (no relative paths)
- [ ] Changed functionality tested manually
