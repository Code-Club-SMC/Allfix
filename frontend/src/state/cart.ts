import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
	serviceId: string;
	serviceName: string;
	categoryName: string;
	categoryId: string;
	price: number;
	discountPercentage: number;
}

interface CartStore {
	items: CartItem[];
	isOpen: boolean;
	addItem: (item: CartItem) => void;
	removeItem: (serviceId: string) => void;
	clearCart: () => void;
	toggleCart: () => void;
	closeCart: () => void;
}

export function computeTotal(items: CartItem[]): number {
	return items.reduce((sum, item) => {
		const discountedPrice = item.price * (1 - item.discountPercentage / 100);
		return sum + discountedPrice;
	}, 0);
}

export function computeItemCount(items: CartItem[]): number {
	return items.length;
}

export const useCartStore = create<CartStore>()(
	persist(
		(set, get) => ({
			items: [],
			isOpen: false,

			addItem: (item) => {
				const state = get();
				if (state.items.some((i) => i.serviceId === item.serviceId)) return;
				set({ items: [...state.items, item] });
			},

			removeItem: (serviceId) => {
				const state = get();
				set({ items: state.items.filter((i) => i.serviceId !== serviceId) });
			},

			clearCart: () => set({ items: [] }),

			toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

			closeCart: () => set({ isOpen: false }),
		}),
		{
			name: "allfix-cart",
		},
	),
);
