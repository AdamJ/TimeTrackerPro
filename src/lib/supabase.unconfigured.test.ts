import { describe, it, expect, vi, afterEach } from "vitest";

// Regression: with no VITE_SUPABASE_* vars, createClient("", "") threw at import
// time and blanked the whole app, despite local-storage-only mode being
// documented. The global test setup always injects fake credentials, so this
// test clears them and imports the real module.
describe("@/lib/supabase without credentials", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("imports without throwing and reports it is not configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const mod = await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");

    expect(mod.isSupabaseConfigured).toBe(false);
    expect(mod.supabase).toBeDefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Supabase env vars not found"));
    warn.mockRestore();
  });

  it("reports configured when both vars are present", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.resetModules();

    const mod = await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");

    expect(mod.isSupabaseConfigured).toBe(true);
  });
});
