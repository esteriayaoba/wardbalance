import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseState = vi.fn((val) => [val, vi.fn()]);
const mockUseEffect = vi.fn((cb) => cb());
const mockUseCallback = vi.fn((cb) => cb);

vi.mock("react", async () => {
  const actual = await vi.importActual("react") as any;
  return {
    ...actual,
    useState: mockUseState,
    useEffect: mockUseEffect,
    useCallback: mockUseCallback,
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
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
} as any;

global.localStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
} as any;

describe("useInstallPrompt hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should check standalone state and register beforeinstallprompt", async () => {
    const { useInstallPrompt } = await import("../useInstallPrompt");
    
    useInstallPrompt();

    expect(global.window.matchMedia).toHaveBeenCalledWith("(display-mode: standalone)");
    expect(global.window.addEventListener).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
  });
});
