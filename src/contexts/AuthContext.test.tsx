import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, BEFORE_SIGN_OUT_TIMEOUT_MS } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";

const calls: string[] = [];
const signOutMock = vi.fn(async () => {
  calls.push("supabase.signOut");
  return { error: null };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: () => signOutMock(),
      signInWithPassword: vi.fn()
    }
  },
  clearUserCache: vi.fn(),
  trackAuthCall: vi.fn()
}));
vi.mock("@/services/localStorageService/clearLocalData", () => ({
  clearSupabaseResponseCache: vi.fn(async () => undefined)
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthContext.signOut", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("runs the before-sign-out handler while the session is still valid", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const handler = vi.fn(async () => {
      calls.push("beforeSignOut");
    });
    act(() => result.current.setBeforeSignOut(handler));

    await act(async () => {
      await result.current.signOut({ keepLocalCopy: true });
    });

    expect(handler).toHaveBeenCalledWith({ keepLocalCopy: true });
    expect(calls).toEqual(["beforeSignOut", "supabase.signOut"]);
  });

  it("passes a remove-from-device choice to the handler", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const handler = vi.fn(async () => undefined);
    act(() => result.current.setBeforeSignOut(handler));

    await act(async () => {
      await result.current.signOut({ keepLocalCopy: false });
    });

    expect(handler).toHaveBeenCalledWith({ keepLocalCopy: false });
    expect(result.current.shouldKeepLocalCopy()).toBe(false);
  });

  it("signs out anyway when the handler takes too long", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // test-setup mocks the system date; reset it before switching to fake timers.
    vi.useRealTimers();
    vi.useFakeTimers();
    try {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      act(() => result.current.setBeforeSignOut(() => new Promise<void>(() => undefined)));

      let signOutDone: Promise<unknown> = Promise.resolve();
      act(() => {
        signOutDone = result.current.signOut({ keepLocalCopy: true });
      });
      expect(signOutMock).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(BEFORE_SIGN_OUT_TIMEOUT_MS);
        await signOutDone;
      });

      expect(signOutMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("calls the sign-out-failed handler only when Supabase fails to sign out", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const onFailed = vi.fn();
    act(() => result.current.setOnSignOutFailed(onFailed));

    await act(async () => {
      await result.current.signOut({ keepLocalCopy: false });
    });
    expect(onFailed).not.toHaveBeenCalled();

    signOutMock.mockImplementationOnce(async () => ({ error: new Error("network down") }) as never);
    await act(async () => {
      await result.current.signOut({ keepLocalCopy: false });
    });
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it("still signs out when the handler fails", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    act(() => result.current.setBeforeSignOut(async () => {
      throw new Error("User not authenticated");
    }));

    await act(async () => {
      await result.current.signOut({ keepLocalCopy: true });
    });

    expect(signOutMock).toHaveBeenCalled();
  });
});
