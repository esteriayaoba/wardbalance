import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseState = vi.fn((val) => [val, vi.fn()]);
const mockUseEffect = vi.fn((cb) => cb());
const mockUseCallback = vi.fn((cb) => cb);
const mockUseRef = vi.fn((val) => ({ current: val }));

vi.mock("react", async () => {
  const actual = await vi.importActual("react") as any;
  return {
    ...actual,
    useState: mockUseState,
    useEffect: mockUseEffect,
    useCallback: mockUseCallback,
    useRef: mockUseRef,
  };
});

// Mock browser globals
const listeners: Record<string, Function[]> = {};
global.window = {
  addEventListener: vi.fn((event: string, callback: Function) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(callback);
  }),
  removeEventListener: vi.fn(),
} as any;

describe("useBackgroundSync hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should subscribe to online and offline events", async () => {
    const { useBackgroundSync } = await import("../useBackgroundSync");
    const syncCallback = vi.fn();
    
    useBackgroundSync(syncCallback);

    expect(global.window.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(global.window.addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
