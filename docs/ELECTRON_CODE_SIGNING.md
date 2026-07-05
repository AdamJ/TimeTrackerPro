# Electron Code Signing

Timetraked's desktop builds (macOS DMG/ZIP, Windows NSIS) are currently **unsigned by design** — `.github/workflows/electron-release.yml` sets `CSC_IDENTITY_AUTO_DISCOVERY: false` to stop electron-builder from picking up a stray local identity, and no certificates, entitlements, or notarization config exist anywhere in the repo.

This has two concrete costs today:

- Users see a Gatekeeper "unidentified developer" warning (macOS) or a SmartScreen warning (Windows) on install.
- On macOS, the built-in auto-updater's `quitAndInstall()` call fails outright, because Squirrel.Mac refuses to install an update for an unsigned app. `electron/updater.ts` contains an explicit workaround for this (tracked as issue #220) that catches the failure and points the user at a manual download instead.

This doc is the **opt-in** path to turn real code signing on for both platforms so the built-in update flow works end-to-end. Nothing here is required — unsigned builds keep working exactly as they do today if you never follow these steps. Linux is out of scope; there's no `linux` target configured in `package.json`.

## Prerequisites / costs

- **Apple Developer Program membership — $99/yr.** Enroll as an **Organization**, not a personal Apple ID. An org account isn't tied to one person's iCloud login and survives maintainer turnover; a personal Apple ID does not.
- **A Windows code-signing certificate.** OV (Organization Validation), roughly $70–400/yr depending on the CA (DigiCert, Sectigo, SSL.com, GlobalSign, and others all sell these). **Prefer OV over EV**: EV certificates require the private key to live on a non-exportable hardware token/HSM, which doesn't fit the portable base64-`.pfx` approach electron-builder expects (`CSC_LINK`/`WIN_CSC_LINK`). EV gives stronger SmartScreen reputation immediately, but wiring it into CI needs a cloud-signing integration (Azure Trusted Signing, DigiCert KeyLocker, SSL.com eSigner) that's out of scope here — revisit if OV's slower SmartScreen reputation build-up becomes a problem.
- Both accounts should be organization-controlled, not tied to whoever originally sets this up.

## When to use this

- You want to remove the Gatekeeper/SmartScreen warnings users see on install.
- You want in-app auto-update to actually work on macOS instead of falling back to the "download manually" dialog (issue #220).
- You're distributing to an audience that won't right-click-Open past a warning.

## Architecture

```text
macOS: electron-builder --codesign (hardenedRuntime + entitlements)--> notarize (Apple Notary via API key) --staple--> .dmg / .zip
Windows: electron-builder --signtool (Authenticode via .pfx)--> .exe

GitHub Environment "electron-signing" --secrets--> electron-release.yml build job
```

- `package.json` `build` key — where `mac.hardenedRuntime`/`entitlements`/`entitlementsInherit` and the Windows cert env vars plug in.
- `build/entitlements.mac.plist` (new file) — hardened-runtime entitlements passed to `codesign`.
- `.github/workflows/electron-release.yml` — where the `electron-signing` Environment and its secrets get wired into the build job.
- `electron/updater.ts` — its unsigned-build workaround becomes stale once this is live (see [Follow-up cleanup](#follow-up-cleanup)).

## macOS: Developer ID + notarization

### 1. Get a Developer ID Application certificate

In the Apple Developer portal, under Certificates, Identifiers & Profiles → Certificates, create a **Developer ID Application** certificate — the cert Apple issues for signing apps distributed outside the Mac App Store. Generate the CSR via Keychain Access on a Mac, upload it, and download the resulting certificate into that Mac's keychain.

### 2. Export it as base64 for `CSC_LINK`

In Keychain Access, export the certificate (with its private key) as a password-protected `.p12`, then base64-encode it:

```bash
base64 -i DeveloperIDApplication.p12 | pbcopy
```

The base64 string becomes the `CSC_LINK` secret; the `.p12`'s export password becomes `CSC_KEY_PASSWORD`.

### 3. Create an App Store Connect API key

In App Store Connect → Users and Access → Integrations → App Store Connect API, generate a key with the **Developer** role — not Admin; this key only needs to submit builds for notarization. The `.p8` private key file downloads **exactly once**, so save it immediately. Record the **Key ID** and **Issuer ID** shown alongside it.

### 4. Update `package.json`'s `build.mac`

```diff
    "mac": {
      "category": "public.app-category.productivity",
      "target": [
        "dmg",
        "zip"
-     ]
+     ],
+     "hardenedRuntime": true,
+     "entitlements": "build/entitlements.mac.plist",
+     "entitlementsInherit": "build/entitlements.mac.plist"
    },
```

No separate `mac.notarize` block is needed. Since electron-builder v23+ (this repo uses v26.15.0), notarization and stapling run automatically in the `afterSign` step whenever `hardenedRuntime: true` is set and the Apple API key env vars below are present.

### 5. Add `build/entitlements.mac.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
  </dict>
</plist>
```

This is the standard entitlement set Electron's hardened runtime needs — nothing app-specific to add. `entitlements` and `entitlementsInherit` point at the same file since Timetraked has no child/helper process that needs a separate, more restrictive set.

### 6. Note the `APPLE_API_KEY` file-path requirement

Unlike `CSC_LINK` (a base64 *string* electron-builder decodes itself), `APPLE_API_KEY` must be a **file path** to the `.p8` on disk — electron-builder doesn't accept its contents inline. The CI workflow needs an extra step to write the secret to a temp file before the build runs (see the [workflow diff](#electron-releaseyml-changes) below).

## Windows: Authenticode signing

### 1. Get a code-signing certificate

Purchase an OV Authenticode certificate from a CA (DigiCert, Sectigo, SSL.com, GlobalSign, etc. — pick whichever fits your org's existing vendor relationships).

### 2. Export it as base64 for `WIN_CSC_LINK`

```bash
base64 -w0 certificate.pfx   # Linux
base64 -i certificate.pfx    # macOS
```

The output becomes `WIN_CSC_LINK`; the `.pfx` password becomes `WIN_CSC_KEY_PASSWORD`.

### 3. No `package.json` changes needed

The existing `"win": { "target": "nsis" }` is already sufficient — electron-builder detects signing credentials from environment variables with no additional build config.

### 4. Use the Windows-specific env var names

`CSC_LINK`/`CSC_KEY_PASSWORD` are the generic pair (primary for macOS, and a Windows fallback if nothing more specific is set). `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` are Windows-specific and take precedence on Windows builds. Since `electron-release.yml`'s `build` job runs both the `macos-latest` and `windows-latest` matrix legs off one shared `env:` block, use the `WIN_CSC_*` pair for the Windows `.pfx` so it doesn't collide with the macOS `.p12` in `CSC_LINK`.

## GitHub Environment secrets setup

### 1. Create the `electron-signing` Environment

Repo Settings → Environments → New environment, named `electron-signing`. This mirrors the existing `major-release` Environment already used in `.github/workflows/release.yml` for manual major-version-bump approval — a separate tier from plain repository secrets.

### 2. Add these secrets to the environment

| Secret | Purpose |
| --- | --- |
| `CSC_LINK` | base64-encoded macOS Developer ID Application `.p12` |
| `CSC_KEY_PASSWORD` | password protecting the `.p12` |
| `WIN_CSC_LINK` | base64-encoded Windows Authenticode `.pfx` |
| `WIN_CSC_KEY_PASSWORD` | password protecting the `.pfx` |
| `APPLE_API_KEY` | contents of the App Store Connect `.p8` key (written to a file at build time — see macOS step 6) |
| `APPLE_API_KEY_ID` | Key ID shown next to the API key in App Store Connect |
| `APPLE_API_ISSUER` | Issuer ID (UUID) from App Store Connect |
| `APPLE_TEAM_ID` | Apple Developer Team ID, used to resolve the signing identity |

Once these are in place, **remove** `CSC_IDENTITY_AUTO_DISCOVERY: false` from `electron-release.yml` — that flag exists specifically to prevent signing.

### 3. (Optional) Require reviewers on `electron-signing`

Settings → Environments → `electron-signing` → Required reviewers. Adding this gates every signing-capable build behind manual approval, the same pattern already used for `major-release`.

## `electron-release.yml` changes

```diff
   build:
     needs: check
     if: needs.check.outputs.should_build == 'true'
+    environment: electron-signing
     strategy:
       fail-fast: false
       matrix:
         include:
           - os: macos-latest
             build_script: electron:build -- --mac
           - os: windows-latest
             build_script: electron:build -- --win

     runs-on: ${{ matrix.os }}

     permissions:
       contents: write

     env:
       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
       VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
-      CSC_IDENTITY_AUTO_DISCOVERY: false
+      CSC_LINK: ${{ secrets.CSC_LINK }}
+      CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
+      WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
+      WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
+      APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
+      APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
+      APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

     steps:
       - name: Checkout code
         uses: actions/checkout@v4
         with:
           ref: ${{ needs.check.outputs.tag }}

       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: "20"

       - name: Setup pnpm
         uses: pnpm/action-setup@v4

       - name: Install dependencies
         run: pnpm install --frozen-lockfile

+      - name: Write Apple API key (macOS only)
+        if: runner.os == 'macOS'
+        run: |
+          echo "${{ secrets.APPLE_API_KEY }}" > "$RUNNER_TEMP/apple_api_key.p8"
+          echo "APPLE_API_KEY=$RUNNER_TEMP/apple_api_key.p8" >> "$GITHUB_ENV"

       - name: Build Electron app
         run: pnpm run ${{ matrix.build_script }}
```

The "Write Apple API key" step must run before the build step and is gated to macOS — it's a no-op to skip on the Windows leg since notarization doesn't apply there.

## Keeping secrets and IDs safe

- **Never commit** `.p12`, `.pfx`, or `.p8` files — or their base64/text forms — to the repo. Add `*.p12`, `*.pfx`, and `*.p8` to `.gitignore`.
- Store every credential as a GitHub **Environment** secret scoped to `electron-signing` — not a plain repo secret, and never in `.env` (the same "backend/CI-only, never checked in" boundary `.env.example` already draws for other credentials).
- Use required reviewers on `electron-signing` as an extra approval gate before anything can consume these secrets.
- **If a secret leaks**, rotate it immediately:
  - Apple API key: revoke it in App Store Connect (Integrations → API Keys) and generate a replacement.
  - Windows certificate: contact the issuing CA to revoke and reissue.
  - Either case: update the GitHub secret value and trigger a fresh signed build.
- Never `echo` a secret's value into a workflow log, and never write one to an unmasked temp file beyond the one intentional `apple_api_key.p8` write above (which lives only in `$RUNNER_TEMP`, cleaned up per-runner). GitHub auto-masks registered secret values in logs, but that only covers the literal registered value — not re-encoded or derived forms of it.
- Keep the App Store Connect API key scoped to the **Developer** role, not Admin — least privilege for what notarization actually needs.

## Verification

- macOS: `codesign --verify --deep --strict Timetraked.app`, `spctl -a -vvv Timetraked.app` (expect "accepted"), `xcrun stapler validate Timetraked.app` (confirms the notarization ticket stapled).
- Windows: `signtool verify /pa /v Timetraked.exe`.
- End-to-end: install an older signed release, cut a new one, and confirm the update installs via `quitAndInstall()` without hitting the `error` handler in `electron/updater.ts` — i.e., the "Update install failed" dialog no longer appears.

## Follow-up cleanup

Once signing is live and verified, these become separate follow-up PRs (not part of setting up signing itself):

- `electron/updater.ts`'s unsigned-build workaround — the comments explaining why builds are unsigned, and the `error` handler's fallback dialog pointing at a manual download — becomes stale and should be revisited.
- `electron/updater.test.ts`'s test keyed to the literal error string `"Could not get code signature for running application"` should be revisited.
- `CHANGELOG.md`'s issue #220 references should get a closing note.
- `AGENTS.md`'s Electron Desktop Build section should link to this doc.
- `docs/CI_CD.md` doesn't currently mention `electron-release.yml` at all — worth fixing independently of signing.

## Related

- `AGENTS.md` — Electron Desktop Build section
- `docs/CI_CD.md`
- `.github/workflows/electron-release.yml`
- `electron/updater.ts`
