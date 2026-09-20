-- PostgreSQL Schema Definition (Source of Truth) for Admin UMKM V2.3

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic_49k', 'pro_99k');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'trial');
CREATE TYPE wa_provider AS ENUM ('baileys', 'wwebjs', 'official_meta');
CREATE TYPE wa_status AS ENUM ('connected', 'disconnected', 'pending');
CREATE TYPE inventory_movement_type AS ENUM ('restock', 'sale', 'damaged', 'adjustment');
CREATE TYPE inventory_reference_type AS ENUM ('transaction', 'manual');
CREATE TYPE transaction_type AS ENUM ('sale', 'expense', 'debt_payment');
CREATE TYPE expense_category AS ENUM ('electricity', 'rent', 'salary', 'packaging', 'transport', 'other');
CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'transfer', 'debt');
CREATE TYPE debt_source AS ENUM ('sale', 'manual', 'opening_balance');
CREATE TYPE debt_status AS ENUM ('unpaid', 'partially_paid', 'paid');
CREATE TYPE inbound_processing_status AS ENUM ('received', 'processing', 'done', 'skipped', 'rejected');
CREATE TYPE inbound_reject_reason AS ENUM ('signature_invalid', 'duplicate', 'parse_error');
CREATE TYPE conversation_state AS ENUM ('idle', 'waiting_product_selection', 'waiting_confirm');

-- ==========================================
-- 2. CORE ENTITIES
-- ==========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store_members (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, user_id)
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL,
    status subscription_status NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE whatsapp_accounts (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    provider wa_provider NOT NULL,
    status wa_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. PRODUCT & INVENTORY
-- ==========================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    buy_price BIGINT NOT NULL CHECK (buy_price >= 0),
    sell_price BIGINT NOT NULL CHECK (sell_price >= 0),
    current_stock INTEGER NOT NULL CHECK (current_stock >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, sku)
);

CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type inventory_movement_type NOT NULL,
    quantity_delta INTEGER NOT NULL,
    reference_type inventory_reference_type NOT NULL,
    reference_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. TRANSACTIONS
-- ==========================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
    total_cost BIGINT NOT NULL CHECK (total_cost >= 0),
    description TEXT,
    expense_category expense_category,
    correlation_id VARCHAR(255),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_price BIGINT NOT NULL CHECK (cost_price >= 0),
    sell_price BIGINT NOT NULL CHECK (sell_price >= 0),
    subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transaction_payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    payment_method payment_method NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. DEBTS
-- ==========================================
CREATE TABLE debts (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE RESTRICT,
    source debt_source NOT NULL,
    original_amount BIGINT NOT NULL CHECK (original_amount > 0),
    remaining_amount BIGINT NOT NULL CHECK (remaining_amount >= 0),
    status debt_status NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE debt_payments (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. WHATSAPP & LOGGING
-- ==========================================
CREATE TABLE inbound_messages (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    whatsapp_account_id INTEGER NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    processing_status inbound_processing_status NOT NULL,
    reject_reason inbound_reject_reason,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (whatsapp_account_id, whatsapp_message_id)
);

CREATE TABLE conversation_sessions (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    whatsapp_account_id INTEGER NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    state conversation_state NOT NULL,
    context_json JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    actor_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    correlation_id VARCHAR(255),
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
