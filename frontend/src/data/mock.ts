// Realistic mock data for Allfix (Pakistan context)

export type ServiceKey =
	| "electrician"
	| "plumber"
	| "welder"
	| "carpenter"
	| "sweeper"
	| "painter"
	| "rock-wall"
	| "texture-graphy"
	| "tile-works"
	| "ceiling-works"
	| "appliances"
	| "sofa-carpet";

export const SERVICES: { key: ServiceKey; name: string; desc: string }[] = [
	{
		key: "electrician",
		name: "Electrician",
		desc: "Wiring, fixtures, fault diagnosis",
	},
	{ key: "plumber", name: "Plumber", desc: "Leaks, fittings, drainage" },
	{ key: "welder", name: "Welder", desc: "Grills, gates, structural welds" },
	{ key: "carpenter", name: "Carpenter", desc: "Furniture, doors, fittings" },
	{ key: "sweeper", name: "Sweeper", desc: "Cleaning and waste removal" },
	{ key: "painter", name: "Painter", desc: "Interior, exterior, finishing" },
	{
		key: "rock-wall",
		name: "Rock Wall",
		desc: "Stone cladding and feature walls",
	},
	{
		key: "texture-graphy",
		name: "Texture & Graphy",
		desc: "Wall textures and stencils",
	},
	{
		key: "tile-works",
		name: "Tile Works",
		desc: "Floor and wall tile installation",
	},
	{
		key: "ceiling-works",
		name: "Ceiling Works",
		desc: "False ceilings, POP, gypsum",
	},
	{
		key: "appliances",
		name: "Appliances Repair",
		desc: "AC, fridge, washer servicing",
	},
	{
		key: "sofa-carpet",
		name: "Sofa & Carpet Cleaning",
		desc: "Deep clean and shampoo",
	},
];

export type Status =
	| "Pending"
	| "Assigned"
	| "In Progress"
	| "Completed"
	| "Invoiced";
export type Urgency = "Standard" | "Urgent";

export type Worker = {
	id: string;
	name: string;
	trade: ServiceKey[];
	phone: string;
	cnic: string;
	compType: "Fixed" | "Commission";
	compValue: string;
	availability: boolean[]; // M..S
	status: "Active" | "Inactive" | "On Leave";
	workload: number;
};

export const WORKERS: Worker[] = [
	{
		id: "W-101",
		name: "Ali Raza",
		trade: ["electrician"],
		phone: "0301-1122334",
		cnic: "42101-1234567-1",
		compType: "Fixed",
		compValue: "PKR 38,000 / mo",
		availability: [1, 1, 1, 1, 1, 1, 0].map(Boolean),
		status: "Active",
		workload: 4,
	},
	{
		id: "W-102",
		name: "Imran Sheikh",
		trade: ["plumber"],
		phone: "0312-9988776",
		cnic: "42101-2345678-2",
		compType: "Commission",
		compValue: "12% commission",
		availability: [1, 1, 1, 1, 1, 0, 0].map(Boolean),
		status: "Active",
		workload: 2,
	},
	{
		id: "W-103",
		name: "Bilal Ahmed",
		trade: ["carpenter", "ceiling-works"],
		phone: "0321-4567890",
		cnic: "42101-3456789-3",
		compType: "Fixed",
		compValue: "PKR 42,000 / mo",
		availability: [1, 1, 1, 1, 1, 1, 1].map(Boolean),
		status: "Active",
		workload: 3,
	},
	{
		id: "W-104",
		name: "Tariq Mehmood",
		trade: ["welder"],
		phone: "0333-1239876",
		cnic: "42101-4567890-4",
		compType: "Commission",
		compValue: "15% commission",
		availability: [0, 1, 1, 1, 1, 1, 0].map(Boolean),
		status: "On Leave",
		workload: 0,
	},
	{
		id: "W-105",
		name: "Saleem Khan",
		trade: ["painter", "texture-graphy"],
		phone: "0345-7654321",
		cnic: "42101-5678901-5",
		compType: "Fixed",
		compValue: "PKR 35,000 / mo",
		availability: [1, 1, 1, 1, 1, 1, 0].map(Boolean),
		status: "Active",
		workload: 5,
	},
	{
		id: "W-106",
		name: "Naseer Hussain",
		trade: ["tile-works", "rock-wall"],
		phone: "0301-9876543",
		cnic: "42101-6789012-6",
		compType: "Commission",
		compValue: "14% commission",
		availability: [1, 1, 1, 1, 1, 1, 1].map(Boolean),
		status: "Active",
		workload: 1,
	},
	{
		id: "W-107",
		name: "Faisal Iqbal",
		trade: ["appliances"],
		phone: "0322-1112223",
		cnic: "42101-7890123-7",
		compType: "Fixed",
		compValue: "PKR 40,000 / mo",
		availability: [1, 1, 1, 1, 1, 0, 0].map(Boolean),
		status: "Inactive",
		workload: 0,
	},
	{
		id: "W-108",
		name: "Kashif Pervez",
		trade: ["sweeper", "sofa-carpet"],
		phone: "0314-3334445",
		cnic: "42101-8901234-8",
		compType: "Fixed",
		compValue: "PKR 28,000 / mo",
		availability: [1, 1, 1, 1, 1, 1, 1].map(Boolean),
		status: "Active",
		workload: 2,
	},
];

export type Request = {
	id: string;
	client: string;
	service: ServiceKey;
	city: string;
	area: string;
	scheduled: string;
	urgency: Urgency;
	status: Status;
	worker?: string;
	phone: string;
	address: string;
	notes: string;
	submittedAt: string;
};

export const REQUESTS: Request[] = [
	{
		id: "CR-2041",
		client: "Ali Hassan",
		service: "electrician",
		city: "Islamabad",
		area: "F-7",
		scheduled: "2025-04-18 10:00",
		urgency: "Urgent",
		status: "Pending",
		phone: "0300-1234567",
		address: "House 22-C, Street 47, F-7",
		notes: "Main breaker tripping repeatedly.",
		submittedAt: "2025-04-17 09:12",
	},
	{
		id: "CR-2040",
		client: "Fatima Malik",
		service: "plumber",
		city: "Islamabad",
		area: "F-6",
		scheduled: "2025-04-18 14:00",
		urgency: "Standard",
		status: "Assigned",
		worker: "Imran Sheikh",
		phone: "0301-7654321",
		address: "Flat 4B, Shahbaz Tower, F-6",
		notes: "Kitchen sink leaking under counter.",
		submittedAt: "2025-04-17 08:40",
	},
	{
		id: "CR-2039",
		client: "Usman Ahmed",
		service: "carpenter",
		city: "Islamabad",
		area: "G-10",
		scheduled: "2025-04-18 11:30",
		urgency: "Standard",
		status: "In Progress",
		worker: "Bilal Ahmed",
		phone: "0312-2345678",
		address: "House 19, Street 24, G-10/3",
		notes: "Wardrobe door alignment.",
		submittedAt: "2025-04-17 07:55",
	},
	{
		id: "CR-2038",
		client: "Sara Khan",
		service: "painter",
		city: "Islamabad",
		area: "G-9",
		scheduled: "2025-04-17 09:00",
		urgency: "Standard",
		status: "Completed",
		worker: "Saleem Khan",
		phone: "0333-3456789",
		address: "House 5-D, Street 9, G-9/4",
		notes: "Living room repaint, off-white.",
		submittedAt: "2025-04-16 17:10",
	},
	{
		id: "CR-2037",
		client: "Hamza Sheikh",
		service: "tile-works",
		city: "Islamabad",
		area: "I-8",
		scheduled: "2025-04-19 09:00",
		urgency: "Standard",
		status: "Pending",
		phone: "0345-4567890",
		address: "House 88, Street 12, I-8/2",
		notes: "Bathroom floor retiling.",
		submittedAt: "2025-04-17 06:30",
	},
	{
		id: "CR-2036",
		client: "Ayesha Saleem",
		service: "appliances",
		city: "Islamabad",
		area: "G-11",
		scheduled: "2025-04-18 16:00",
		urgency: "Urgent",
		status: "Assigned",
		worker: "Faisal Iqbal",
		phone: "0301-5678901",
		address: "House 12, Street 38, G-11/3",
		notes: "Split AC not cooling.",
		submittedAt: "2025-04-17 05:50",
	},
	{
		id: "CR-2035",
		client: "Bilal Qureshi",
		service: "welder",
		city: "Islamabad",
		area: "E-7",
		scheduled: "2025-04-19 11:00",
		urgency: "Standard",
		status: "Pending",
		phone: "0322-6789012",
		address: "House 7, Street 22, E-7/3",
		notes: "Repair main gate hinge.",
		submittedAt: "2025-04-16 22:11",
	},
	{
		id: "CR-2034",
		client: "Nadia Iqbal",
		service: "sofa-carpet",
		city: "Islamabad",
		area: "F-10",
		scheduled: "2025-04-17 13:00",
		urgency: "Standard",
		status: "Completed",
		worker: "Kashif Pervez",
		phone: "0314-7890123",
		address: "Flat 8A, Green Heights, F-10/2",
		notes: "Three-seater + rug deep clean.",
		submittedAt: "2025-04-16 18:32",
	},
	{
		id: "CR-2033",
		client: "Owais Mirza",
		service: "ceiling-works",
		city: "Islamabad",
		area: "G-13",
		scheduled: "2025-04-20 10:00",
		urgency: "Standard",
		status: "Assigned",
		worker: "Bilal Ahmed",
		phone: "0321-8901234",
		address: "House 41, Street 15, G-13/2",
		notes: "False ceiling for bedroom.",
		submittedAt: "2025-04-16 16:08",
	},
	{
		id: "CR-2032",
		client: "Rabia Yusuf",
		service: "rock-wall",
		city: "Islamabad",
		area: "E-11",
		scheduled: "2025-04-21 09:30",
		urgency: "Standard",
		status: "Pending",
		phone: "0333-9012345",
		address: "House 100, Street 8, E-11/3",
		notes: "Front facade cladding 12x8 ft.",
		submittedAt: "2025-04-16 14:45",
	},
	{
		id: "CR-2031",
		client: "Junaid Akhtar",
		service: "texture-graphy",
		city: "Islamabad",
		area: "F-8",
		scheduled: "2025-04-19 14:00",
		urgency: "Standard",
		status: "In Progress",
		worker: "Saleem Khan",
		phone: "0301-0123456",
		address: "Apt 6, Margalla Heights, F-8/1",
		notes: "TV wall textured finish.",
		submittedAt: "2025-04-16 12:20",
	},
	{
		id: "CR-2030",
		client: "Mehwish Anwar",
		service: "sweeper",
		city: "Islamabad",
		area: "I-10",
		scheduled: "2025-04-17 07:00",
		urgency: "Standard",
		status: "Completed",
		worker: "Kashif Pervez",
		phone: "0312-1234509",
		address: "House 33, Street 11, I-10/2",
		notes: "Weekly cleaning service.",
		submittedAt: "2025-04-16 09:00",
	},
	{
		id: "CR-2029",
		client: "Asad Riaz",
		service: "plumber",
		city: "Islamabad",
		area: "I-14",
		scheduled: "2025-04-18 12:00",
		urgency: "Standard",
		status: "Invoiced",
		worker: "Imran Sheikh",
		phone: "0345-2345670",
		address: "House 14, Street 27, I-14/2",
		notes: "Bathroom flush replaced.",
		submittedAt: "2025-04-15 19:40",
	},
	{
		id: "CR-2028",
		client: "Zainab Pervaiz",
		service: "electrician",
		city: "Islamabad",
		area: "F-11",
		scheduled: "2025-04-18 15:00",
		urgency: "Standard",
		status: "In Progress",
		worker: "Ali Raza",
		phone: "0322-3456701",
		address: "House 9, Street 18, F-11/2",
		notes: "Add 4 new sockets in study.",
		submittedAt: "2025-04-15 11:25",
	},
	{
		id: "CR-2027",
		client: "Hassan Ali",
		service: "painter",
		city: "Islamabad",
		area: "G-6",
		scheduled: "2025-04-20 09:00",
		urgency: "Standard",
		status: "Pending",
		phone: "0301-4567802",
		address: "House 27, Street 5, G-6/3",
		notes: "Exterior wall, matte finish.",
		submittedAt: "2025-04-15 08:10",
	},
];

export type InvoiceStatus = "Draft" | "Sent" | "Paid";
export type Invoice = {
	id: string;
	client: string;
	service: string;
	date: string;
	amount: number;
	status: InvoiceStatus;
	items: { desc: string; qty: number; rate: number }[];
	address: string;
	phone: string;
	notes: string;
};

export const INVOICES: Invoice[] = [
	{
		id: "INV-309",
		client: "Asad Riaz",
		service: "Plumber",
		date: "2025-04-15",
		amount: 3850,
		status: "Paid",
		address: "House 14, Street 27, I-14/2",
		phone: "0345-2345670",
		notes: "Thank you for your business.",
		items: [
			{ desc: "Bathroom flush replacement", qty: 1, rate: 2200 },
			{ desc: "Plumbing fittings", qty: 1, rate: 950 },
			{ desc: "Service call", qty: 1, rate: 700 },
		],
	},
	{
		id: "INV-308",
		client: "Sara Khan",
		service: "Painter",
		date: "2025-04-13",
		amount: 18500,
		status: "Sent",
		address: "House 5-D, Street 9, G-9/4",
		phone: "0333-3456789",
		notes: "Net 7 days.",
		items: [
			{ desc: "Living room repaint (off-white)", qty: 1, rate: 14000 },
			{ desc: "Primer + materials", qty: 1, rate: 4000 },
			{ desc: "Touch-up", qty: 1, rate: 1000 },
		],
	},
	{
		id: "INV-307",
		client: "Nadia Iqbal",
		service: "Sofa & Carpet Cleaning",
		date: "2025-04-12",
		amount: 6200,
		status: "Sent",
		address: "Flat 8A, Green Heights, F-10/2",
		phone: "0314-7890123",
		notes: "",
		items: [
			{ desc: "Three-seater sofa deep clean", qty: 1, rate: 3500 },
			{ desc: "Area rug shampoo", qty: 1, rate: 2700 },
		],
	},
	{
		id: "INV-306",
		client: "Mehwish Anwar",
		service: "Sweeper",
		date: "2025-04-10",
		amount: 2400,
		status: "Draft",
		address: "House 33, Street 11, I-10/2",
		phone: "0312-1234509",
		notes: "",
		items: [{ desc: "Weekly cleaning (4 visits)", qty: 4, rate: 600 }],
	},
	{
		id: "INV-305",
		client: "Bilal Qureshi",
		service: "Welder",
		date: "2025-04-08",
		amount: 5400,
		status: "Draft",
		address: "House 7, Street 22, E-7/3",
		phone: "0322-6789012",
		notes: "Pending parts confirmation.",
		items: [
			{ desc: "Gate hinge replacement", qty: 2, rate: 1800 },
			{ desc: "Welding labour", qty: 1, rate: 1800 },
		],
	},
];

export type Vendor = {
	id: string;
	name: string;
	category: string;
	contact: string;
	phone: string;
	email: string;
	terms: string;
	status: "Active" | "Inactive";
};
export const VENDORS: Vendor[] = [
	{
		id: "V-01",
		name: "Islamabad Hardware Co.",
		category: "Hardware & Tools",
		contact: "Saqib Mahmood",
		phone: "051-34567890",
		email: "sales@khco.pk",
		terms: "Net 15",
		status: "Active",
	},
	{
		id: "V-02",
		name: "Liberty Paints",
		category: "Paint & Finishes",
		contact: "Asim Raza",
		phone: "051-32568912",
		email: "orders@libertypaints.pk",
		terms: "Net 30",
		status: "Active",
	},
	{
		id: "V-03",
		name: "Master Tiles Depot",
		category: "Tiles & Stone",
		contact: "Zubair Khan",
		phone: "051-34982310",
		email: "info@mastertiles.pk",
		terms: "Cash on delivery",
		status: "Active",
	},
];

export type InventoryItem = {
	id: string;
	name: string;
	category: ServiceKey | "general";
	qty: number;
	unit: string;
	condition: "New" | "Good" | "Needs Repair" | "Retired";
	assignedTo?: string;
	updated: string;
	cost?: number;
};
export const INVENTORY: InventoryItem[] = [
	{
		id: "T-001",
		name: "Cordless Drill 18V",
		category: "carpenter",
		qty: 4,
		unit: "pcs",
		condition: "Good",
		assignedTo: "Bilal Ahmed",
		updated: "2025-04-12",
	},
	{
		id: "T-002",
		name: "Insulated Screwdriver Set",
		category: "electrician",
		qty: 6,
		unit: "sets",
		condition: "New",
		assignedTo: "Ali Raza",
		updated: "2025-04-10",
	},
	{
		id: "T-003",
		name: 'Pipe Wrench 14"',
		category: "plumber",
		qty: 2,
		unit: "pcs",
		condition: "Good",
		assignedTo: "Imran Sheikh",
		updated: "2025-04-09",
	},
	{
		id: "T-004",
		name: "MIG Welding Machine",
		category: "welder",
		qty: 1,
		unit: "pcs",
		condition: "Needs Repair",
		assignedTo: "Tariq Mehmood",
		updated: "2025-04-05",
	},
	{
		id: "T-005",
		name: "Paint Sprayer",
		category: "painter",
		qty: 2,
		unit: "pcs",
		condition: "Good",
		assignedTo: "Saleem Khan",
		updated: "2025-04-08",
	},
	{
		id: "T-006",
		name: "Tile Cutter 800mm",
		category: "tile-works",
		qty: 1,
		unit: "pcs",
		condition: "Good",
		assignedTo: "Naseer Hussain",
		updated: "2025-04-07",
	},
	{
		id: "T-007",
		name: "Industrial Vacuum",
		category: "sofa-carpet",
		qty: 2,
		unit: "pcs",
		condition: "New",
		assignedTo: "Kashif Pervez",
		updated: "2025-04-12",
	},
	{
		id: "T-008",
		name: "Aluminum Ladder 12ft",
		category: "general",
		qty: 5,
		unit: "pcs",
		condition: "Good",
		updated: "2025-04-01",
	},
	{
		id: "T-009",
		name: "Multimeter Digital",
		category: "electrician",
		qty: 3,
		unit: "pcs",
		condition: "Good",
		assignedTo: "Ali Raza",
		updated: "2025-03-29",
	},
	{
		id: "T-010",
		name: "POP Mixing Drum",
		category: "ceiling-works",
		qty: 2,
		unit: "pcs",
		condition: "Good",
		assignedTo: "Bilal Ahmed",
		updated: "2025-04-03",
	},
	{
		id: "T-011",
		name: "Stone Cutter Disk Box",
		category: "rock-wall",
		qty: 8,
		unit: "boxes",
		condition: "New",
		updated: "2025-04-06",
	},
	{
		id: "T-012",
		name: "Carpet Shampoo (5L)",
		category: "sofa-carpet",
		qty: 2,
		unit: "bottles",
		condition: "New",
		updated: "2025-04-04",
	},
	{
		id: "T-013",
		name: "Roller & Brush Kit",
		category: "painter",
		qty: 1,
		unit: "kits",
		condition: "Good",
		updated: "2025-03-30",
	},
	{
		id: "T-014",
		name: "Refrigerant Gauge Set",
		category: "appliances",
		qty: 1,
		unit: "sets",
		condition: "Needs Repair",
		assignedTo: "Faisal Iqbal",
		updated: "2025-04-02",
	},
];

// Finance: 6 months income vs expenses (PKR thousands)
export const FINANCE_MONTHLY = [
	{ month: "Nov", income: 412, expenses: 268 },
	{ month: "Dec", income: 456, expenses: 295 },
	{ month: "Jan", income: 489, expenses: 312 },
	{ month: "Feb", income: 521, expenses: 334 },
	{ month: "Mar", income: 578, expenses: 356 },
	{ month: "Apr", income: 612, expenses: 378 },
];

export const INCOME_ROWS = [
	{
		date: "2025-04-15",
		desc: "Invoice INV-309 — Plumbing",
		category: "Service Income",
		amount: 3850,
		source: "Asad Riaz",
	},
	{
		date: "2025-04-13",
		desc: "Invoice INV-308 — Painting",
		category: "Service Income",
		amount: 18500,
		source: "Sara Khan",
	},
	{
		date: "2025-04-12",
		desc: "Invoice INV-307 — Cleaning",
		category: "Service Income",
		amount: 6200,
		source: "Nadia Iqbal",
	},
	{
		date: "2025-04-09",
		desc: "Cash job — AC Installation",
		category: "Service Income",
		amount: 12000,
		source: "Walk-in",
	},
	{
		date: "2025-04-04",
		desc: "Invoice INV-302 — Tiling",
		category: "Service Income",
		amount: 24500,
		source: "Ahsan Tariq",
	},
];

export const EXPENSE_ROWS = [
	{
		date: "2025-04-14",
		desc: "Tiles — Master Tiles Depot",
		category: "Materials",
		amount: 8500,
		source: "V-03",
	},
	{
		date: "2025-04-12",
		desc: "Wall paint 20L — Liberty",
		category: "Materials",
		amount: 7200,
		source: "V-02",
	},
	{
		date: "2025-04-11",
		desc: "Vehicle fuel weekly",
		category: "Fuel",
		amount: 4800,
		source: "Petty Cash",
	},
	{
		date: "2025-04-10",
		desc: "Workshop electricity",
		category: "Utilities",
		amount: 5600,
		source: "IEC",
	},
	{
		date: "2025-04-08",
		desc: "Salary advance — Bilal A.",
		category: "Salary",
		amount: 8000,
		source: "Payroll",
	},
	{
		date: "2025-04-05",
		desc: "Replacement drill bits",
		category: "Tools",
		amount: 1850,
		source: "V-01",
	},
];

export const SALARY_LEDGER = [
	{
		date: "2025-04-01",
		worker: "Ali Raza",
		type: "Salary",
		amount: 38000,
		status: "Paid",
		balance: 0,
	},
	{
		date: "2025-04-01",
		worker: "Bilal Ahmed",
		type: "Salary",
		amount: 42000,
		status: "Paid",
		balance: 0,
	},
	{
		date: "2025-04-08",
		worker: "Bilal Ahmed",
		type: "Advance",
		amount: -8000,
		status: "Paid",
		balance: -8000,
	},
	{
		date: "2025-04-01",
		worker: "Saleem Khan",
		type: "Salary",
		amount: 35000,
		status: "Paid",
		balance: 0,
	},
	{
		date: "2025-04-15",
		worker: "Imran Sheikh",
		type: "Commission",
		amount: 12400,
		status: "Pending",
		balance: 12400,
	},
	{
		date: "2025-04-15",
		worker: "Naseer Hussain",
		type: "Commission",
		amount: 9800,
		status: "Pending",
		balance: 9800,
	},
];

export const ACTIVITY_FEED = [
	{
		ts: "2 min ago",
		text: "Invoice INV-309 generated for Asad Riaz",
		color: "info" as const,
	},
	{
		ts: "14 min ago",
		text: "Job CR-2038 marked complete by Saleem Khan",
		color: "success" as const,
	},
	{
		ts: "32 min ago",
		text: "New request CR-2041 submitted by Ali Hassan",
		color: "warning" as const,
	},
	{
		ts: "1 hr ago",
		text: "Worker Imran Sheikh assigned to CR-2040",
		color: "info" as const,
	},
	{
		ts: "2 hr ago",
		text: "Inventory: MIG Welding Machine flagged needs repair",
		color: "danger" as const,
	},
	{
		ts: "3 hr ago",
		text: "Payroll processed for March 2025",
		color: "success" as const,
	},
];
