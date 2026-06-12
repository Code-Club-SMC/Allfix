export interface Review {
	id: number;
	name: string;
	rating: number;
	comment: string;
	service: string;
	date: string;
	verified: boolean;
}

export const FAKE_REVIEWS: Review[] = [
	{
		id: 1,
		name: "Ahmed Khan",
		rating: 5,
		comment: "Excellent service! The electrician arrived on time and fixed the issue quickly. Very professional.",
		service: "Electrician Services",
		date: "2 days ago",
		verified: true,
	},
	{
		id: 2,
		name: "Fatima Ali",
		rating: 5,
		comment: "Amazing experience! The plumber was very knowledgeable and solved our leakage problem efficiently.",
		service: "Plumber Services",
		date: "5 days ago",
		verified: true,
	},
	{
		id: 3,
		name: "Muhammad Hassan",
		rating: 4,
		comment: "Good service overall. The AC technician was skilled and completed the job well. Slightly delayed but worth the wait.",
		service: "AC Services",
		date: "1 week ago",
		verified: true,
	},
	{
		id: 4,
		name: "Ayesha Siddiqui",
		rating: 5,
		comment: "Highly recommend! The carpenter did a fantastic job fixing our furniture. Very neat and clean work.",
		service: "Handyman Services",
		date: "1 week ago",
		verified: true,
	},
	{
		id: 5,
		name: "Usman Tariq",
		rating: 5,
		comment: "Best water tank cleaning service in Bahria Town! The team was thorough and professional.",
		service: "Water Tank Cleaning",
		date: "2 weeks ago",
		verified: true,
	},
	{
		id: 6,
		name: "Zainab Malik",
		rating: 4,
		comment: "Great painters! They transformed our living room. Clean work and reasonable pricing.",
		service: "Painter Services",
		date: "2 weeks ago",
		verified: true,
	},
	{
		id: 7,
		name: "Ali Raza",
		rating: 5,
		comment: "Called at midnight for an emergency plumbing issue. They responded within an hour! Lifesavers.",
		service: "Plumber Services",
		date: "3 weeks ago",
		verified: true,
	},
	{
		id: 8,
		name: "Sana Sheikh",
		rating: 5,
		comment: "The solar panel cleaning team did an excellent job. Our panels are working much better now.",
		service: "Solar Panel Cleaning",
		date: "3 weeks ago",
		verified: true,
	},
	{
		id: 9,
		name: "Bilal Ahmed",
		rating: 4,
		comment: "Professional appliance repair service. Fixed our washing machine quickly and at a fair price.",
		service: "Home Appliances",
		date: "1 month ago",
		verified: true,
	},
	{
		id: 10,
		name: "Nadia Parveen",
		rating: 5,
		comment: "Very satisfied with the service. The worker was polite, skilled, and completed the job perfectly.",
		service: "Electrician Services",
		date: "1 month ago",
		verified: true,
	},
];

export const GOOGLE_RATING = 4.3;
export const TOTAL_REVIEWS = 5000;
