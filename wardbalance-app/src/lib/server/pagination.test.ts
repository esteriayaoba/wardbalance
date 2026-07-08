import { describe, it, expect } from "vitest";
import {
  parsePagination,
  createPaginationMeta,
  paginatedJsonResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "./pagination";

describe("pagination helper", () => {
  describe("parsePagination", () => {
    it("parses valid limit and offset correctly", () => {
      const searchParams = new URLSearchParams("limit=50&offset=100");
      const result = parsePagination(searchParams);
      expect(result).toEqual({ limit: 50, offset: 100 });
    });

    it("falls back to DEFAULT_LIMIT when limit is missing", () => {
      const searchParams = new URLSearchParams("offset=100");
      const result = parsePagination(searchParams);
      expect(result).toEqual({ limit: DEFAULT_LIMIT, offset: 100 });
    });

    it("caps limit at MAX_LIMIT", () => {
      const searchParams = new URLSearchParams("limit=1000");
      const result = parsePagination(searchParams);
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it("uses overrides for default limit and max limit", () => {
      const searchParamsEmpty = new URLSearchParams("");
      const resultEmpty = parsePagination(searchParamsEmpty, { defaultLimit: 10, maxLimit: 20 });
      expect(resultEmpty).toEqual({ limit: 10, offset: 0 });

      const searchParamsHuge = new URLSearchParams("limit=100");
      const resultHuge = parsePagination(searchParamsHuge, { defaultLimit: 10, maxLimit: 20 });
      expect(resultHuge.limit).toBe(20);
    });

    it("forces negative offset to zero", () => {
      const searchParams = new URLSearchParams("offset=-50");
      const result = parsePagination(searchParams);
      expect(result.offset).toBe(0);
    });

    it("defaults offset to zero when missing or invalid", () => {
      const searchParams = new URLSearchParams("offset=invalid");
      const result = parsePagination(searchParams);
      expect(result.offset).toBe(0);
    });
  });

  describe("createPaginationMeta", () => {
    it("returns correct metadata structure", () => {
      const result = createPaginationMeta(1000, 200, 400);
      expect(result).toEqual({
        total: 1000,
        limit: 200,
        offset: 400,
      });
    });
  });

  describe("paginatedJsonResponse", () => {
    it("wraps data and metadata together", () => {
      const mockData = ["item1", "item2"];
      const result = paginatedJsonResponse(mockData, 10, 2, 0);
      expect(result).toEqual({
        data: mockData,
        meta: {
          total: 10,
          limit: 2,
          offset: 0,
        },
      });
    });
  });
});
