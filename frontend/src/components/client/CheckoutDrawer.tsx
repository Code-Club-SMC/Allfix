import { useState } from "react";
import { X, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCartStore, computeTotal, computeItemCount } from "@/state/cart";
import { useCreateRequest } from "@/hooks/useRequests";

interface CheckoutDrawerProps {
	onBack: () => void;
	onSuccess: (requestNumber: string) => void;
}

export function CheckoutDrawer({ onBack, onSuccess }: CheckoutDrawerProps) {
	const items = useCartStore((state) => state.items);
	const closeCart = useCartStore((state) => state.closeCart);
	const clearCart = useCartStore((state) => state.clearCart);
	const total = computeTotal(items);
	const itemCount = computeItemCount(items);

	const [form, setForm] = useState({
		fullName: "",
		phone: "",
		address: "",
		notes: "",
	});

	const { mutate: createRequest, isPending } = useCreateRequest();

	const handleSubmit = () => {
		if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim()) {
			toast.error("Please fill in all required fields");
			return;
		}

		const serviceIds = items.map((item) => item.serviceId);

		createRequest(
			{
				serviceIds,
				description: form.notes,
				preferredDate: new Date().toISOString().split("T")[0],
				preferredTime: "10:00",
				urgency: "standard",
				fullName: form.fullName,
				phone: form.phone,
				email: "",
				address: form.address,
				city: "Islamabad",
				area: "",
			},
			{
				onSuccess: (data) => {
					onSuccess(data.request_number);
					clearCart();
					closeCart();
				},
			},
		);
	};

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
				onClick={onBack}
			/>

			{/* Drawer */}
			<div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border px-6 py-4">
					<div className="flex items-center gap-2">
						<ShoppingBag className="h-5 w-5 text-primary" />
						<h2 className="text-lg font-semibold text-foreground">Checkout</h2>
					</div>
					<button
						onClick={onBack}
						className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Form */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-sm font-medium text-foreground">
								Full Name
							</label>
							<input
								type="text"
								value={form.fullName}
								onChange={(e) => setForm({ ...form, fullName: e.target.value })}
								placeholder="Your name"
								className="w-full rounded-lg border border-border/50 bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
						</div>

						<div>
							<label className="mb-1.5 block text-sm font-medium text-foreground">
								Phone
							</label>
							<input
								type="tel"
								value={form.phone}
								onChange={(e) => setForm({ ...form, phone: e.target.value })}
								placeholder="03XX XXXXXXX"
								className="w-full rounded-lg border border-border/50 bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
						</div>

						<div>
							<label className="mb-1.5 block text-sm font-medium text-foreground">
								Address
							</label>
							<textarea
								value={form.address}
								onChange={(e) => setForm({ ...form, address: e.target.value })}
								placeholder="House #, Street, Area, City"
								rows={3}
								className="w-full rounded-lg border border-border/50 bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
						</div>

						<div>
							<label className="mb-1.5 block text-sm font-medium text-foreground">
								Notes (optional)
							</label>
							<textarea
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								placeholder="Any special instructions..."
								rows={3}
								className="w-full rounded-lg border border-border/50 bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-border px-6 py-4">
					<div className="mb-4 flex items-center justify-between rounded-lg bg-subtle/50 px-4 py-3">
						<span className="text-sm font-medium text-foreground">
							Total ({itemCount} item{itemCount !== 1 ? "s" : ""})
						</span>
						<span className="text-lg font-bold text-primary">
							Rs {total.toLocaleString()}
						</span>
					</div>
					<button
						onClick={handleSubmit}
						disabled={isPending}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
					>
						{isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Submitting...
							</>
						) : (
							"Submit Order"
						)}
					</button>
					<button
						onClick={onBack}
						className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
					>
						← Back to cart
					</button>
				</div>
			</div>
		</>
	);
}
