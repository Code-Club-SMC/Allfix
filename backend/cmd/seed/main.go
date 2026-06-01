package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	firstNames = []string{"Ahmed", "Ali", "Fatima", "Ayesha", "Hassan", "Sara", "Usman", "Zainab", "Bilal", "Maryam", "Omar", "Hira", "Tariq", "Nadia", "Kamran", "Sana", "Faisal", "Rabia", "Imran", "Amna", "Saad", "Mehwish", "Asad", "Saima", "Rizwan", "Aisha", "Danish", "Huma", "Waqar", "Farah", "Junaid", "Nida", "Shahid", "Bushra", "Naveed", "Rubina", "Tahir", "Samina", "Adnan", "Kiran", "Hamza", "Iqra", "Yasir", "Sadia", "Kashif", "Zara", "Arif", "Lubna", "Shoaib", "Nasreen"}
	lastNames  = []string{"Khan", "Ahmed", "Ali", "Malik", "Hussain", "Shah", "Iqbal", "Butt", "Mirza", "Chaudhry", "Siddiqui", "Qureshi", "Raza", "Javed", "Anwar", "Rashid", "Akram", "Farooq", "Aslam", "Ibrahim", "Yousaf", "Majeed", "Nasir", "Sultan", "Zafar", "Rehman", "Karim", "Bashir", "Saleem", "Haider"}
	cities     = []string{"Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala"}
	areas      = []string{"Gulberg", "DHA", "Model Town", "Johar Town", "Clifton", "Bahria Town", "F-8", "F-10", "Satellite Town", "Madina Town", "University Town", "Cantt", "Saddar", "Garden Town", "Wapda Town"}
	streets    = []string{"Street 5", "Street 12", "Street 3", "Street 8", "Street 21", "Street 7", "Street 15", "Street 2", "Street 9", "Street 18"}
	urgencies  = []string{"standard", "urgent"}
	statuses   = []string{"pending", "assigned", "in_progress", "completed", "invoiced"}
	times      = []string{"09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"}
	descs      = []string{
		"Need complete setup/installation as discussed",
		"Repair work needed urgently",
		"New installation required for residential property",
		"Maintenance and servicing of existing setup",
		"Full replacement of old system",
		"Inspection and minor fixes required",
		"Emergency repair - system completely down",
		"Upgrade existing setup to newer model",
		"Installation at new construction site",
		"Routine maintenance check-up",
	}
	invoiceStatuses = []string{"draft", "sent", "paid"}
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// Get existing IDs
	var serviceIDs, workerIDs, vendorIDs []string
	rows, _ := pool.Query(ctx, "SELECT id FROM services")
	for rows.Next() {
		var id string
		rows.Scan(&id)
		serviceIDs = append(serviceIDs, id)
	}
	wRows, _ := pool.Query(ctx, "SELECT id FROM workers")
	for wRows.Next() {
		var id string
		wRows.Scan(&id)
		workerIDs = append(workerIDs, id)
	}
	vRows, _ := pool.Query(ctx, "SELECT id FROM vendors")
	for vRows.Next() {
		var id string
		vRows.Scan(&id)
		vendorIDs = append(vendorIDs, id)
	}

	if len(serviceIDs) == 0 {
		log.Fatal("No services. Run migrations first.")
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Create 50 clients
	clientIDs := make([]string, 50)
	for i := 0; i < 50; i++ {
		fn := firstNames[rng.Intn(len(firstNames))]
		ln := lastNames[rng.Intn(len(lastNames))]
		email := fmt.Sprintf("%s.%s%d@example.com", fn, ln, i)
		pool.Exec(ctx, `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'client') ON CONFLICT (email) DO NOTHING`, fn+" "+ln, email, "$2a$10$dummyhashforseedingsonly")
		pool.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", email).Scan(&clientIDs[i])
	}

	// Create 500 requests
	reqIDs := make([]string, 500)
	for i := 0; i < 500; i++ {
		clientID := clientIDs[rng.Intn(len(clientIDs))]
		serviceID := serviceIDs[rng.Intn(len(serviceIDs))]
		fn := firstNames[rng.Intn(len(firstNames))]
		ln := lastNames[rng.Intn(len(lastNames))]
		city := cities[rng.Intn(len(cities))]
		area := areas[rng.Intn(len(areas))]
		street := streets[rng.Intn(len(streets))]
		addr := fmt.Sprintf("House %d, %s, %s, %s", rng.Intn(500)+1, street, area, city)
		phone := fmt.Sprintf("+923%d%d%06d", rng.Intn(9), rng.Intn(9), rng.Intn(999999))
		email := fmt.Sprintf("client%d@example.com", i)
		urgency := urgencies[rng.Intn(len(urgencies))]
		desc := descs[rng.Intn(len(descs))]
		preferredDate := time.Now().AddDate(0, 0, rng.Intn(60)+1)
		preferredTime := times[rng.Intn(len(times))]
		reqNum := fmt.Sprintf("REQ-%04d", i+1)

		var vendorID interface{}
		if len(vendorIDs) > 0 && rng.Intn(3) == 0 {
			vendorID = vendorIDs[rng.Intn(len(vendorIDs))]
		}

		// Decide worker assignment before insert so status is correct from the start
		var workerID interface{}
		if len(workerIDs) > 0 && rng.Intn(2) == 0 {
			workerID = workerIDs[rng.Intn(len(workerIDs))]
		}

		// Compute final status before insert
		var finalStatus string
		hasVendor := vendorID != nil
		hasWorker := workerID != nil
		if !hasWorker && !hasVendor {
			finalStatus = "pending"
		} else {
			assignedStatuses := []string{"assigned", "in_progress", "completed", "invoiced"}
			finalStatus = assignedStatuses[rng.Intn(len(assignedStatuses))]
		}

		err := pool.QueryRow(ctx,
			`INSERT INTO service_requests (request_number, client_id, service_id, description, preferred_date, preferred_time, urgency, full_name, phone, email, address, city, area, status, vendor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
			reqNum, clientID, serviceID, desc, preferredDate, preferredTime, urgency, fn+" "+ln, phone, email, addr, city, area, finalStatus, vendorID,
		).Scan(&reqIDs[i])
		if err != nil {
			log.Printf("skip req %d: %v", i, err)
		}

		// Assign worker if chosen
		if workerID != nil {
			pool.Exec(ctx, `INSERT INTO request_workers (request_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, reqIDs[i], workerID)
		}
	}

	// Create invoices for completed/invoiced requests
	invoiceCount := 0
	for i := 0; i < 500; i++ {
		if reqIDs[i] == "" {
			continue
		}
		// Check status
		var status string
		pool.QueryRow(ctx, "SELECT status FROM service_requests WHERE id = $1", reqIDs[i]).Scan(&status)
		if status != "completed" && status != "invoiced" {
			continue
		}

		totalAmt := float64(rng.Intn(50000) + 5000)
		subtotal := totalAmt
		invStatus := invoiceStatuses[rng.Intn(len(invoiceStatuses))]
		invNum := fmt.Sprintf("INV-%04d", invoiceCount+1)

		var clientID, clientName, clientPhone, clientAddr, serviceName string
		pool.QueryRow(ctx, `SELECT u.id, u.name, sr.phone, sr.address, s.name FROM service_requests sr JOIN users u ON u.id = sr.client_id JOIN services s ON s.id = sr.service_id WHERE sr.id = $1`, reqIDs[i]).Scan(&clientID, &clientName, &clientPhone, &clientAddr, &serviceName)

		var vendorCommission string
		if rng.Intn(3) == 0 {
			vc := float64(rng.Intn(30) + 5)
			vendorCommission = fmt.Sprintf("%.2f", vc)
		} else {
			vendorCommission = "0.00"
		}

		var invoiceID string
		err := pool.QueryRow(ctx,
			`INSERT INTO invoices (invoice_number, request_id, client_id, client_name, client_address, client_phone, service_name, subtotal, total, status, vendor_commission) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
			invNum, reqIDs[i], clientID, clientName, clientAddr, clientPhone, serviceName, fmt.Sprintf("%.2f", subtotal), fmt.Sprintf("%.2f", totalAmt), invStatus, vendorCommission,
		).Scan(&invoiceID)
		if err != nil {
			log.Printf("skip invoice %d: %v", invoiceCount, err)
			continue
		}
		invoiceCount++

		// Add worker commissions and financial records for paid invoices
		if invStatus == "paid" {
			var wIDs []string
			wRows, _ := pool.Query(ctx, "SELECT worker_id FROM request_workers WHERE request_id = $1", reqIDs[i])
			for wRows.Next() {
				var wid string
				wRows.Scan(&wid)
				wIDs = append(wIDs, wid)
			}
			var totalCommission float64
			for _, wid := range wIDs {
				commAmt := float64(rng.Intn(2000) + 500)
				pool.Exec(ctx, `INSERT INTO invoice_commissions (invoice_id, worker_id, amount) VALUES ($1, $2, $3)`, invoiceID, wid, fmt.Sprintf("%.2f", commAmt))
				// Create worker_commissions (actual paid commissions)
				pool.Exec(ctx, `INSERT INTO worker_commissions (worker_id, invoice_id, amount, status, paid_at) VALUES ($1, $2, $3, 'paid', NOW())`, wid, invoiceID, fmt.Sprintf("%.2f", commAmt))
				totalCommission += commAmt
			}

			// Credit account with invoice total
			pool.Exec(ctx, `UPDATE system_accounts SET current_balance = current_balance + $1, updated_at = NOW()`, fmt.Sprintf("%.2f", totalAmt))

			// Create income record (vendorCommission is now a percentage)
			var vc float64
			fmt.Sscanf(vendorCommission, "%f", &vc)
			vendorCommissionAmt := totalAmt * vc / 100
			netIncome := totalAmt - totalCommission - vendorCommissionAmt
			if netIncome < 0 {
				netIncome = 0
			}
			pool.Exec(ctx, `INSERT INTO income (date, description, category, amount, source, invoice_id) VALUES (NOW(), $1, 'invoice_payment', $2, $3, $4)`,
				fmt.Sprintf("Invoice payment: %s", invNum), fmt.Sprintf("%.2f", netIncome), clientName, invoiceID)
		}
	}

	fmt.Printf("Done. 50 clients, 500 requests, %d invoices seeded.\n", invoiceCount)
}
