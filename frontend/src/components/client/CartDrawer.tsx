import { X, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore, computeTotal, computeItemCount } from "@/state/cart";

interface CartDrawerProps {
	onCheckout: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
	const items = useCartStore((state) => state.items);
	const isOpen = useCartStore((state) => state.isOpen);
	const closeCart = useCartStore((state) => state.closeCart);
	const removeItem = useCartStore((state) => state.removeItem);
	const clearCart = useCartStore((state) => state.clearCart);
	const total = computeTotal(items);
	const itemCount = computeItemCount(items);

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
				onClick={closeCart}
			/>

			{/* Drawer */}
			<div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border px-6 py-4">
					<div className="flex items-center gap-2">
						<ShoppingBag className="h-5 w-5 text-primary" />
						<h2 className="text-lg font-semibold text-foreground">
							Selected Services ({itemCount})
						</h2>
					</div>
					<button
						onClick={closeCart}
						className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Items */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					{items.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
							<p className="mt-4 text-sm text-muted-foreground">
								No services selected
							</p>
							<p className="mt-1 text-xs text-muted-foreground/60">
								Add services to get started
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{items.map((item) => {
								const discountedPrice =
									item.price * (1 - item.discountPercentage / 100);
								return (
									<div
										key={item.serviceId}
										className="flex items-center justify-between rounded-xl border border-border/50 bg-surface p-4"
									>
										<div className="min-w-0 flex-1">
											<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												{item.categoryName}
											</div>
											<h3 className="mt-1 text-sm font-semibold text-foreground">
												{item.serviceName}
											</h3>
										</div>
										<button
											onClick={() => removeItem(item.serviceId)}
											className="ml-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				{items.length > 0 && (
					<div className="border-t border-border px-6 py-4">
						<button
							onClick={onCheckout}
							className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
						>
							Proceed to Booking
						</button>
						<button
							onClick={clearCart}
							className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
						>
							Clear all
						</button>
					</div>
				)}
			</div>
		</>
	);
}
