import { describe, it, expect, beforeEach, vi } from "vitest";

// The global test-setup.ts mocks "@/lib/supabase" wholesale (no cache
// exports), so this test imports the real module directly to exercise the
// actual user-id-keyed cache implementation. test-setup.ts's beforeAll
// (which sets these same vars) hasn't run yet at this point in module
// collection, so the real module's top-level createClient() call needs
// them set here first.
process.env.VITE_SUPABASE_URL = "https://test.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";

const {
  getCachedProjects,
  setCachedProjects,
  getCachedCategories,
  setCachedCategories,
  getCachedClients,
  setCachedClients,
  clearDataCaches
} = await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");

describe("data caches are keyed by user.id", () => {
  beforeEach(() => {
    clearDataCaches();
  });

  it("does not serve cached projects to a different user", () => {
    setCachedProjects([{ id: "p1", name: "Alpha", client: "Acme" }], "user-a");

    expect(getCachedProjects("user-a")).toEqual([{ id: "p1", name: "Alpha", client: "Acme" }]);
    expect(getCachedProjects("user-b")).toBeNull();
  });

  it("does not serve cached categories to a different user", () => {
    setCachedCategories([{ id: "c1", name: "Dev", color: "#000", isBillable: true }], "user-a");

    expect(getCachedCategories("user-a")).toEqual([
      { id: "c1", name: "Dev", color: "#000", isBillable: true }
    ]);
    expect(getCachedCategories("user-b")).toBeNull();
  });

  it("does not serve cached clients to a different user", () => {
    setCachedClients(
      [{ id: "cl1", name: "Client X", archived: false, createdAt: "2026-01-01T00:00:00.000Z" }],
      "user-a"
    );

    expect(getCachedClients("user-a")).toEqual([
      { id: "cl1", name: "Client X", archived: false, createdAt: "2026-01-01T00:00:00.000Z" }
    ]);
    expect(getCachedClients("user-b")).toBeNull();
  });
});
