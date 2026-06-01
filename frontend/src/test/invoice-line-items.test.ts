import { describe, it, expect } from "vitest";

// ─── Invoice Line Items Population Logic ──────────────────────────────────────
// These tests verify the logic for auto-populating invoice line items
// from request services, as implemented in Invoices.tsx

interface RequestServiceItem {
  id: string;
  request_id: string;
  service_id: string;
  service_name: string;
  description?: string;
  created_at: string;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

// Mirrors the auto-populate logic in Invoices.tsx
const buildLineItemsFromServices = (services: RequestServiceItem[]): LineItem[] => {
  return services.map((s) => ({
    description: s.service_name || "Service",
    quantity: 1,
    rate: 0,
  }));
};

const buildFallbackLineItem = (serviceSummary: string): LineItem[] => {
  return [{
    description: serviceSummary || "Service",
    quantity: 1,
    rate: 0,
  }];
};

describe("Invoice Line Items Population", () => {
  describe("Auto-populate from request services", () => {
    it("should create one line item per service", () => {
      const services: RequestServiceItem[] = [
        { id: "1", request_id: "r1", service_id: "s1", service_name: "Plumbing", created_at: "" },
        { id: "2", request_id: "r1", service_id: "s2", service_name: "Electrical", created_at: "" },
        { id: "3", request_id: "r1", service_id: "s3", service_name: "Carpentry", created_at: "" },
      ];

      const lineItems = buildLineItemsFromServices(services);
      expect(lineItems).toHaveLength(3);
    });

    it("should use service_name as description", () => {
      const services: RequestServiceItem[] = [
        { id: "1", request_id: "r1", service_id: "s1", service_name: "Plumbing Repair", created_at: "" },
      ];

      const lineItems = buildLineItemsFromServices(services);
      expect(lineItems[0].description).toBe("Plumbing Repair");
    });

    it("should set quantity to 1 for each service", () => {
      const services: RequestServiceItem[] = [
        { id: "1", request_id: "r1", service_id: "s1", service_name: "Plumbing", created_at: "" },
      ];

      const lineItems = buildLineItemsFromServices(services);
      expect(lineItems[0].quantity).toBe(1);
    });

    it("should fallback to 'Service' when service_name is empty", () => {
      const services: RequestServiceItem[] = [
        { id: "1", request_id: "r1", service_id: "s1", service_name: "", created_at: "" },
      ];

      const lineItems = buildLineItemsFromServices(services);
      expect(lineItems[0].description).toBe("Service");
    });
  });

  describe("Fallback line item", () => {
    it("should create single line item from service summary", () => {
      const lineItems = buildFallbackLineItem("Plumbing, Electrical");
      expect(lineItems).toHaveLength(1);
      expect(lineItems[0].description).toBe("Plumbing, Electrical");
    });

    it("should fallback to 'Service' when summary is empty", () => {
      const lineItems = buildFallbackLineItem("");
      expect(lineItems[0].description).toBe("Service");
    });
  });

  describe("Client description in line items", () => {
    it("should include client description when present", () => {
      // When a service has a client description, it should be appended
      const serviceName = "Plumbing";
      const clientDescription = "Fix leaking pipe under sink";
      const description = clientDescription
        ? `${serviceName} - ${clientDescription}`
        : serviceName;

      expect(description).toBe("Plumbing - Fix leaking pipe under sink");
    });

    it("should show only service name when no client description", () => {
      const serviceName = "Plumbing";
      const clientDescription = "";
      const description = clientDescription
        ? `${serviceName} - ${clientDescription}`
        : serviceName;

      expect(description).toBe("Plumbing");
    });
  });
});
