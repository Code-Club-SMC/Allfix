import { useNavigate } from "react-router-dom";
import { Star, MessageCircle, Phone, LayoutGrid, ClipboardList, CheckCircle2 } from "lucide-react";
import { useServiceCategories } from "@/hooks/useCategories";
import { CategoryCard } from "@/components/client/CategoryCard";
import { CartDrawer } from "@/components/client/CartDrawer";
import { useCartStore, computeItemCount } from "@/state/cart";
import { FAKE_REVIEWS, GOOGLE_RATING } from "@/data/reviews";
import { Loader2 } from "lucide-react";

export default function Catalog() {
	const navigate = useNavigate();
	const { data: categories, isLoading, isError } = useServiceCategories();

	const toggleCart = useCartStore((state) => state.toggleCart);
	const items = useCartStore((state) => state.items);
	const itemCount = computeItemCount(items);

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
				<span className="ml-2 text-sm">Loading categories...</span>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-surface">
			{/* Hero */}
			<section className="bg-gradient-to-b from-primary/5 to-surface px-6 py-16 text-center md:py-24 md:px-8">
				<div className="mx-auto max-w-3xl">
					<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
						SERVICE CATEGORIES
					</div>
					<h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
						Pick a <span className="text-primary">category</span>
					</h1>
					<p className="mt-4 text-base text-muted-foreground md:text-lg">
						Tap any category to see all services inside.
					</p>
				</div>
			</section>

			{/* Categories Grid */}
			<section className="mx-auto max-w-[1400px] px-6 py-12 md:px-8">
				{isError ? (
					<div className="rounded-xl border border-danger/20 bg-danger/[0.03] p-8 text-center">
						<p className="text-sm text-danger">Failed to load categories. Please try again.</p>
					</div>
				) : !categories || categories.length === 0 ? (
					<div className="py-20 text-center">
						<p className="text-muted-foreground">No categories available yet.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{categories.map((category) => (
							<CategoryCard key={category.id} category={category} />
						))}
					</div>
				)}
			</section>

			{/* How It Works Section */}
			<section className="border-t border-border/50 bg-[hsl(30,33%,95%)] px-6 py-16 md:px-8">
				<div className="mx-auto max-w-[1120px]">
					<h2 className="mb-12 text-center font-display text-[26px] tracking-[-0.02em] text-foreground">
						How it works
					</h2>
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
						{[
							{
								icon: LayoutGrid,
								n: "01",
								t: "Pick a service",
								d: "Browse our catalogue of vetted trades. Select one or more.",
							},
							{
								icon: ClipboardList,
								n: "02",
								t: "Describe the job",
								d: "What needs to be done — date, time, and your address.",
							},
							{
								icon: CheckCircle2,
								n: "03",
								t: "We take it from here",
								d: "A coordinator assigns the right worker and confirms your booking.",
							},
						].map(({ icon: Icon, n, t, d }) => (
							<div
								key={n}
								className="relative rounded-xl border border-border/30 bg-surface/80 px-6 py-7"
							>
								<span className="font-display text-[44px] leading-none text-primary/[0.07]">
									{n}
								</span>
								<div className="mt-4 flex h-9 w-9 items-center justify-center rounded-lg bg-subtle ring-1 ring-border/20">
									<Icon
										className="h-[18px] w-[18px] text-primary"
										strokeWidth={1.5}
									/>
								</div>
								<div className="mt-3 text-[14px] font-semibold text-foreground">
									{t}
								</div>
								<div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
									{d}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Trust & Stats Section */}
			<section className="border-t border-border/50 bg-subtle/30 px-6 py-16 md:px-8">
				<div className="mx-auto max-w-[1400px]">
					<div className="mb-12 text-center">
						<h2 className="text-2xl font-bold text-foreground md:text-3xl">About AllFix</h2>
						<p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
							AllFix Maintenance Services is your single trusted partner for every home or office
							repair need. We provide quality work, fair pricing, and total peace of mind for
							both quick fixes and full installations.
						</p>
					</div>

					{/* Stats */}
					<div className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4">
						<div className="text-center">
							<div className="text-3xl font-bold text-primary md:text-4xl">5000+</div>
							<div className="mt-1 text-sm text-muted-foreground">Happy Customers</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-primary md:text-4xl">24/7</div>
							<div className="mt-1 text-sm text-muted-foreground">Available</div>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center gap-1">
								<Star className="h-6 w-6 fill-yellow-400 text-yellow-400 md:h-8 md:w-8" />
								<span className="text-3xl font-bold text-foreground md:text-4xl">{GOOGLE_RATING}</span>
							</div>
							<div className="mt-1 text-sm text-muted-foreground">Google Rating</div>
						</div>
						<div className="text-center">
							<div className="text-3xl font-bold text-primary md:text-4xl">100%</div>
							<div className="mt-1 text-sm text-muted-foreground">Satisfaction</div>
						</div>
					</div>
				</div>
			</section>

			{/* Reviews Section */}
			<section className="border-t border-border/50 px-6 py-16 md:px-8">
				<div className="mx-auto max-w-[1400px]">
					<div className="mb-10 text-center">
						<h2 className="text-2xl font-bold text-foreground md:text-3xl">
							What Our Customers Say
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							Verified reviews from real customers
						</p>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{FAKE_REVIEWS.map((review) => (
							<div
								key={review.id}
								className="rounded-xl border border-border/50 bg-surface p-6"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1">
										{Array.from({ length: 5 }).map((_, i) => (
											<Star
												key={i}
												className={`h-4 w-4 ${
													i < review.rating
														? "fill-yellow-400 text-yellow-400"
														: "text-muted-foreground/30"
												}`}
											/>
										))}
									</div>
									{review.verified && (
										<span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
											Verified Customer
										</span>
									)}
								</div>
								<p className="mt-4 text-sm leading-relaxed text-foreground">
									"{review.comment}"
								</p>
								<div className="mt-4 border-t border-border/40 pt-4">
									<div className="text-sm font-semibold text-foreground">
										{review.name}
									</div>
									<div className="text-xs text-muted-foreground">
										{review.service} · {review.date}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Floating Action Buttons */}
			<div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
				<a
					href="https://wa.me/923115333222"
					target="_blank"
					rel="noopener noreferrer"
					className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110"
				>
					<MessageCircle className="h-5 w-5" />
				</a>
				<a
					href="tel:+923115333222"
					className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
				>
					<Phone className="h-5 w-5" />
				</a>
			</div>

			{/* Cart Drawer */}
			<CartDrawer onCheckout={handleCheckout} />
		</div>
	);
}
