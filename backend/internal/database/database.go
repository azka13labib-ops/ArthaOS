package database

import (
	"log"

	"app/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB(dsn string) {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	createCustomTypes(DB)

	runSchemaMigrations(DB)

	err = DB.AutoMigrate(
		&models.User{},
		&models.Store{},
		&models.StoreMember{},
		&models.Product{},
		&models.InventoryMovement{},
		&models.Customer{},
		&models.Debt{},
		&models.DebtPayment{},
		&models.Transaction{},
		&models.TransactionItem{},
		&models.TransactionPayment{},
		&models.Subscription{},
		&models.WhatsappAccount{},
		&models.InboundMessage{},
		&models.ConversationSession{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	log.Println("Database connected and auto-migrated successfully")
}

func createCustomTypes(db *gorm.DB) {
	enums := []struct {
		name   string
		values string
	}{
		{"user_role", "'owner', 'admin', 'cashier'"},
		{"inventory_movement_type", "'in', 'out', 'adjustment', 'restock', 'sale'"},
		{"inventory_reference_type", "'transaction', 'initial', 'manual', 'loss', 'sale'"},
		{"transaction_type", "'sale', 'expense', 'debt_payment'"},
		{"expense_category", "'operational', 'inventory', 'salary', 'utility', 'other'"},
		{"payment_method", "'cash', 'transfer', 'qris', 'debt'"},
		{"debt_source", "'transaction', 'manual', 'sale'"},
		{"debt_status", "'unpaid', 'partially_paid', 'paid'"},
		{"subscription_plan", "'free', 'starter', 'pro'"},
		{"subscription_status", "'active', 'expired', 'cancelled', 'trial'"},
		{"wa_provider", "'meta_cloud', 'twilio', 'fonnte', 'wppconnect'"},
		{"wa_status", "'connected', 'disconnected', 'pending'"},
		{"inbound_processing_status", "'pending', 'processing', 'completed', 'failed', 'rejected'"},
		{"inbound_reject_reason", "'unauthorized', 'invalid_format', 'rate_limited', 'duplicate'"},
		{"conversation_state", "'idle', 'awaiting_confirmation', 'awaiting_product', 'awaiting_payment'"},
	}

	for _, e := range enums {
		sql := `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '` + e.name + `') THEN
					CREATE TYPE ` + e.name + ` AS ENUM (` + e.values + `);
				END IF;
			END $$;
		`
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning creating enum %s: %v", e.name, err)
		}
	}

	additionalValues := []struct {
		enumName string
		val      string
	}{
		{"transaction_type", "debt_payment"},
		{"inventory_movement_type", "restock"},
		{"inventory_movement_type", "sale"},
		{"inventory_reference_type", "sale"},
		{"debt_source", "sale"},
	}

	for _, v := range additionalValues {
		sql := `ALTER TYPE ` + v.enumName + ` ADD VALUE IF NOT EXISTS '` + v.val + `';`
		_ = db.Exec(sql)
	}
}

func runSchemaMigrations(db *gorm.DB) {
	patches := []struct {
		name string
		sql  string
	}{
		{
			name: "ensure users.password_hash column exists",
			sql: `
				DO $$
				BEGIN
					IF EXISTS (
						SELECT 1 FROM information_schema.columns
						WHERE table_name='users' AND column_name='password'
					) AND NOT EXISTS (
						SELECT 1 FROM information_schema.columns
						WHERE table_name='users' AND column_name='password_hash'
					) THEN
						ALTER TABLE users RENAME COLUMN password TO password_hash;
					ELSIF NOT EXISTS (
						SELECT 1 FROM information_schema.columns
						WHERE table_name='users' AND column_name='password_hash'
					) THEN
						ALTER TABLE users ADD COLUMN password_hash varchar(255);
					END IF;
				END $$;
			`,
		},
		{
			name: "drop users.role legacy column",
			sql: `
				DO $$
				BEGIN
					IF EXISTS (
						SELECT 1 FROM information_schema.columns
						WHERE table_name='users' AND column_name='role'
					) THEN
						ALTER TABLE users DROP COLUMN role;
					END IF;
				END $$;
			`,
		},
		{
			name: "cast debts.status to debt_status enum",
			sql: `
				DO $$
				BEGIN
					IF EXISTS (
						SELECT 1 FROM information_schema.columns
						WHERE table_name='debts' AND column_name='status' AND udt_name != 'debt_status'
					) THEN
						ALTER TABLE debts ALTER COLUMN status DROP DEFAULT;
						ALTER TABLE debts ALTER COLUMN status TYPE debt_status USING CASE 
							WHEN status = 'paid' THEN 'paid'::debt_status
							WHEN status = 'partially_paid' THEN 'partially_paid'::debt_status
							ELSE 'unpaid'::debt_status
						END;
						ALTER TABLE debts ALTER COLUMN status SET DEFAULT 'unpaid'::debt_status;
					END IF;
				END $$;
			`,
		},
		{
			name: "cast transactions.type to transaction_type enum",
			sql: `
				DO $$
				BEGIN
					IF EXISTS (
						SELECT 1 FROM information_schema.columns
						WHERE table_name='transactions' AND column_name='type' AND udt_name != 'transaction_type'
					) THEN
						ALTER TABLE transactions ALTER COLUMN type DROP DEFAULT;
						ALTER TABLE transactions ALTER COLUMN type TYPE transaction_type USING CASE
							WHEN type = 'expense' THEN 'expense'::transaction_type
							ELSE 'sale'::transaction_type
						END;
					END IF;
				END $$;
			`,
		},
	}

	for _, patch := range patches {
		if err := db.Exec(patch.sql).Error; err != nil {
			log.Printf("Schema migration note [%s]: %v", patch.name, err)
		} else {
			log.Printf("Schema migration OK: %s", patch.name)
		}
	}
}
