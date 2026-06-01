package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/AbdulRehman-z/allfix/internal/config"
	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
	"github.com/AbdulRehman-z/allfix/internal/handler"
	mw "github.com/AbdulRehman-z/allfix/internal/middleware"
)

func New(cfg *config.Config, pool *pgxpool.Pool, q *db.Queries) http.Handler {
	r := chi.NewRouter()

	// ── Global middleware ──────────────────────────────────────────────────────
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(mw.CORS(cfg.AllowedOrigins))

	// ── Handler construction ───────────────────────────────────────────────────
	cookieCfg := handler.CookieConfig{
		Secure:   cfg.CookieSecure,
		SameSite: cfg.CookieSameSite,
	}

	authH := handler.NewAuthHandler(q, cfg.JWTSecret, cfg.JWTExpiryHours, cookieCfg)
	bootstrapH := handler.NewBootstrapHandler(q, cfg.BootstrapSecret)
	svcH := handler.NewClientServicesHandler(q)
	adminSvcH := handler.NewAdminServicesHandler(q)
	clientReqH := handler.NewClientRequestsHandler(pool, q, cfg.JWTSecret, cfg.JWTExpiryHours, cookieCfg)
	dashH := handler.NewAdminDashboardHandler(q)
	adminReqH := handler.NewAdminRequestsHandler(q)
	invoiceH := handler.NewAdminInvoicesHandler(pool, q)
	hrH := handler.NewAdminHRHandler(pool, q)
	financeH := handler.NewAdminFinanceHandler(pool, q)
	inventoryH := handler.NewAdminInventoryHandler(q)
	vendorH := handler.NewAdminVendorsHandler(q)
	accountH := handler.NewSystemAccountHandler(q)
	dataH := handler.NewAdminDataHandler(pool, q)

	requireAuth := mw.RequireAuth(cfg.JWTSecret)
	requireAdmin := mw.RequireRole("admin")

	// ── Internal bootstrap ─────────────────────────────────────────────────────
	r.Route("/api/internal", func(r chi.Router) {
		r.Get("/bootstrap-admin", bootstrapH.Status)
		r.Post("/bootstrap-admin", bootstrapH.Create)
		r.Patch("/bootstrap-admin", bootstrapH.Update)
	})

	// ── Auth ───────────────────────────────────────────────────────────────────
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/sign-up", authH.Register)
		r.Post("/sign-in", authH.Login)
		r.Post("/sign-out", authH.Logout)
		r.With(requireAuth).Get("/session", authH.GetSession)
	})

	// ── Public ─────────────────────────────────────────────────────────────────
	r.Get("/api/services", svcH.List)

	// ── Client ─────────────────────────────────────────────────────────────────
	r.Route("/api/requests", func(r chi.Router) {
		r.Post("/", clientReqH.Create)
		r.With(requireAuth, mw.RequireRole("client")).Get("/", clientReqH.List)
		r.With(requireAuth, mw.RequireRole("client")).Get("/{id}", clientReqH.Get)
	})

	// ── Admin ──────────────────────────────────────────────────────────────────
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(requireAuth)
		r.Use(requireAdmin)

		r.Get("/dashboard", dashH.Get)

		// Services
		r.Post("/services", adminSvcH.Create)
		r.Patch("/services/{id}", adminSvcH.Update)
		r.Delete("/services/{id}", adminSvcH.Delete)
		r.Get("/services/hierarchical", adminSvcH.ListHierarchical)
		r.Get("/services/categories", adminSvcH.ListCategories)

		// Requests
		r.Get("/requests", adminReqH.List)
		r.Get("/requests/{id}", adminReqH.Get)
		r.Patch("/requests/{id}", adminReqH.Update)
		r.Get("/requests/{id}/workers", adminReqH.ListRequestWorkers)
		r.Post("/requests/{id}/workers", adminReqH.AssignWorkers)
		r.Post("/requests/{id}/vendor", adminReqH.AssignVendorToRequest)
		r.Delete("/requests/{id}/vendor", adminReqH.RemoveVendorFromRequest)

		// Vendors
		r.Post("/vendors", vendorH.CreateVendorHandler)
		r.Get("/vendors", vendorH.ListVendorsHandler)
		r.Get("/vendors/{id}", vendorH.GetVendorHandler)
		r.Put("/vendors/{id}", vendorH.UpdateVendorHandler)
		r.Delete("/vendors/{id}", vendorH.DeleteVendorHandler)

		// Clients
		r.Get("/clients", authH.ListClients)

		// Invoices
		r.Get("/invoices", invoiceH.List)
		r.Post("/invoices", invoiceH.Create)
		r.Get("/invoices/requests-without-invoice", invoiceH.ListRequestsWithoutInvoice)
		r.Get("/invoices/{id}", invoiceH.Get)
		r.Patch("/invoices/{id}", invoiceH.Update)
		r.Delete("/invoices/{id}", invoiceH.Delete)

		// HR
		r.Get("/hr/overview", hrH.Overview)

		r.Get("/workers", hrH.ListWorkers)
		r.Get("/workers/active", hrH.ListActiveWorkers)
		r.Post("/workers", hrH.CreateWorker)
		r.Patch("/workers/{id}", hrH.UpdateWorker)
		r.Delete("/workers/{id}", hrH.DeleteWorker)
		r.Get("/workers/{id}/profile", hrH.GetWorkerProfile)
		r.Get("/vendors/{id}/profile", vendorH.GetVendorProfile)

		r.Get("/payroll", hrH.ListPayroll)
		r.Post("/payroll", hrH.UpsertPayroll)
		r.Patch("/payroll/{id}", hrH.UpdatePayroll)
		r.Post("/payroll/process", hrH.ProcessPayroll)
		r.Patch("/payroll/{id}/paid", hrH.MarkPayrollPaid)
		r.Get("/payroll/calculate", hrH.CalculatePayroll)
		r.Get("/payroll/{id}/slip", hrH.GetSalarySlip)

		// Worker Advances
		r.Post("/workers/{id}/advances", hrH.CreateAdvance)
		r.Get("/workers/{id}/advances", hrH.ListWorkerAdvances)
		r.Get("/advances", hrH.ListAllAdvances)
		r.Patch("/advances/{id}/pause", hrH.PauseAdvance)
		r.Patch("/advances/{id}/resume", hrH.ResumeAdvance)

		// Finance
		r.Get("/finance/overview", financeH.Overview)
		r.Get("/finance/account", accountH.GetAccount)
		r.Post("/finance/account/deposit", financeH.DepositToAccount)
		r.Get("/finance/transactions", accountH.ListTransactions)

		r.Get("/finance/income", financeH.ListIncome)
		r.Get("/finance/income/total", financeH.GetIncomeTotal)
		r.Post("/finance/income", financeH.CreateIncome)
		r.Patch("/finance/income/{id}", financeH.UpdateIncome)
		r.Delete("/finance/income/{id}", financeH.DeleteIncome)

		r.Get("/finance/expenses", financeH.ListExpenses)
		r.Get("/finance/expenses/total", financeH.GetExpenseTotal)
		r.Post("/finance/expenses", financeH.CreateExpense)
		r.Patch("/finance/expenses/{id}", financeH.UpdateExpense)
		r.Delete("/finance/expenses/{id}", financeH.DeleteExpense)

		// Inventory
		r.Get("/inventory", inventoryH.List)
		r.Post("/inventory", inventoryH.Create)
		r.Patch("/inventory/{id}", inventoryH.Update)
		r.Delete("/inventory/{id}", inventoryH.Delete)

		// Data management
		r.Post("/data/seed", dataH.SeedData)
		r.Post("/data/clear", dataH.ClearData)
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	return r
}
