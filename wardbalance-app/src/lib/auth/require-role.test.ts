import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSession = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSession: mockSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}));

const { requireRole } = await import("./require-role");

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    email: "admin@school.com",
    fullName: "Admin User",
    role: "SchoolOwner",
    schoolId: "school-1",
    schoolName: "Test School",
    schoolStatus: "active",
    emailVerified: true,
    isDemo: false,
    ...overrides,
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return { id: "user-1", role: "SchoolOwner", emailVerified: true, ...overrides };
}

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockSession.mockResolvedValue(null);
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("allows demo sessions to bypass checks", async () => {
    mockSession.mockResolvedValue(makeSession({ isDemo: true, emailVerified: false }));
    mockFindUnique.mockResolvedValue(null);
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(true);
  });

  it("blocks paused school", async () => {
    mockSession.mockResolvedValue(makeSession({ schoolStatus: "paused" }));
    mockFindUnique.mockResolvedValue(makeUser());
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(body.code).toBe("SCHOOL_NOT_ACTIVE");
    }
  });

  it("blocks archived school", async () => {
    mockSession.mockResolvedValue(makeSession({ schoolStatus: "archived" }));
    mockFindUnique.mockResolvedValue(makeUser());
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(body.code).toBe("SCHOOL_NOT_ACTIVE");
    }
  });

  it("allows onboarding school when email verified", async () => {
    mockSession.mockResolvedValue(makeSession({ schoolStatus: "onboarding" }));
    mockFindUnique.mockResolvedValue(makeUser());
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(true);
  });

  it("returns 403 when role not in allowed list", async () => {
    mockSession.mockResolvedValue(makeSession({ role: "Principal" }));
    mockFindUnique.mockResolvedValue(makeUser({ role: "Principal" }));
    const result = await requireRole(["SchoolOwner", "Bursar"]);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.code).toBe("FORBIDDEN");
    }
  });

  it("allows role that is in allowed list", async () => {
    mockSession.mockResolvedValue(makeSession({ role: "Bursar" }));
    mockFindUnique.mockResolvedValue(makeUser({ role: "Bursar" }));
    const result = await requireRole(["SchoolOwner", "Bursar"]);
    expect(result.authorized).toBe(true);
  });

  it("blocks unverified email when skipEmailVerification is false", async () => {
    mockSession.mockResolvedValue(makeSession({ emailVerified: false }));
    mockFindUnique.mockResolvedValue(makeUser({ emailVerified: false }));
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(body.code).toBe("EMAIL_UNVERIFIED");
    }
  });

  it("skips email verification when skipEmailVerification is true", async () => {
    mockSession.mockResolvedValue(makeSession({ emailVerified: false }));
    mockFindUnique.mockResolvedValue(makeUser({ emailVerified: false }));
    const result = await requireRole(["SchoolOwner"], { skipEmailVerification: true });
    expect(result.authorized).toBe(true);
  });

  it("returns 401 when user not found in DB", async () => {
    mockSession.mockResolvedValue(makeSession());
    mockFindUnique.mockResolvedValue(null);
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns authorized result with session and user data", async () => {
    mockSession.mockResolvedValue(makeSession());
    mockFindUnique.mockResolvedValue(makeUser());
    const result = await requireRole(["SchoolOwner"]);
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.session.userId).toBe("user-1");
      expect(result.user.role).toBe("SchoolOwner");
    }
  });
});
