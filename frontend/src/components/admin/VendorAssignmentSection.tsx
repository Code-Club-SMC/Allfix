import { useEffect, useState } from "react";
import { Field, Select } from "@/components/cb/Form";
import { useActiveVendors } from "@/hooks/useVendors";
import { useRemoveVendor } from "@/hooks/useAdmin";
import type { Vendor } from "@/lib/api";

interface VendorAssignmentSectionProps {
  requestId: string;
  /** Current vendor info if already assigned */
  vendorId?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  /** Called whenever vendor selection changes */
  onChange?: (vendorId: string) => void;
  /** Called when admin clears the vendor assignment */
  onClear?: () => void;
}

export const VendorAssignmentSection = ({
  requestId,
  vendorId,
  vendorName,
  vendorPhone,
  onChange,
  onClear,
}: VendorAssignmentSectionProps) => {
  const [selectedVendorId, setSelectedVendorId] = useState(vendorId || "");

  useEffect(() => {
    setSelectedVendorId(vendorId || "");
  }, [vendorId]);

  const { data: activeVendorsData } = useActiveVendors();
  const { mutate: removeVendor, isPending: isRemoving } = useRemoveVendor();

  // The active vendors endpoint returns { data: Vendor[] } or Vendor[]
  const activeVendors: Vendor[] =
    (activeVendorsData as any)?.data || (activeVendorsData as any) || [];

  const handleSelect = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    if (vendorId) {
      onChange?.(vendorId);
    }
  };

  const handleRemove = () => {
    removeVendor(requestId, {
      onSuccess: () => {
        setSelectedVendorId("");
        onClear?.();
      },
    });
  };

  return (
    <div className="space-y-3">
      {vendorId && (
        <div className="rounded-md border border-border bg-subtle p-3 space-y-1.5">
          <div className="text-[12px] font-semibold text-foreground">
            Currently Assigned
          </div>
          <div className="text-[13px] font-medium">{vendorName || "—"}</div>
          {vendorPhone && (
            <div className="text-[12px] text-muted-foreground">{vendorPhone}</div>
          )}
        </div>
      )}

      <Field label="Assign Vendor">
        <Select
          value={selectedVendorId}
          onChange={(e) => handleSelect(e.target.value)}
          className="h-9 text-[13px]"
        >
          <option value="">Select a vendor…</option>
          {activeVendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.contact_phone ? ` — ${v.contact_phone}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      {vendorId && (
        <button
          type="button"
          disabled={isRemoving}
          onClick={handleRemove}
          className="text-[12px] font-medium text-danger hover:underline"
        >
          {isRemoving ? "Removing…" : "Clear Vendor Assignment"}
        </button>
      )}
    </div>
  );
};

export default VendorAssignmentSection;
