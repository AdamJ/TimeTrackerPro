# 🔒 Security Checklist

## ✅ Environment Variables Security

### Current Security Status

- ✅ `.env` removed from Git tracking
- ✅ `.env` added to `.gitignore`
- ✅ `.env.example` provides template with instructions
- ✅ README.md includes security warnings

### 🔐 Before Publishing to GitHub

**MANDATORY SECURITY CHECKS:**

1. **Verify .env is NOT tracked:**

   ```bash
   git ls-files | grep -E '\.env$'
   # Should return NO results (only .env.example should exist)
   ```

2. **Confirm .gitignore includes .env:**

   ```bash
   grep -E '\.env' .gitignore
   # Should show .env patterns
   ```

3. **Check for accidental commits:**

   ```bash
   git log --all --full-history -- .env
   # If this shows results, see "🚨 If .env Was Already Committed" below
   ```

### 🚨 If .env Was Already Committed (URGENT)

If your `.env` file with real credentials was ever committed to a repository:

1. **Immediately rotate your Supabase keys:**
   - Go to Supabase Dashboard > Settings > API
   - Reset your anon key
   - Update your local `.env` with new keys

2. **Remove from Git history (if repository is private):**

   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **For public repositories:**
   - Create a new Supabase project
   - Update all your environment variables
   - Consider the old keys compromised

### 🛡️ Additional Security Measures

#### Row Level Security (RLS)

- ✅ All Supabase tables have RLS enabled
- ✅ Users can only access their own data
- ✅ Anonymous users cannot access authenticated data

#### Environment Variable Validation

```typescript
// In src/lib/supabase.ts
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars not found. Supabase sync will be disabled.');
}
```

### 🔍 Production Deployment Security

#### For Vercel/Netlify

1. Set environment variables in dashboard (not in code)
2. Use different Supabase project for production
3. Never use development keys in production

#### For Docker/Self-Hosted

1. Use Docker secrets or environment files
2. Never include `.env` in Docker images
3. Use build-time arguments for public variables only

### 📋 Pre-Deployment Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env` is not tracked by Git
- [ ] No credentials hardcoded in source files
- [ ] `.env.example` has dummy values only
- [ ] Production uses separate Supabase project
- [ ] RLS policies are properly configured
- [ ] Environment variables set in deployment platform

### 🚀 Safe Publishing Commands

```bash
# Final check before pushing
git status
git ls-files | grep -E '\.env$'  # Should be empty

# Safe to push
git add .
git commit -m "feat: add authentication and database integration"
git push origin main
```

### 📞 Emergency Response

If credentials are accidentally exposed:

1. **Immediately** rotate Supabase keys
2. Check repository access logs
3. Monitor Supabase usage for unusual activity
4. Consider creating new Supabase project if exposure was public

---

## Dependency Vulnerability Management

### Version Floors

Certain transitive dependencies are pinned as direct `devDependencies` to enforce a minimum safe version, because pnpm's `overrides` field does not force version bumps for packages already at the minimum satisfying version. These entries exist for security — not because the project uses these packages directly.

| Package | Pinned version | CVE / reason |
|---|---|---|
| `hono` | `4.12.25` | CORS credential reflection, path traversal, Lambda header issues |
| `form-data` | `4.0.6` | CRLF injection via unescaped multipart field names |

### Build Tool Security

Major version upgrades performed to resolve known CVEs in dev toolchain (dev-only, not shipped to production):

| Package | From | To | Severity |
|---|---|---|---|
| `vitest` | 1.6.1 | 3.2.6 | Critical — arbitrary file read/execute via UI server |
| `vite` | 5.4.21 | 6.4.3 | High — `server.fs.deny` bypass on Windows |
| `react-router-dom` | ^6.30.3 | ^6.30.4 | Medium — open redirect via protocol-relative URL |

### pnpm Build Script Allowlist

`.npmrc` declares `only-built-dependencies` for packages allowed to run postinstall scripts: `esbuild`, `@swc/core`, `electron-winstaller`, `msw`. All other packages run without postinstall. This was moved from `package.json#pnpm` to `.npmrc` when pnpm v10 stopped reading the `pnpm` namespace in `package.json`.

---

## Frontend Security Controls

### URL Sanitization

User-supplied URLs (e.g. `contactWebsite` on client records) are validated with `URL()` before being rendered as `href` attributes. Only `http:` and `https:` schemes produce a clickable anchor — any other value (including `javascript:` URIs or malformed URLs) is rendered as plain text.

**Location:** `src/components/ClientManagement.tsx`

### External Link Isolation

All `target="_blank"` links include `rel="noopener noreferrer"` to prevent the opened page from accessing `window.opener` and to suppress the `Referer` header.

**Locations:** `src/components/AppSidebar.tsx`, `src/components/ClientManagement.tsx`

### Content Security Policy (Electron)

The Electron build sets a `Content-Security-Policy` response header via `session.defaultSession.webRequest.onHeadersReceived`. Key directives:

```
default-src 'self' app: data: https://*.supabase.co
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' app: data: blob: https:
connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

`'unsafe-inline'` and `'unsafe-eval'` are intentionally absent from `script-src` — the production build uses only `<script type="module">` and requires neither.

**Location:** `electron/main.ts`

---

**Remember**: It's always better to be overly cautious with credentials than to deal with a security incident later!
