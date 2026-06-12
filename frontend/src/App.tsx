import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/cb/AppShell";
import { ClientShell } from "@/components/cb/ClientShell";
import { RequireAdmin } from "@/components/cb/RequireAdmin";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/state/role";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminFinance from "./pages/admin/Finance";
import AdminHR from "./pages/admin/HR";
import AdminInventory from "./pages/admin/Inventory";
import AdminInvoices from "./pages/admin/Invoices";
// Admin pages (protected)
import AdminLogin from "./pages/admin/Login";
import AdminRequests from "./pages/admin/Requests";
import AdminSettings from "./pages/admin/Settings";
import VendorManagement from "./pages/admin/VendorManagement";
import WorkerProfile from "./pages/admin/WorkerProfile";
import VendorProfile from "./pages/admin/VendorProfile";
import ClientBooking from "./pages/client/Booking";
// Client-facing pages (public — no auth)
import ClientCatalog from "./pages/client/Catalog";
import CategoryDetail from "./pages/client/CategoryDetail";
import Contact from "./pages/client/Contact";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<RoleProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<Routes>
		{/* ── Public client booking experience (no sign-in required) ─ */}
		<Route
			path="/"
			element={
				<ClientShell>
					<ClientCatalog />
				</ClientShell>
			}
		/>
		<Route
			path="/category/:id"
			element={
				<ClientShell>
					<CategoryDetail />
				</ClientShell>
			}
		/>
		<Route
			path="/book/:service"
			element={
				<ClientShell>
					<ClientBooking />
				</ClientShell>
			}
		/>
		<Route
			path="/book"
			element={
				<ClientShell>
					<ClientBooking />
				</ClientShell>
			}
		/>
		<Route
			path="/contact"
			element={
				<ClientShell>
					<Contact />
				</ClientShell>
			}
		/>

						{/* ── Admin login (public) ── */}
						<Route path="/admin/login" element={<AdminLogin />} />

						{/* ── Admin (protected — requires admin session) ── */}
						<Route
							path="/admin"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminDashboard />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/requests"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminRequests />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/invoices"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminInvoices />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/hr"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminHR />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/finance"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminFinance />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/inventory"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminInventory />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/vendors"
							element={
								<RequireAdmin>
									<AppShell>
										<VendorManagement />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/workers/:id"
							element={
								<RequireAdmin>
									<AppShell>
										<WorkerProfile />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/vendors/:id"
							element={
								<RequireAdmin>
									<AppShell>
										<VendorProfile />
									</AppShell>
								</RequireAdmin>
							}
						/>
						<Route
							path="/admin/settings"
							element={
								<RequireAdmin>
									<AppShell>
										<AdminSettings />
									</AppShell>
								</RequireAdmin>
							}
						/>

						<Route path="*" element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</RoleProvider>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
