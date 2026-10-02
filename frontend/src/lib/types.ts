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

export interface RawMaterial {
  id: number;
  store_id: number;
  name: string;
  sku: string;
  unit: string;
  cost_per_unit: number;
  current_stock: number;
}

export interface RecipeItem {
  id: number;
  product_id: number;
  raw_material_id: number;
  quantity: number;
  raw_material?: RawMaterial;
}

export interface CashFlowReport {
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  payment_methods: Array<{ method: string; amount: number }>;
}

export interface DashboardMetrics {
  today_sales: number;
  today_expenses: number;
  today_transactions: number;
  top_products: Array<{ name: string; quantity: number }>;
}

export interface BatchSyncResponse {
  synced_sales: number;
  failed_sales: number;
}

export interface StoreSettings {
  id: number;
  store_id: number;
  logo_url: string;
  feature_financial_analysis: boolean;
  feature_custom_branding: boolean;
  feature_crm: boolean;
  feature_remove_watermark: boolean;
  feature_tax_calculation: boolean;
  feature_multi_branch: boolean;
  feature_logo_on_receipt: boolean;
  feature_customer_mgmt: boolean;
  feature_shift_mgmt: boolean;
  feature_advanced_stock: boolean;
  feature_smart_notif: boolean;
  feature_advanced_promo: boolean;
  notif_low_stock: boolean;
  notif_expired_stock: boolean;
  notif_due_bill: boolean;
  notif_high_transaction: boolean;
  notif_high_transaction_amt: number;
  notif_high_void: boolean;
  notif_high_void_amt: number;
  menu_slug: string;
  menu_published: boolean;
  menu_wa_number: string;
  menu_instagram: string;
  menu_grabfood: string;
  menu_gofood: string;
  menu_shopeefood: string;
  menu_delivery: boolean;
  menu_pickup: boolean;
  menu_reservation: boolean;
  menu_welcome_msg: string;
  menu_footer_msg: string;
  operating_hours_json: string;
  lease_start_date: string | null;
  lease_end_date: string | null;
  lease_monthly_cost: number;
  lease_interest_rate: number;
}

export interface Member {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
}
