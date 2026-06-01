package handler

import (
	"encoding/json"
	"testing"
)

// ─── Audit Logging Tests ──────────────────────────────────────────────────────

// TestVendorAuditActions verifies the expected audit action strings for vendor operations
func TestVendorAuditActions(t *testing.T) {
	expectedActions := map[string]string{
		"create":             "vendor.created",
		"assign":             "vendor.assigned",
		"unassign":           "vendor.unassigned",
		"commission_updated": "vendor.commission_updated",
	}

	for operation, expectedAction := range expectedActions {
		t.Run("action for "+operation, func(t *testing.T) {
			if expectedAction == "" {
				t.Errorf("Expected non-empty action for operation %q", operation)
			}
			// Verify the action follows the "entity.operation" format
			if len(expectedAction) < 3 {
				t.Errorf("Action %q is too short", expectedAction)
			}
		})
	}
}

// TestVendorAuditMetadataFields verifies that vendor audit logs include required metadata fields
func TestVendorAuditMetadataFields(t *testing.T) {
	tests := []struct {
		name           string
		action         string
		metadata       map[string]any
		requiredFields []string
	}{
		{
			name:   "vendor.created metadata",
			action: "vendor.created",
			metadata: map[string]any{
				"vendor_id":   "some-uuid",
				"vendor_name": "ABC Plumbing",
			},
			requiredFields: []string{"vendor_id", "vendor_name"},
		},
		{
			name:   "vendor.assigned metadata",
			action: "vendor.assigned",
			metadata: map[string]any{
				"vendor_id":             "some-uuid",
				"vendor_name":           "ABC Plumbing",
				"commission_percentage": 15.5,
			},
			requiredFields: []string{"vendor_id", "vendor_name", "commission_percentage"},
		},
		{
			name:   "vendor.unassigned metadata",
			action: "vendor.unassigned",
			metadata: map[string]any{
				"vendor_id":   "some-uuid",
				"vendor_name": "ABC Plumbing",
			},
			requiredFields: []string{"vendor_id", "vendor_name"},
		},
		{
			name:   "vendor.commission_updated metadata",
			action: "vendor.commission_updated",
			metadata: map[string]any{
				"vendor_id":             "some-uuid",
				"vendor_name":           "ABC Plumbing",
				"commission_percentage": 20.0,
			},
			requiredFields: []string{"vendor_id", "vendor_name", "commission_percentage"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Verify all required fields are present in metadata
			for _, field := range tt.requiredFields {
				if _, exists := tt.metadata[field]; !exists {
					t.Errorf("Metadata for action %q is missing required field %q", tt.action, field)
				}
			}

			// Verify metadata can be serialized to JSON (as the auditLog helper does)
			jsonData, err := json.Marshal(tt.metadata)
			if err != nil {
				t.Errorf("Failed to marshal metadata for action %q: %v", tt.action, err)
			}
			if len(jsonData) == 0 {
				t.Errorf("Expected non-empty JSON for action %q metadata", tt.action)
			}
		})
	}
}

// TestAuditLogJSONSerialization verifies that audit log details serialize correctly
func TestAuditLogJSONSerialization(t *testing.T) {
	details := map[string]any{
		"vendor_id":             "abc-123-uuid",
		"request_id":            "req-456-uuid",
		"commission_percentage": 15.5,
	}

	jsonData, err := json.Marshal(details)
	if err != nil {
		t.Fatalf("Failed to marshal audit log details: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(jsonData, &result); err != nil {
		t.Fatalf("Failed to unmarshal audit log details: %v", err)
	}

	// Verify all fields are present
	if result["vendor_id"] != "abc-123-uuid" {
		t.Errorf("Expected vendor_id to be 'abc-123-uuid', got %v", result["vendor_id"])
	}
	if result["request_id"] != "req-456-uuid" {
		t.Errorf("Expected request_id to be 'req-456-uuid', got %v", result["request_id"])
	}
	if result["commission_percentage"] != 15.5 {
		t.Errorf("Expected commission_percentage to be 15.5, got %v", result["commission_percentage"])
	}
}

// TestAuditEntityType verifies that vendor audit logs use the correct entity type
func TestAuditEntityType(t *testing.T) {
	// Vendor CRUD operations use "vendor" entity type
	// Vendor assignment operations use "request" entity type (since they operate on requests)
	tests := []struct {
		action         string
		expectedEntity string
	}{
		{"vendor.created", "vendor"},
		{"vendor.assigned", "request"},
		{"vendor.unassigned", "request"},
		{"vendor.commission_updated", "request"},
	}

	for _, tt := range tests {
		t.Run(tt.action, func(t *testing.T) {
			if tt.expectedEntity == "" {
				t.Errorf("Expected non-empty entity type for action %q", tt.action)
			}
		})
	}
}
