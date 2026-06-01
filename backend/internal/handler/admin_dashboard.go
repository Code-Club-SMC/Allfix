package handler

import (
	"net/http"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminDashboardHandler struct {
	q *db.Queries
}

func NewAdminDashboardHandler(q *db.Queries) *AdminDashboardHandler {
	return &AdminDashboardHandler{q: q}
}

// GET /api/admin/dashboard
func (h *AdminDashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	fromDate, toDate := parseDateRange(r)

	requestsToday, _ := h.q.CountRequestsToday(ctx)
	activeRequests, _ := h.q.CountActiveRequests(ctx)
	activeWorkers, _ := h.q.CountActiveWorkers(ctx)
	financeOverview, _ := h.q.GetFinanceOverview(ctx, db.GetFinanceOverviewParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	recentRequests, _ := h.q.GetRecentRequests(ctx, 10)
	serviceDistribution, _ := h.q.GetServiceDistribution(ctx, db.GetServiceDistributionParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})
	monthlyData, _ := h.q.GetMonthlyFinanceData(ctx, db.GetMonthlyFinanceDataParams{
		Column1: ptrTimeToTime(fromDate),
		Column2: ptrTimeToTime(toDate),
	})

	// Map []byte STRING_AGG results to string for proper JSON serialization
	type recentRow struct {
		db.GetRecentRequestsRow
		ServiceSummary string  `json:"service_summary"`
		WorkerName     *string `json:"worker_name"`
	}
	mappedRecent := make([]recentRow, len(recentRequests))
	for i, r := range recentRequests {
		mappedRecent[i] = recentRow{
			GetRecentRequestsRow: r,
			ServiceSummary:       string(r.ServiceSummary),
			WorkerName:           r.WorkerName,
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"kpis": map[string]any{
			"requestsToday":    requestsToday,
			"activeRequests":   activeRequests,
			"activeWorkers":    activeWorkers,
			"revenueThisMonth": financeOverview.TotalIncome,
		},
		"recentRequests":      mappedRecent,
		"serviceDistribution": serviceDistribution,
		"monthlyFinanceData":  monthlyData,
	})
}
