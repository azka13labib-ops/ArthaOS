export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Store {
  id: number;
  name: string;
  address?: string;
  timezone?: string;
  created_at?: string;
}

export interface Product {
  id: number;
  store_id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  buy_price: number;
  sell_price: number;
  current_stock: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: number;
  store_id: number;
  product_id: number;
  movement_type: "sale" | "restock" | "adjustment" | "loss";
  quantity_delta: number;
  reference_type: string;
  reference_id?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  quantity: number;
  sell_price: number;
  cost_price: number;
  subtotal: number;
  product?: Product;
}

export interface TransactionPayment {
  id: number;
  transaction_id: number;
  amount: number;
  payment_method: "cash" | "transfer" | "qris" | "debt";
  customer_id?: number | null;
}

export interface Transaction {
  id: number;
  store_id: number;
  type: "sale" | "expense";
  total_amount: number;
  total_cost?: number;
  description?: string | null;
  occurred_at: string;
  items?: TransactionItem[];
  payments?: TransactionPayment[];
}

export interface Customer {
  id: number;
  store_id: number;
  name: string;
  phone?: string | null;
  phone_number?: string | null;
  created_at?: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: number;
  payment_method: string;
  paid_at: string;
  notes?: string | null;
}

export interface Debt {
  id: number;
  store_id: number;
  customer_id: number;
  customer?: Customer;
  transaction_id?: number | null;
  source: string;
  original_amount: number;
  remaining_amount: number;
  status: "unpaid" | "partial" | "paid";
  due_date?: string | null;
  created_at: string;
  payments?: DebtPayment[];
}

export interface ProfitLossReport {
  gross_sales: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
}

export interface StockValuationReport {
  total_inventory_items: number;
  total_asset_cost: number;
  total_asset_retail: number;
  potential_gross_profit: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
