package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
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

	tables := []string{
		"invoice_commissions",
		"invoices",
		"salary_payments",
		"advance_deductions",
		"worker_advances",
		"request_workers",
		"request_vendors",
		"service_requests",
		"users",
		"workers",
		"vendors",
		"account_transactions",
		"expenses",
		"income",
		"inventory",
	}

	for _, t := range tables {
		_, err := pool.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", t))
		if err != nil {
			log.Printf("skip truncate %s: %v", t, err)
		} else {
			fmt.Printf("Cleared: %s\n", t)
		}
	}

	// Reset system account balance
	_, _ = pool.Exec(ctx, "UPDATE system_accounts SET current_balance = 0")
	fmt.Println("Reset: system_accounts balance → 0")

	fmt.Println("\nDatabase wiped clean. Fresh as lemon 🍋")
}
