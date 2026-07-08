import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  parentWardLink: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { resolveParentId } = await import("./resolve-parent");

describe("resolveParentId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves primary parent first if exists", async () => {
    mockPrisma.parentWardLink.findFirst.mockResolvedValueOnce({ parentId: "parent-primary" });

    const result = await resolveParentId("school-1", "student-1");

    expect(result).toBe("parent-primary");
    expect(mockPrisma.parentWardLink.findFirst).toHaveBeenCalledWith({
      where: { studentId: "student-1", schoolId: "school-1", isPrimaryContact: true },
    });
  });

  it("falls back to any parent if primary contact does not exist", async () => {
    // First query for primary contact returns null
    mockPrisma.parentWardLink.findFirst.mockResolvedValueOnce(null);
    // Second query for any link returns a parent id
    mockPrisma.parentWardLink.findFirst.mockResolvedValueOnce({ parentId: "parent-any" });

    const result = await resolveParentId("school-1", "student-1");

    expect(result).toBe("parent-any");
    expect(mockPrisma.parentWardLink.findFirst).toHaveBeenCalledTimes(2);
  });

  it("returns null if no parent links exist", async () => {
    mockPrisma.parentWardLink.findFirst.mockResolvedValueOnce(null);
    mockPrisma.parentWardLink.findFirst.mockResolvedValueOnce(null);

    const result = await resolveParentId("school-1", "student-1");

    expect(result).toBeNull();
    expect(mockPrisma.parentWardLink.findFirst).toHaveBeenCalledTimes(2);
  });
});
