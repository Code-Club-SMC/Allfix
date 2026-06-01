import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Service } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function slugifyServiceName(name: string) {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function buildServiceSlugMap(services: Service[]) {
	const baseCounts: Record<string, number> = {};
	const baseById: Record<string, string> = {};

	services.forEach((service) => {
		const base = slugifyServiceName(service.name) || "service";
		baseById[service.id] = base;
		baseCounts[base] = (baseCounts[base] || 0) + 1;
	});

	const slugById: Record<string, string> = {};
	const serviceBySlug: Record<string, Service> = {};

	services.forEach((service) => {
		const base = baseById[service.id];
		const needsSuffix = baseCounts[base] > 1 || base === "service";
		const shortId = service.id.replace(/-/g, "").slice(0, 6);
		const slug = needsSuffix ? `${base}-${shortId}` : base;
		slugById[service.id] = slug;
		serviceBySlug[slug] = service;
	});

	return { slugById, serviceBySlug };
}
