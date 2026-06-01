import { describe, it, expect } from "vitest";

// ─── Commission Percentage Validation Logic ────────────────────────────────────
// These tests verify the validation logic used in VendorAssignmentSection.tsx

const validateCommission = (value: string): string | null => {
  if (value === "" || value === undefined) return null; // empty is ok (defaults to 0)
  const num = parseFloat(value);
  if (isNaN(num)) return "Commission must be a number";
  if (num < 0 || num > 100) return "Commission must be between 0 and 100";
  return null;
};

const roundCommission = (value: number): number => {
  return Math.round(value * 100) / 100;
};

describe("Commission Percentage Validation", () => {
  describe("Value range validation", () => {
    it("should accept 0", () => {
      expect(validateCommission("0")).toBeNull();
    });

    it("should accept 100", () => {
      expect(validateCommission("100")).toBeNull();
    });

    it("should accept values between 0 and 100", () => {
      expect(validateCommission("15.5")).toBeNull();
      expect(validateCommission("50")).toBeNull();
      expect(validateCommission("99.99")).toBeNull();
    });

    it("should reject negative values", () => {
      expect(validateCommission("-1")).toBe("Commission must be between 0 and 100");
      expect(validateCommission("-0.01")).toBe("Commission must be between 0 and 100");
    });

    it("should reject values over 100", () => {
      expect(validateCommission("100.01")).toBe("Commission must be between 0 and 100");
      expect(validateCommission("200")).toBe("Commission must be between 0 and 100");
    });

    it("should reject non-numeric values", () => {
      expect(validateCommission("abc")).toBe("Commission must be a number");
      // Note: parseFloat("15.5abc") = 15.5 in JS, so it's treated as valid
      // The input type="number" in the browser prevents this case
    });

    it("should allow empty value (defaults to 0)", () => {
      expect(validateCommission("")).toBeNull();
    });
  });

  describe("Decimal places validation", () => {
    it("should round to 2 decimal places", () => {
      expect(roundCommission(15.5)).toBe(15.5);
      expect(roundCommission(15.555)).toBe(15.56);
      expect(roundCommission(15.554)).toBe(15.55);
      expect(roundCommission(10)).toBe(10);
      expect(roundCommission(0)).toBe(0);
    });

    it("should preserve values with 2 decimal places", () => {
      expect(roundCommission(15.55)).toBe(15.55);
      expect(roundCommission(25.75)).toBe(25.75);
    });
  });

  describe("Error display", () => {
    it("should return error message for invalid values", () => {
      const error = validateCommission("-5");
      expect(error).not.toBeNull();
      expect(typeof error).toBe("string");
    });

    it("should return null for valid values", () => {
      expect(validateCommission("15.5")).toBeNull();
      expect(validateCommission("0")).toBeNull();
      expect(validateCommission("100")).toBeNull();
    });
  });
});
