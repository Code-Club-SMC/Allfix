package handler

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type AdminDataHandler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewAdminDataHandler(pool *pgxpool.Pool, q *db.Queries) *AdminDataHandler {
	return &AdminDataHandler{pool: pool, q: q}
}

var (
	seedFirstNames = []string{"Ahmed", "Ali", "Fatima", "Ayesha", "Hassan", "Sara", "Usman", "Zainab", "Bilal", "Maryam", "Omar", "Hira", "Tariq", "Nadia", "Kamran", "Sana", "Faisal", "Rabia", "Imran", "Amna", "Saad", "Mehwish", "Asad", "Saima", "Rizwan", "Aisha", "Danish", "Huma", "Waqar", "Farah", "Junaid", "Nida", "Shahid", "Bushra", "Naveed", "Rubina", "Tahir", "Samina", "Adnan", "Kiran", "Hamza", "Iqra", "Yasir", "Sadia", "Kashif", "Zara", "Arif", "Lubna", "Shoaib", "Nasreen"}
	seedLastNames  = []string{"Khan", "Ahmed", "Ali", "Malik", "Hussain", "Shah", "Iqbal", "Butt", "Mirza", "Chaudhry", "Siddiqui", "Qureshi", "Raza", "Javed", "Anwar", "Rashid", "Akram", "Farooq", "Aslam", "Ibrahim", "Yousaf", "Majeed", "Nasir", "Sultan", "Zafar", "Rehman", "Karim", "Bashir", "Saleem", "Haider"}
	seedCities     = []string{"Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala"}
	seedAreas      = []string{"Gulberg", "DHA", "Model Town", "Johar Town", "Clifton", "Bahria Town", "F-8", "F-10", "Satellite Town", "Madina Town", "University Town", "Cantt", "Saddar", "Garden Town", "Wapda Town"}
	seedStreets    = []string{"Street 5", "Street 12", "Street 3", "Street 8", "Street 21", "Street 7", "Street 15", "Street 2", "Street 9", "Street 18"}
	seedUrgencies  = []string{"standard", "urgent"}
	seedStatuses   = []string{"pending", "assigned", "in_progress", "completed", "invoiced"}
	seedTimes      = []string{"09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"}
	seedDescs      = []string{"Need complete setup/installation", "Repair work needed urgently", "New installation for residential property", "Maintenance and servicing", "Full replacement of old system", "Inspection and minor fixes", "Emergency repair", "Upgrade existing setup", "Installation at new site", "Routine maintenance check-up"}
	seedInvStatus  = []string{"draft", "sent", "paid"}
)

// POST /api/admin/data/seed
func (h *AdminDataHandler) SeedData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Get existing IDs
	serviceIDs, _ := h.q.ListServices(ctx)
	if len(serviceIDs) == 0 {
		writeError(w, http.StatusBadRequest, "no services found — run migrations first")
		return
	}
	svcIDs := make([]string, len(serviceIDs))
	for i, s := range serviceIDs {
		svcIDs[i] = s.ID.String()
	}

	wRows, _ := h.q.ListWorkers(ctx)
	wIDs := make([]string, len(wRows))
	for i, w := range wRows {
		wIDs[i] = w.ID.String()
	}

	vRows, _ := h.q.GetActiveVendors(ctx)
	vIDs := make([]string, len(vRows))
	for i, v := range vRows {
		vIDs[i] = v.ID.String()
	}

	// Create 50 clients
	var clientIDs []string
	for i := 0; i < 50; i++ {
		fn := seedFirstNames[rng.Intn(len(seedFirstNames))]
		ln := seedLastNames[rng.Intn(len(seedLastNames))]
		email := fmt.Sprintf("%s.%s%d@example.com", fn, ln, i)
		var cid string
		if err := h.pool.QueryRow(ctx, `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'client') ON CONFLICT (email) DO NOTHING RETURNING id`, fn+" "+ln, email, "$2a$10$dummyhashforseedingsonly").Scan(&cid); err == nil {
			clientIDs = append(clientIDs, cid)
		}
	}

	if len(clientIDs) == 0 {
		writeError(w, http.StatusBadRequest, "no clients could be created")
		return
	}

	// Create 500 requests
	reqIDs := make([]string, 500)
	for i := 0; i < 500; i++ {
		svcID := svcIDs[rng.Intn(len(svcIDs))]
		fn := seedFirstNames[rng.Intn(len(seedFirstNames))]
		ln := seedLastNames[rng.Intn(len(seedLastNames))]
		city := seedCities[rng.Intn(len(seedCities))]
		area := seedAreas[rng.Intn(len(seedAreas))]
		street := seedStreets[rng.Intn(len(seedStreets))]
		addr := fmt.Sprintf("House %d, %s, %s, %s", rng.Intn(500)+1, street, area, city)
		phone := fmt.Sprintf("+923%d%d%06d", rng.Intn(9), rng.Intn(9), rng.Intn(999999))
		email := fmt.Sprintf("client%d@example.com", i)
		urgency := seedUrgencies[rng.Intn(len(seedUrgencies))]
		status := seedStatuses[rng.Intn(len(seedStatuses))]
		desc := seedDescs[rng.Intn(len(seedDescs))]
		preferredDate := time.Now().AddDate(0, 0, rng.Intn(60)+1)
		preferredTime := seedTimes[rng.Intn(len(seedTimes))]
		reqNum := fmt.Sprintf("REQ-%04d", i+1)
		clientID := clientIDs[rng.Intn(len(clientIDs))]

		var vendorID interface{}
		if len(vIDs) > 0 && rng.Intn(3) == 0 {
			vendorID = vIDs[rng.Intn(len(vIDs))]
		}

		h.pool.QueryRow(ctx,
			`INSERT INTO service_requests (request_number, client_id, service_id, description, preferred_date, preferred_time, urgency, full_name, phone, email, address, city, area, status, vendor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
			reqNum, clientID, svcID, desc, preferredDate, preferredTime, urgency, fn+" "+ln, phone, email, addr, city, area, status, vendorID,
		).Scan(&reqIDs[i])

		if len(wIDs) > 0 && rng.Intn(2) == 0 {
			h.pool.Exec(ctx, `INSERT INTO request_workers (request_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, reqIDs[i], wIDs[rng.Intn(len(wIDs))])
		}
	}

	// Create invoices for completed/invoiced requests
	invCount := 0
	for i := 0; i < 500; i++ {
		if reqIDs[i] == "" {
			continue
		}
		var status string
		h.pool.QueryRow(ctx, "SELECT status FROM service_requests WHERE id = $1", reqIDs[i]).Scan(&status)
		if status != "completed" && status != "invoiced" {
			continue
		}

		totalAmt := float64(rng.Intn(50000) + 5000)
		subtotal := totalAmt
		invStatus := seedInvStatus[rng.Intn(len(seedInvStatus))]
		invNum := fmt.Sprintf("INV-%04d", invCount+1)

		var clientID, clientName, clientPhone, clientAddr, serviceName string
		h.pool.QueryRow(ctx, `SELECT u.id, u.name, sr.phone, sr.address, s.name FROM service_requests sr JOIN users u ON u.id = sr.client_id JOIN services s ON s.id = sr.service_id WHERE sr.id = $1`, reqIDs[i]).Scan(&clientID, &clientName, &clientPhone, &clientAddr, &serviceName)

		var vendorCommission string
		if rng.Intn(3) == 0 {
			vendorCommission = fmt.Sprintf("%.2f", float64(rng.Intn(30)+5))
		} else {
			vendorCommission = "0.00"
		}

		var invoiceID string
		err := h.pool.QueryRow(ctx,
			`INSERT INTO invoices (invoice_number, request_id, client_id, client_name, client_address, client_phone, service_name, subtotal, total, status, vendor_commission) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
			invNum, reqIDs[i], clientID, clientName, clientAddr, clientPhone, serviceName, fmt.Sprintf("%.2f", subtotal), fmt.Sprintf("%.2f", totalAmt), invStatus, vendorCommission,
		).Scan(&invoiceID)
		if err != nil {
			continue
		}
		invCount++

		if invStatus == "paid" {
			var wIDs []string
			wr, _ := h.pool.Query(ctx, "SELECT worker_id FROM request_workers WHERE request_id = $1", reqIDs[i])
			for wr.Next() {
				var wid string
				wr.Scan(&wid)
				wIDs = append(wIDs, wid)
			}
			for _, wid := range wIDs {
				h.pool.Exec(ctx, `INSERT INTO invoice_commissions (invoice_id, worker_id, amount) VALUES ($1, $2, $3)`, invoiceID, wid, fmt.Sprintf("%.2f", float64(rng.Intn(2000)+500)))
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"clients": 50, "requests": 500, "invoices": invCount})
}

// POST /api/admin/data/clear
func (h *AdminDataHandler) ClearData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not begin transaction")
		return
	}
	defer tx.Rollback(ctx)

	// Delete in dependency order (children first, parents last)
	deleteOrder := []string{
		"worker_commissions",
		"invoice_commissions",
		"invoice_line_items",
		"invoices",
		"salary_payments",
		"advance_deductions",
		"worker_advances",
		"request_line_items",
		"request_images",
		"request_workers",
		"request_vendors",
		"service_requests",
		"audit_logs",
		"account_transactions",
		"expenses",
		"income",
		"inventory",
	}

	for _, t := range deleteOrder {
		if _, err := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s", t)); err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to clear %s: %v", t, err))
			return
		}
	}

	// Reset account balance
	if _, err := tx.Exec(ctx, "UPDATE system_accounts SET current_balance = 0"); err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to reset account: %v", err))
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Database cleared"})
}
