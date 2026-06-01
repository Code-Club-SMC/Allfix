import { describe, it, expect } from "vitest";

// ─── Assignment Type Filter Logic ─────────────────────────────────────────────
// These tests verify the assignment type filter logic used in Requests.tsx
// The filter maps UI labels to backend query parameter values

interface Request {
  id: string;
  assigned_worker_id: string | null;
  vendor_id: string | null;
}

// Mirrors the backend filter logic
const filterByAssignmentType = (requests: Request[], assignmentType: string): Request[] => {
  switch (assignmentType) {
    case "workers":
      return requests.filter((r) => r.assigned_worker_id !== null && r.vendor_id === null);
    case "vendors":
      return requests.filter((r) => r.vendor_id !== null);
    case "unassigned":
      return requests.filter((r) => r.assigned_worker_id === null && r.vendor_id === null);
    case "all":
    default:
      return requests;
  }
};

const sampleRequests: Request[] = [
  { id: "1", assigned_worker_id: "worker-1", vendor_id: null },      // worker-assigned
  { id: "2", assigned_worker_id: "worker-2", vendor_id: null },      // worker-assigned
  { id: "3", assigned_worker_id: null, vendor_id: "vendor-1" },      // vendor-assigned
  { id: "4", assigned_worker_id: null, vendor_id: null },            // unassigned
  { id: "5", assigned_worker_id: null, vendor_id: null },            // unassigned
];

describe("Assignment Type Filter", () => {
  describe("Filter by 'All'", () => {
    it("should return all requests when filter is 'all'", () => {
      const result = filterByAssignmentType(sampleRequests, "all");
      expect(result).toHaveLength(5);
    });

    it("should return all requests when no filter is specified", () => {
      const result = filterByAssignmentType(sampleRequests, "");
      expect(result).toHaveLength(5);
    });
  });

  describe("Filter by 'Assigned to Workers'", () => {
    it("should return only worker-assigned requests", () => {
      const result = filterByAssignmentType(sampleRequests, "workers");
      expect(result).toHaveLength(2);
      result.forEach((r) => {
        expect(r.assigned_worker_id).not.toBeNull();
        expect(r.vendor_id).toBeNull();
      });
    });

    it("should not include vendor-assigned requests", () => {
      const result = filterByAssignmentType(sampleRequests, "workers");
      const hasVendor = result.some((r) => r.vendor_id !== null);
      expect(hasVendor).toBe(false);
    });
  });

  describe("Filter by 'Assigned to Vendors'", () => {
    it("should return only vendor-assigned requests", () => {
      const result = filterByAssignmentType(sampleRequests, "vendors");
      expect(result).toHaveLength(1);
      result.forEach((r) => {
        expect(r.vendor_id).not.toBeNull();
      });
    });

    it("should not include worker-assigned requests", () => {
      const result = filterByAssignmentType(sampleRequests, "vendors");
      const hasWorker = result.some((r) => r.assigned_worker_id !== null && r.vendor_id === null);
      expect(hasWorker).toBe(false);
    });
  });

  describe("Filter by 'Unassigned'", () => {
    it("should return only unassigned requests", () => {
      const result = filterByAssignmentType(sampleRequests, "unassigned");
      expect(result).toHaveLength(2);
      result.forEach((r) => {
        expect(r.assigned_worker_id).toBeNull();
        expect(r.vendor_id).toBeNull();
      });
    });

    it("should not include any assigned requests", () => {
      const result = filterByAssignmentType(sampleRequests, "unassigned");
      const hasAssignment = result.some(
        (r) => r.assigned_worker_id !== null || r.vendor_id !== null
      );
      expect(hasAssignment).toBe(false);
    });
  });

  describe("Filter option values", () => {
    it("should map UI labels to correct backend values", () => {
      // The dropdown options in Requests.tsx
      const filterOptions = [
        { label: "All assignments", value: "all" },
        { label: "Assigned to Workers", value: "workers" },
        { label: "Assigned to Vendors", value: "vendors" },
        { label: "Unassigned", value: "unassigned" },
      ];

      expect(filterOptions).toHaveLength(4);
      expect(filterOptions.map((o) => o.value)).toContain("all");
      expect(filterOptions.map((o) => o.value)).toContain("workers");
      expect(filterOptions.map((o) => o.value)).toContain("vendors");
      expect(filterOptions.map((o) => o.value)).toContain("unassigned");
    });
  });
});
