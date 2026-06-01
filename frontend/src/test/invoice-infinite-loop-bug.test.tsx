import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import * as fc from "fast-check";
import Invoices from "@/pages/admin/Invoices";

/**
 * Bug Condition Exploration Test for Invoice Page Infinite Loop
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * This test explores the bug condition where rendering the Invoices component
 * with worker data causes infinite re-renders due to a circular dependency
 * in the useEffect hook at lines 127-138.
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists.
 * 
 * Bug Condition:
 * - Page load to /admin/invoices OR clicking "View Invoice" button
 * - workerList.length > 0
 * - useEffect reads from workerCommissions and updates it
 * - workerCommissions not in dependency array
 * 
 * Expected Behavior After Fix:
 * - Page loads without infinite re-renders
 * - Worker commission fields are initialized once per unique worker list
 */

// Mock the hooks to control the data
vi.mock("@/hooks/useAdmin", () => ({
	useAdminInvoices: vi.fn(),
	useAdminInvoiceDetail: vi.fn(),
	useAdminRequestDetail: vi.fn(),
	useRequestsWithoutInvoice: vi.fn(),
	useCreateInvoice: vi.fn(),
	useUpdateInvoice: vi.fn(),
	useRequestWorkers: vi.fn(),
}));

// Mock date picker to avoid issues
vi.mock("@/components/ui/date-picker", () => ({
	DateRangePicker: () => null,
	fmtDateForAPI: (date: any) => date,
	getCurrentMonthRange: () => ({ from: new Date(), to: new Date() }),
}));

describe("Invoice Page Infinite Loop Bug - Bug Condition Exploration", () => {
	let queryClient: QueryClient;

	beforeEach(async () => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});

		// Reset all mocks
		vi.clearAllMocks();

		// Import and setup default mocks
		const {
			useAdminInvoices,
			useAdminInvoiceDetail,
			useAdminRequestDetail,
			useRequestsWithoutInvoice,
			useCreateInvoice,
			useUpdateInvoice,
			useRequestWorkers,
		} = await import("@/hooks/useAdmin");

		// Set default mock implementations
		vi.mocked(useAdminInvoices).mockReturnValue({
			data: { data: [], total: 0, pageCount: 1 },
			isLoading: false,
		} as any);

		vi.mocked(useAdminInvoiceDetail).mockReturnValue({
			data: undefined,
			isLoading: false,
		} as any);

		vi.mocked(useAdminRequestDetail).mockReturnValue({
			data: undefined,
			isLoading: false,
		} as any);

		vi.mocked(useRequestsWithoutInvoice).mockReturnValue({
			data: { data: [], total: 0, pageCount: 1 },
			isLoading: false,
		} as any);

		vi.mocked(useCreateInvoice).mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		} as any);

		vi.mocked(useUpdateInvoice).mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		} as any);

		vi.mocked(useRequestWorkers).mockReturnValue({
			data: [],
			isLoading: false,
		} as any);
	});

	/**
	 * Property 1: Bug Condition - Infinite Loop on Page Load
	 * 
	 * **Validates: Requirements 1.1, 1.2, 1.3**
	 * 
	 * This property tests that rendering the Invoices component with worker data
	 * causes infinite re-renders (on unfixed code) or renders successfully (on fixed code).
	 * 
	 * **Scoped PBT Approach**: For this deterministic bug, we scope the property
	 * to concrete failing cases to ensure reproducibility.
	 */
	it("Property 1: Bug Condition - should detect infinite loop when rendering with worker data", async () => {
		const { useAdminInvoices, useRequestWorkers } = await import("@/hooks/useAdmin");

		// Mock the hooks to return data that triggers the bug
		vi.mocked(useAdminInvoices).mockReturnValue({
			data: { data: [], total: 0, pageCount: 1 },
			isLoading: false,
		} as any);

		// Generate worker data that triggers the bug condition
		await fc.assert(
			fc.asyncProperty(
				// Generate worker lists with 1-5 workers
				fc.array(
					fc.record({
						id: fc.uuid(),
						name: fc.string({ minLength: 3, maxLength: 20 }),
						phone: fc.string({ minLength: 10, maxLength: 15 }),
					}),
					{ minLength: 1, maxLength: 5 }
				),
				async (workerList) => {
					// Mock useRequestWorkers to return the generated worker list
					vi.mocked(useRequestWorkers).mockReturnValue({
						data: workerList,
						isLoading: false,
					} as any);

					// Track render count to detect infinite loop
					let renderCount = 0;
					const maxRenders = 50; // React's default is 50 before throwing error

					// Spy on console.error to catch React's warning
					const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

					try {
						// Attempt to render the component
						const { unmount } = render(
							<QueryClientProvider client={queryClient}>
								<BrowserRouter>
									<Invoices />
								</BrowserRouter>
							</QueryClientProvider>
						);

						// If we get here without error, the bug might be fixed
						// or the test setup needs adjustment
						unmount();

						// Check if React logged any errors about too many renders
						const errorCalls = consoleErrorSpy.mock.calls;
						const hasInfiniteLoopError = errorCalls.some((call) =>
							call.some((arg) =>
								typeof arg === "string" &&
								(arg.includes("Maximum update depth exceeded") ||
									arg.includes("Too many re-renders"))
							)
						);

						if (hasInfiniteLoopError) {
							// Bug detected! This is the expected outcome on unfixed code
							throw new Error(
								`Infinite loop detected: React reported "Maximum update depth exceeded" ` +
								`with ${workerList.length} workers. This confirms the bug exists.`
							);
						}

						// If no error, the bug might be fixed or not triggered
						// For unfixed code, this should not happen
						return true;
					} catch (error: any) {
						// Check if this is the expected infinite loop error
						if (
							error.message?.includes("Maximum update depth exceeded") ||
							error.message?.includes("Too many re-renders") ||
							error.message?.includes("Infinite loop detected")
						) {
							// This is the expected failure on unfixed code
							// Re-throw to fail the test and document the counterexample
							throw new Error(
								`COUNTEREXAMPLE FOUND: Infinite loop triggered with ${workerList.length} worker(s). ` +
								`Worker IDs: ${workerList.map(w => w.id).join(", ")}. ` +
								`This confirms the bug exists. Error: ${error.message}`
							);
						}

						// Unexpected error - re-throw
						throw error;
					} finally {
						consoleErrorSpy.mockRestore();
					}
				}
			),
			{
				numRuns: 3, // Run 3 test cases with different worker lists (reduced for faster execution)
				verbose: true,
			}
		);
	});

	/**
	 * Concrete test case: Single worker triggers infinite loop
	 * 
	 * This is a deterministic test that should reliably reproduce the bug
	 * on unfixed code.
	 */
	it("should trigger infinite loop with a single worker (concrete case)", async () => {
		const { useAdminInvoices, useRequestWorkers } = await import("@/hooks/useAdmin");

		// Mock the hooks
		vi.mocked(useAdminInvoices).mockReturnValue({
			data: { data: [], total: 0, pageCount: 1 },
			isLoading: false,
		} as any);

		// Single worker that should trigger the bug
		const singleWorker = [
			{
				id: "worker-1",
				name: "Test Worker",
				phone: "1234567890",
			},
		];

		vi.mocked(useRequestWorkers).mockReturnValue({
			data: singleWorker,
			isLoading: false,
		} as any);

		// Spy on console.error to catch React's warning
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			// Attempt to render - this should fail on unfixed code
			const { unmount } = render(
				<QueryClientProvider client={queryClient}>
					<BrowserRouter>
						<Invoices />
					</BrowserRouter>
				</QueryClientProvider>
			);

			unmount();

			// Check for infinite loop error
			const errorCalls = consoleErrorSpy.mock.calls;
			const hasInfiniteLoopError = errorCalls.some((call) =>
				call.some((arg) =>
					typeof arg === "string" &&
					(arg.includes("Maximum update depth exceeded") ||
						arg.includes("Too many re-renders"))
				)
			);

			if (hasInfiniteLoopError) {
				// Bug confirmed!
				throw new Error(
					"COUNTEREXAMPLE: Infinite loop detected with single worker. " +
					"React reported 'Maximum update depth exceeded'. " +
					"This confirms the bug exists in the useEffect hook."
				);
			}

			// If we reach here without error, the bug might be fixed
			// On unfixed code, this should not happen
			expect(hasInfiniteLoopError).toBe(false);
		} catch (error: any) {
			if (
				error.message?.includes("Maximum update depth exceeded") ||
				error.message?.includes("Too many re-renders") ||
				error.message?.includes("COUNTEREXAMPLE")
			) {
				// Expected failure on unfixed code
				throw error;
			}
			// Unexpected error
			throw error;
		} finally {
			consoleErrorSpy.mockRestore();
		}
	});

	/**
	 * Edge case: Empty worker list should NOT trigger infinite loop
	 * 
	 * This test verifies that the bug only occurs when workerList.length > 0,
	 * as specified in the bug condition.
	 */
	it("should NOT trigger infinite loop with empty worker list (edge case)", async () => {
		const { useAdminInvoices, useRequestWorkers } = await import("@/hooks/useAdmin");

		// Mock the hooks
		vi.mocked(useAdminInvoices).mockReturnValue({
			data: { data: [], total: 0, pageCount: 1 },
			isLoading: false,
		} as any);

		// Empty worker list - should NOT trigger the bug
		vi.mocked(useRequestWorkers).mockReturnValue({
			data: [],
			isLoading: false,
		} as any);

		// Spy on console.error
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			// Render the component
			const { unmount } = render(
				<QueryClientProvider client={queryClient}>
					<BrowserRouter>
						<Invoices />
					</BrowserRouter>
				</QueryClientProvider>
			);

			unmount();

			// Check that NO infinite loop error occurred
			const errorCalls = consoleErrorSpy.mock.calls;
			const hasInfiniteLoopError = errorCalls.some((call) =>
				call.some((arg) =>
					typeof arg === "string" &&
					(arg.includes("Maximum update depth exceeded") ||
						arg.includes("Too many re-renders"))
				)
			);

			// This should pass even on unfixed code
			expect(hasInfiniteLoopError).toBe(false);
		} finally {
			consoleErrorSpy.mockRestore();
		}
	});
});
