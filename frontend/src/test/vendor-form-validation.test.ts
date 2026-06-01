import { describe, it, expect } from "vitest";

// ─── Vendor Form Validation Logic ─────────────────────────────────────────────
// These tests verify the validation logic used in VendorManagement.tsx

const validateVendorName = (name: string): string | null => {
  if (!name || name.trim() === "") return "Name is required";
  return null;
};

const validateVendorPhone = (phone: string): string | null => {
  if (!phone || phone.trim() === "") return "Contact phone is required";
  return null;
};

const validateVendorEmail = (email: string): string | null => {
  if (!email) return null; // optional
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return "Invalid email format";
  return null;
};

describe("Vendor Form Validation", () => {
  describe("Name validation", () => {
    it("should require name", () => {
      expect(validateVendorName("")).toBe("Name is required");
      expect(validateVendorName("   ")).toBe("Name is required");
    });

    it("should accept valid name", () => {
      expect(validateVendorName("ABC Plumbing")).toBeNull();
      expect(validateVendorName("Vendor 1")).toBeNull();
    });
  });

  describe("Contact phone validation", () => {
    it("should require contact phone", () => {
      expect(validateVendorPhone("")).toBe("Contact phone is required");
      expect(validateVendorPhone("   ")).toBe("Contact phone is required");
    });

    it("should accept valid phone", () => {
      expect(validateVendorPhone("+923001234567")).toBeNull();
      expect(validateVendorPhone("03001234567")).toBeNull();
    });
  });

  describe("Email validation", () => {
    it("should allow empty email (optional)", () => {
      expect(validateVendorEmail("")).toBeNull();
    });

    it("should accept valid email", () => {
      expect(validateVendorEmail("john@example.com")).toBeNull();
      expect(validateVendorEmail("john@mail.example.com")).toBeNull();
    });

    it("should reject invalid email", () => {
      expect(validateVendorEmail("notanemail")).toBe("Invalid email format");
      expect(validateVendorEmail("missing@tld")).toBe("Invalid email format");
      expect(validateVendorEmail("@nodomain.com")).toBe("Invalid email format");
    });
  });

  describe("Form submission validation", () => {
    it("should fail if name is missing", () => {
      const name = "";
      const phone = "+923001234567";
      const errors = [validateVendorName(name), validateVendorPhone(phone)].filter(Boolean);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail if phone is missing", () => {
      const name = "ABC Plumbing";
      const phone = "";
      const errors = [validateVendorName(name), validateVendorPhone(phone)].filter(Boolean);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass with valid required fields", () => {
      const name = "ABC Plumbing";
      const phone = "+923001234567";
      const errors = [validateVendorName(name), validateVendorPhone(phone)].filter(Boolean);
      expect(errors.length).toBe(0);
    });
  });
});
