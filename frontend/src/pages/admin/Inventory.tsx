import { useMemo, useState } from "react";
import { Plus, Rows3, Layers, Loader2, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/cb/PageHeader";
import { Card } from "@/components/cb/Tabs";
import { Button, Field, TextInput, Select } from "@/components/cb/Form";
import { SideDrawer } from "@/components/cb/Overlays";
import {
  useAdminInventory,
  useAdminWorkers,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

// DB CHECK constraint values for inventory.category
const CATEGORIES = [
  { value: "power_tools",       label: "Power Tools" },
  { value: "hand_tools",        label: "Hand Tools" },
  { value: "consumables",       label: "Consumables" },
  { value: "safety_equipment",  label: "Safety Equipment" },
];

const CONDITIONS = [
  { value: "new",          label: "New" },
  { value: "good",         label: "Good" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "retired",      label: "Retired" },
];

const UNITS = ["pcs", "sets", "boxes", "bottles", "rolls", "kg", "liters"];

const condStyle = (c: string) => {
  switch (c) {
    case "new":          return "bg-success/10 text-success";
    case "good":         return "bg-info/10 text-info";
    case "needs_repair": return "bg-warning/10 text-warning";
    case "retired":      return "bg-muted text-muted-foreground line-through";
    default:             return "bg-muted text-muted-foreground";
  }
};

const fmtLabel = (val: string, list: { value: string; label: string }[]) =>
  list.find((x) => x.value === val)?.label ?? val;

const blankForm = () => ({
  name: "",
  category: "hand_tools",
  quantity: "1",
  unit: "pcs",
  condition: "new",
  assignedWorkerId: "",
  purchaseDate: "",
  cost: "",
  lowStockThreshold: "2",
});

const Inventory = () => {
  const [view, setView] = useState<"table" | "group">("table");
  const [drawer, setDrawer] = useState<"closed" | "add" | "edit">("closed");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: inventoryData, isLoading } = useAdminInventory();
  const { data: workers } = useAdminWorkers();
  const { mutate: createItem, isPending: creating } = useCreateInventoryItem();
  const { mutate: updateItem, isPending: updating } = useUpdateInventoryItem();
  const { mutate: deleteItem } = useDeleteInventoryItem();

  const inventory: any[] = (inventoryData as any[]) || [];
  const activeWorkers: any[] = ((workers as any[]) || []).filter((w) => w.status === "active");
  const isSaving = creating || updating;

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    inventory.forEach((it) => {
      const key = fmtLabel(it.category, CATEGORIES);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries());
  }, [inventory]);

  const openAdd = () => {
    setForm(blankForm());
    setEditId(null);
    setDrawer("add");
  };

  const openEdit = (it: any) => {
    setForm({
      name: it.name || "",
      category: it.category || "hand_tools",
      quantity: String(it.quantity ?? 1),
      unit: it.unit || "pcs",
      condition: it.condition || "new",
      assignedWorkerId: it.assigned_worker_id?.valid ? it.assigned_worker_id.bytes : "",
      purchaseDate: it.purchase_date?.valid
        ? new Date(it.purchase_date.time).toISOString().split("T")[0]
        : "",
      cost: it.cost?.valid ? String(it.cost.int) : "",
      lowStockThreshold: String(it.low_stock_threshold ?? 2),
    });
    setEditId(it.id);
    setDrawer("edit");
  };

  const closeDrawer = () => {
    setDrawer("closed");
    setEditId(null);
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      name: form.name,
      category: form.category,
      quantity: parseInt(form.quantity) || 1,
      unit: form.unit,
      condition: form.condition,
      assignedWorkerId: form.assignedWorkerId || undefined,
      purchaseDate: form.purchaseDate || undefined,
      cost: form.cost || undefined,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 2,
    };

    if (drawer === "add") {
      createItem(payload, { onSuccess: closeDrawer });
    } else if (editId) {
      updateItem({ id: editId, ...payload }, { onSuccess: closeDrawer });
    }
  };

  const handleDelete = (id: string) => {
    deleteItem(id, { onSuccess: () => setDeleteConfirm(null) });
  };

  const f = (key: keyof typeof form, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const renderRow = (it: any) => {
    const qty = Number(it.quantity || 0);
    const low = qty <= Number(it.low_stock_threshold || 2);
    return (
      <tr key={it.id} className="border-b border-border/60 text-[12.5px] last:border-0 hover:bg-subtle/70">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {low && <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" title="Low stock" />}
            <span className="font-medium">{it.name}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-muted-foreground">{fmtLabel(it.category, CATEGORIES)}</td>
        <td className="px-3 py-2">{qty}</td>
        <td className="px-3 py-2 text-muted-foreground">{it.unit}</td>
        <td className="px-3 py-2">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", condStyle(it.condition))}>
            {fmtLabel(it.condition, CONDITIONS)}
          </span>
        </td>
        <td className="px-3 py-2 text-muted-foreground">{it.worker_name || "—"}</td>
        <td className="px-3 py-2 text-muted-foreground">{new Date(it.updated_at).toLocaleDateString()}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(it)} className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
              <Pencil className="h-3 w-3" /> Edit
            </button>
            {deleteConfirm === it.id ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-danger">Delete?</span>
                <button onClick={() => handleDelete(it.id)} className="text-[11px] font-semibold text-danger hover:underline">Yes</button>
                <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-muted-foreground hover:underline">No</button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(it.id)} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-danger">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const tableHead = (
    <tr className="border-b border-border text-left">
      {["Item", "Category", "Qty", "Unit", "Condition", "Assigned To", "Updated", "Actions"].map((h) => (
        <th key={h} className="cb-label px-3 py-2">{h}</th>
      ))}
    </tr>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Tools & Equipment"
        subtitle={isLoading ? "Loading…" : `${inventory.length} item${inventory.length !== 1 ? "s" : ""} tracked`}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border bg-surface p-0.5">
              <button
                onClick={() => setView("table")}
                className={cn("flex h-7 w-7 items-center justify-center rounded-[5px]", view === "table" ? "bg-subtle text-foreground" : "text-muted-foreground")}
                title="Table view"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("group")}
                className={cn("flex h-7 w-7 items-center justify-center rounded-[5px]", view === "group" ? "bg-subtle text-foreground" : "text-muted-foreground")}
                title="Group by category"
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button onClick={openAdd}><Plus className="h-3.5 w-3.5" />Add Item</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : view === "table" ? (
        <Card>
          <table className="w-full">
            <thead>{tableHead}</thead>
            <tbody>
              {inventory.map(renderRow)}
              {inventory.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-[13px] text-muted-foreground">No items yet. Add your first tool or piece of equipment.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.length === 0 ? (
            <Card><div className="py-12 text-center text-[13px] text-muted-foreground">No items yet.</div></Card>
          ) : (
            grouped.map(([cat, items]) => (
              <Card key={cat}>
                <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                  <h2 className="cb-section">{cat}</h2>
                  <span className="text-[12px] text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                </div>
                <table className="w-full">
                  <thead>{tableHead}</thead>
                  <tbody>{items.map(renderRow)}</tbody>
                </table>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Add / Edit Drawer ── */}
      <SideDrawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Edit Item" : "Add Item"}
        width={440}
        footer={
          <>
            <Button variant="outline" onClick={closeDrawer}>Cancel</Button>
            <Button disabled={isSaving || !form.name.trim()} onClick={handleSave}>
              {isSaving ? "Saving…" : drawer === "edit" ? "Save Changes" : "Add Item"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Item name">
            <TextInput
              value={form.name}
              onChange={(e) => f("name", e.target.value)}
              placeholder="e.g. Cordless Drill 18V"
            />
          </Field>

          <Field label="Category">
            <Select value={form.category} onChange={(e) => f("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <TextInput
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => f("quantity", e.target.value)}
              />
            </Field>
            <Field label="Unit">
              <Select value={form.unit} onChange={(e) => f("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Condition">
            <Select value={form.condition} onChange={(e) => f("condition", e.target.value)}>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Assigned to">
            <Select value={form.assignedWorkerId} onChange={(e) => f("assignedWorkerId", e.target.value)}>
              <option value="">— Unassigned —</option>
              {activeWorkers.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase date">
              <TextInput
                type="date"
                value={form.purchaseDate}
                onChange={(e) => f("purchaseDate", e.target.value)}
              />
            </Field>
            <Field label="Cost (PKR)">
              <TextInput
                type="number"
                min="0"
                placeholder="0"
                value={form.cost}
                onChange={(e) => f("cost", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Low stock alert threshold">
            <TextInput
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(e) => f("lowStockThreshold", e.target.value)}
            />
          </Field>
        </div>
      </SideDrawer>
    </div>
  );
};

export default Inventory;
