import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisualViewport } from "@/hooks/useVisualViewport";

class FakeVisualViewport extends EventTarget {
  offsetTop = 0;
  height = 800;
}

const original = Object.getOwnPropertyDescriptor(window, "visualViewport");

const install = (viewport: FakeVisualViewport | undefined) =>
  Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });

describe("useVisualViewport", () => {
  afterEach(() => {
    if (original) Object.defineProperty(window, "visualViewport", original);
    else delete (window as { visualViewport?: unknown }).visualViewport;
  });

  it("is null when disabled or unsupported", () => {
    install(new FakeVisualViewport());
    expect(renderHook(() => useVisualViewport(false)).result.current).toBeNull();
    install(undefined);
    expect(renderHook(() => useVisualViewport(true)).result.current).toBeNull();
  });

  it("follows the visible area as the keyboard opens and closes", () => {
    const viewport = new FakeVisualViewport();
    install(viewport);
    const { result } = renderHook(() => useVisualViewport(true));
    expect(result.current).toEqual({ top: 0, height: 800 });

    act(() => {
      viewport.height = 480;
      viewport.offsetTop = 12;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toEqual({ top: 12, height: 480 });

    act(() => {
      viewport.height = 800;
      viewport.offsetTop = 0;
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toEqual({ top: 0, height: 800 });
  });

  it("stops listening on unmount", () => {
    const viewport = new FakeVisualViewport();
    install(viewport);
    const { result, unmount } = renderHook(() => useVisualViewport(true));
    unmount();
    viewport.height = 300;
    viewport.dispatchEvent(new Event("resize"));
    expect(result.current).toEqual({ top: 0, height: 800 });
  });
});
