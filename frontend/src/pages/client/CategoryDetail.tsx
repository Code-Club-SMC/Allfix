import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { useCategoryDetail } from "@/hooks/useCategories";
import { ServiceCard } from "@/components/client/ServiceCard";
import { useCartStore, computeItemCount } from "@/state/cart";
import { CartDrawer } from "@/components/client/CartDrawer";

const PLACEHOLDER_IMAGES: Record<string, string> = {
	"ac services": "https://images.unsplash.com/photo-1631545806609-3c480b8b2d1e?w=1200&h=400&fit=crop",
	"plumber services": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&h=400&fit=crop",
	"electrician services": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&h=400&fit=crop",
	"solar panel cleaning": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=400&fit=crop",
	"water tank cleaning": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=400&fit=crop",
	"handyman services": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop",
	"painter services": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&h=400&fit=crop",
	"home appliances": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1200&h=400&fit=crop",
};

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop";

function getCategoryHeroImage(categoryName: string): string {
	const key = categoryName.toLowerCase().trim();
	return PLACEHOLDER_IMAGES[key] || DEFAULT_HERO_IMAGE;
}

export default function CategoryDetail() {
	const { id } = useParams<{ id: string }>();
	const { data, isLoading, isError } = useCategoryDetail(id || null);
	const toggleCart = useCartStore((state) => state.toggleCart);
	const items = useCartStore((state) => state.items);
	const itemCount = computeItemCount(items);
	const navigate = useNavigate();

	const handleCheckout = () => {
		useCartStore.getState().closeCart();
		const serviceIds = items.map((item) => item.serviceId);
		if (serviceIds.length > 0) {
			navigate(`/book?serviceIds=${serviceIds.join(",")}`);
		}
	};

	if (isLoading) {
		return (
			<div className="mx-auto flex max-w-[1400px] items-center justify-center p-24 text-muted-foreground">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
				<span className="ml-2 text-sm">Loading services...</span>
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="mx-auto max-w-[1400px] p-10 text-center">
				<h2 className="text-xl font-semibold text-foreground">Category not found</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					The category you're looking for doesn't exist.
				</p>
				<Link
					to="/"
					className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to categories
				</Link>
			</div>
		);
	}

	const { category, services } = data;
	const heroImage = category.image_url || getCategoryHeroImage(category.name);

	return (
		<div className="min-h-screen bg-surface">
			{/* Hero */}
			<div className="relative h-64 overflow-hidden bg-subtle md:h-80">
				<img
					src={heroImage}
					alt={category.name}
					className="h-full w-full object-cover"
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						target.src = DEFAULT_HERO_IMAGE;
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
				<div className="absolute inset-0 flex items-end">
					<div className="mx-auto w-full max-w-[1400px] px-6 pb-8 md:px-8">
						<Link
							to="/"
							className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
						>
							<ArrowLeft className="h-4 w-4" />
							All categories
						</Link>
						<h1 className="text-3xl font-bold text-white md:text-4xl">
							{category.name}
						</h1>
						<p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">
							{category.description}
						</p>
					</div>
				</div>
			</div>

			{/* Cart button (mobile) */}
			{itemCount > 0 && (
				<div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 md:hidden">
					<button
						onClick={toggleCart}
						className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
					>
						<ShoppingCart className="h-4 w-4" />
						View Cart ({itemCount})
					</button>
				</div>
			)}

			{/* Services Grid */}
			<div className="mx-auto max-w-[1400px] px-6 py-10 md:px-8">
				{services.length === 0 ? (
					<div className="py-20 text-center">
						<p className="text-muted-foreground">No services available in this category yet.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{services.map((service) => (
							<ServiceCard
								key={service.id}
								service={service}
								categoryName={category.name}
								categoryId={category.id}
							/>
						))}
					</div>
				)}
		</div>

		<CartDrawer onCheckout={handleCheckout} />
	</div>
);
}
