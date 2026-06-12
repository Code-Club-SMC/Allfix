import { Link } from "react-router-dom";
import type { CategoryWithCount } from "@/types/api";

interface CategoryCardProps {
	category: CategoryWithCount;
}

const PLACEHOLDER_IMAGES: Record<string, string> = {
	"ac services": "https://images.unsplash.com/photo-1631545806609-3c480b8b2d1e?w=800&h=600&fit=crop",
	"ac": "https://images.unsplash.com/photo-1631545806609-3c480b8b2d1e?w=800&h=600&fit=crop",
	"plumber services": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop",
	"plumber": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop",
	"electrician services": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop",
	"electrician": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop",
	"solar panel cleaning": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop",
	"solar": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop",
	"water tank cleaning": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=600&fit=crop",
	"water tank": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=600&fit=crop",
	"handyman services": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"handyman": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"painter services": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop",
	"painter": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=600&fit=crop",
	"home appliances": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&h=600&fit=crop",
	"appliances": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&h=600&fit=crop",
	"carpenter": "https://images.unsplash.com/photo-1601058268499-e52658b8bb8d?w=800&h=600&fit=crop",
	"carpentry": "https://images.unsplash.com/photo-1601058268499-e52658b8bb8d?w=800&h=600&fit=crop",
	"ceiling works": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"ceiling": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"tile works": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"tile": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
	"welder": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop",
	"welding": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop",
	"sweeper": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop";

function getCategoryImage(categoryName: string): string {
	const key = categoryName.toLowerCase().trim();
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
	return DEFAULT_IMAGE;
}

export function CategoryCard({ category }: CategoryCardProps) {
	const imageUrl = category.image_url || getCategoryImage(category.name);
	const serviceCount = category.sub_service_count;

	return (
		<Link
			to={`/category/${category.id}`}
			className="group relative overflow-hidden rounded-2xl border border-border/50 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
		>
			{/* Image */}
			<div className="relative aspect-[4/3] overflow-hidden bg-subtle">
				<img
					src={imageUrl}
					alt={category.name}
					className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
					loading="lazy"
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						target.src = DEFAULT_IMAGE;
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
			</div>

			{/* Content */}
			<div className="p-5">
				<h3 className="text-lg font-semibold text-foreground">
					{category.name}
				</h3>
				<p className="mt-1 text-sm text-muted-foreground line-clamp-2">
					{category.description}
				</p>
				<div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
					<span>{serviceCount} service{serviceCount !== 1 ? "s" : ""}</span>
					<span className="transition-transform group-hover:translate-x-1">→</span>
				</div>
			</div>
		</Link>
	);
}
