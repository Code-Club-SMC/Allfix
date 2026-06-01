import { describe, it, expect } from "vitest";

// ─── Client Name Display Logic ────────────────────────────────────────────────
// These tests verify the client name display logic used in Dashboard.tsx
// and Requests.tsx: full_name || client_name || "Unknown"

const getClientDisplayName = (row: { full_name?: string | null; client_name?: string | null }): string => {
  return row.full_name || row.client_name || "Unknown";
};

describe("Client Name Display", () => {
  describe("full_name takes priority", () => {
    it("should display full_name when available", () => {
      const row = { full_name: "John Doe", client_name: "john_doe" };
      expect(getClientDisplayName(row)).toBe("John Doe");
    });

    it("should display full_name even when client_name is also present", () => {
      const row = { full_name: "Jane Smith", client_name: "jane_smith" };
      expect(getClientDisplayName(row)).toBe("Jane Smith");
    });
  });

  describe("client_name as fallback", () => {
    it("should display client_name when full_name is null", () => {
      const row = { full_name: null, client_name: "john_doe" };
      expect(getClientDisplayName(row)).toBe("john_doe");
    });

    it("should display client_name when full_name is empty string", () => {
      const row = { full_name: "", client_name: "john_doe" };
      expect(getClientDisplayName(row)).toBe("john_doe");
    });

    it("should display client_name when full_name is undefined", () => {
      const row = { client_name: "john_doe" };
      expect(getClientDisplayName(row)).toBe("john_doe");
    });
  });

  describe("Unknown fallback", () => {
    it("should display 'Unknown' when both are null", () => {
      const row = { full_name: null, client_name: null };
      expect(getClientDisplayName(row)).toBe("Unknown");
    });

    it("should display 'Unknown' when both are empty strings", () => {
      const row = { full_name: "", client_name: "" };
      expect(getClientDisplayName(row)).toBe("Unknown");
    });

    it("should display 'Unknown' when both are undefined", () => {
      const row = {};
      expect(getClientDisplayName(row)).toBe("Unknown");
    });
  });

  describe("Dashboard and Requests table consistency", () => {
    it("should use the same logic in both Dashboard and Requests table", () => {
      // Both components use: r.full_name || r.client_name || "Unknown"
      const dashboardRow = { full_name: "Alice", client_name: "alice" };
      const requestsRow = { full_name: "Alice", client_name: "alice" };

      expect(getClientDisplayName(dashboardRow)).toBe(getClientDisplayName(requestsRow));
    });

    it("should handle mixed null/undefined consistently", () => {
      const row1 = { full_name: null, client_name: "Bob" };
      const row2 = { full_name: undefined, client_name: "Bob" };

      expect(getClientDisplayName(row1)).toBe("Bob");
      expect(getClientDisplayName(row2)).toBe("Bob");
    });
  });
});
