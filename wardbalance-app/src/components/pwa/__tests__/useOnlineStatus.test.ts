import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseState = vi.fn((val) => [val, vi.fn()]);
const mockUseEffect = vi.fn((cb) => cb());

vi.mock("react", async () => {
  const actual = await vi.importActual("react") as any;
  return {
    ...actual,
    useState: mockUseState,
    useEffect: mockUseEffect,
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

Object.defineProperty(global.navigator, "onLine", {
  value: true,
  writable: true,
  configurable: true,
});

describe("useOnlineStatus hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize and set up online/offline event listeners", async () => {
    const { useOnlineStatus } = await import("../useOnlineStatus");
    
    useOnlineStatus();

    expect(mockUseState).toHaveBeenCalledWith(true);
    expect(mockUseEffect).toHaveBeenCalled();
    expect(global.window.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(global.window.addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
