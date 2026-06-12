import { Star, ShoppingCart } from "lucide-react";
import type { Service } from "@/types/api";
import { useCartStore } from "@/state/cart";

interface ServiceCardProps {
	service: Service;
	categoryName: string;
	categoryId: string;
}

const PLACEHOLDER_IMAGES: Record<string, string> = {
	"ceiling fan installation": "https://images.unsplash.com/photo-1565183997392-2f6f122e5992?w=600&h=400&fit=crop",
	"ceiling fan": "https://images.unsplash.com/photo-1565183997392-2f6f122e5992?w=600&h=400&fit=crop",
	"fan": "https://images.unsplash.com/photo-1565183997392-2f6f122e5992?w=600&h=400&fit=crop",
	"smd lights installation": "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&h=400&fit=crop",
	"smd lights": "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&h=400&fit=crop",
	"lights": "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&h=400&fit=crop",
	"led tv mounting": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=400&fit=crop",
	"tv mounting": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=400&fit=crop",
	"tv": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=400&fit=crop",
	"ac repairing and gas filling": "https://images.unsplash.com/photo-1631545806609-3c480b8b2d1e?w=600&h=400&fit=crop",
	"ac repairing": "https://images.unsplash.com/photo-1631545806609-3c480b8b2d1e?w=600&h=400&fit=crop",
	"ac": "https://images.unsplash.com/photo-1631545806609-3c480b8b2d1e?w=600&h=400&fit=crop",
	"plumbing": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop",
	"plumber": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop",
	"electrician": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop",
	"electrical": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop",
	"painting": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop",
	"painter": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop",
	"carpentry": "https://images.unsplash.com/photo-1601058268499-e52658b8bb8d?w=600&h=400&fit=crop",
	"carpenter": "https://images.unsplash.com/photo-1601058268499-e52658b8bb8d?w=600&h=400&fit=crop",
	"cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop",
	"tile": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop",
	"ceiling": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop",
	"welding": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop",
	"welder": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop",
};

const DEFAULT_SERVICE_IMAGE = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop";

function getServiceImage(serviceName: string): string {
	const key = serviceName.toLowerCase().trim();
	// Try exact match first
	if (PLACEHOLDER_IMAGES[key]) {
		return PLACEHOLDER_IMAGES[key];
	}
	// Try partial match
	for (const [partial, url] of Object.entries(PLACEHOLDER_IMAGES)) {
		if (key.includes(partial) || partial.includes(key)) {
			return url;
		}
	}
	return DEFAULT_SERVICE_IMAGE;
}

function parsePrice(price: string | null | undefined): number {
	if (!price) return 0;
	const parsed = parseFloat(price);
	return isNaN(parsed) ? 0 : parsed;
}

export function ServiceCard({ service, categoryName, categoryId }: ServiceCardProps) {
	const addItem = useCartStore((state) => state.addItem);
	const items = useCartStore((state) => state.items);
	const isInCart = items.some((item) => item.serviceId === service.id);

	const price = parsePrice(service.price);
	const discountPercentage = service.discount_percentage || 0;
	const discountedPrice = price * (1 - discountPercentage / 100);
	const rating = service.rating ? parseFloat(service.rating) : 4.5;

	const imageUrl = service.image_url || getServiceImage(service.name);

	const handleAddToCart = () => {
		if (isInCart) return;
		addItem({
			serviceId: service.id,
			serviceName: service.name,
			categoryName,
			categoryId,
			price,
			discountPercentage,
		});
	};

	return (
		<div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-surface transition-all duration-300 hover:shadow-lg">
			{/* Image */}
			<div className="relative aspect-[4/3] overflow-hidden bg-subtle">
				<img
					src={imageUrl}
					alt={service.name}
					className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
					loading="lazy"
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						target.src = DEFAULT_SERVICE_IMAGE;
					}}
				/>
				{discountPercentage > 0 && (
					<div className="absolute top-3 right-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
						{discountPercentage}% OFF
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-5">
				<h3 className="text-base font-semibold text-foreground">
					{service.name}
				</h3>
				<p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
					{service.description}
				</p>

				{/* Rating */}
				<div className="mt-3 flex items-center gap-1.5">
					<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
					<span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
					<span className="text-xs text-muted-foreground">· Verified pros</span>
				</div>

				{/* Price */}
				<div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
					<div>
						{discountPercentage > 0 && (
							<div className="text-xs text-muted-foreground line-through">
								Rs {price.toLocaleString()}
							</div>
						)}
						<div className="text-lg font-bold text-primary">
							Rs {discountedPrice.toLocaleString()}
						</div>
					</div>

					<button
						onClick={handleAddToCart}
						disabled={isInCart}
						className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all ${
							isInCart
								? "bg-green-100 text-green-700 cursor-default"
								: "bg-primary text-primary-foreground hover:bg-primary/90"
						}`}
					>
						<ShoppingCart className="h-4 w-4" />
						{isInCart ? "Added" : "Add"}
					</button>
				</div>

				{/* Terms & Conditions */}
				<div className="mt-3 border-t border-border/30 pt-3">
					<details className="group/terms">
						<summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
							Terms & Conditions
						</summary>
						<p className="mt-2 text-xs text-muted-foreground">
							Standard service terms apply. Pricing may vary based on job complexity.
							Additional charges may apply for parts and materials.
						</p>
					</details>
				</div>
			</div>
		</div>
	);
}
