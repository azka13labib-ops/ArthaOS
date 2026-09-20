import {
  User,
  Store,
  Product,
  InventoryMovement,
  Transaction,
  Customer,
  Debt,
  DebtPayment,
  ProfitLossReport,
  StockValuationReport,
} from "./types";

const API_BASE = "http://localhost:3000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("artha_token");
}

interface RequestOptions extends RequestInit {
  storeId?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "omit",
    headers,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || response.statusText || "Permintaan gagal diproses";
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  auth: {
    async register(name: string, email: string, password: string):Promise<{ message: string; user: User }> {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
    },

    async login(email: string, password: string): Promise<{ message: string; token: string }> {
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    async me(): Promise<User> {
      return request("/auth/me");
    },
  },

  stores: {
    async list(): Promise<Store[]> {
      return request("/stores");
    },

    async getById(storeId: number): Promise<Store> {
      return request(`/stores/${storeId}`);
    },

    async create(name: string, address?: string, timezone?: string): Promise<{ message: string; store: Store }> {
      return request("/stores", {
        method: "POST",
        body: JSON.stringify({ name, address, timezone: timezone || "Asia/Jakarta" }),
      });
    },
  },

  products: {
    async list(storeId: number): Promise<Product[]> {
      return request(`/stores/${storeId}/products`);
    },

    async create(
      storeId: number,
      data: {
        name: string;
        sku: string;
        barcode?: string;
        buy_price: number;
        sell_price: number;
        initial_stock: number;
      }
    ): Promise<Product> {
      return request(`/stores/${storeId}/products`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          barcode: data.barcode?.trim() || null,
        }),
      });
    },

    async adjustStock(
      storeId: number,
      productId: number,
      quantityDelta: number,
      notes?: string
    ): Promise<{ message: string }> {
      return request(`/stores/${storeId}/products/${productId}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          quantity_delta: quantityDelta,
          notes: notes || "Penyesuaian manual",
        }),
      });
    },

    async getMovements(storeId: number, productId: number): Promise<InventoryMovement[]> {
      return request(`/stores/${storeId}/products/${productId}/movements`);
    },
  },

  sales: {
    async list(storeId: number): Promise<Transaction[]> {
      return request(`/stores/${storeId}/sales`);
    },

    async create(
      storeId: number,
      data: {
        items: Array<{ product_id: number; quantity: number }>;
        payments: Array<{
          amount: number;
          payment_method: "cash" | "transfer" | "qris" | "debt";
          customer_id?: number | null;
          due_date?: string | null;
        }>;
        description?: string;
      }
    ): Promise<Transaction> {
      return request(`/stores/${storeId}/sales`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  expenses: {
    async list(storeId: number): Promise<Transaction[]> {
      return request(`/stores/${storeId}/expenses`);
    },

    async create(
      storeId: number,
      data: {
        amount: number;
        category?: string;
        description: string;
        payment_method?: "cash" | "transfer";
      }
    ): Promise<Transaction> {
      return request(`/stores/${storeId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          amount: data.amount,
          category: data.category || "Operasional",
          description: data.description,
          payments: [
            {
              amount: data.amount,
              payment_method: data.payment_method || "cash",
            },
          ],
        }),
      });
    },
  },

  customers: {
    async list(storeId: number): Promise<Customer[]> {
      return request(`/stores/${storeId}/customers`);
    },

    async create(
      storeId: number,
      data: { name: string; phone?: string }
    ): Promise<Customer> {
      return request(`/stores/${storeId}/customers`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          phone: data.phone?.trim() || null,
        }),
      });
    },
  },

  debts: {
    async list(storeId: number): Promise<Debt[]> {
      return request(`/stores/${storeId}/debts`);
    },

    async pay(
      storeId: number,
      debtId: number,
      data: {
        amount: number;
        payment_method: "cash" | "transfer";
        notes?: string;
      }
    ): Promise<DebtPayment> {
      return request(`/stores/${storeId}/debts/${debtId}/payments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  reports: {
    async profitLoss(storeId: number, startDate?: string, endDate?: string): Promise<ProfitLossReport> {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const query = params.toString() ? `?${params.toString()}` : "";
      return request(`/stores/${storeId}/reports/profit-loss${query}`);
    },

    async stockValuation(storeId: number): Promise<StockValuationReport> {
      return request(`/stores/${storeId}/reports/stock-valuation`);
    },
  },

  whatsapp: {
    async link(storeId: number, phone: string): Promise<{ message: string; qr_code?: string }> {
      return request(`/stores/${storeId}/whatsapp/link`, {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
    },
  },

  ai: {
    async chat(
      storeId: number,
      message: string,
      history?: Array<{ role: "user" | "assistant"; content: string }>
    ): Promise<{
      response: string;
      model?: string;
      request_id?: string;
      total_tokens?: number;
      latency_ms?: number;
      timestamp: string;
    }> {
      return request(`/stores/${storeId}/ai/chat`, {
        method: "POST",
        body: JSON.stringify({ message, history }),
      });
    },

    async parseOrder(storeId: number, message: string): Promise<{
      customer_name: string;
      matched_customer_id?: number | null;
      items: {
        product_name: string;
        matched_product_id?: number | null;
        quantity: number;
        estimated_unit_price: number;
        subtotal: number;
      }[];
      total_estimated_amount: number;
      payment_method: string;
      delivery_notes?: string;
      confidence_score: number;
    }> {
      return request(`/stores/${storeId}/ai/parse-order`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },

    async inquiry(storeId: number, message: string): Promise<{
      reply: string;
      model?: string;
      request_id?: string;
      total_tokens?: number;
      latency_ms?: number;
    }> {
      return request(`/stores/${storeId}/ai/inquiry`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },

    async generatePromo(storeId: number, prompt: string, phone?: string): Promise<{
      promo_text: string;
      model?: string;
      request_id?: string;
      total_tokens?: number;
      latency_ms?: number;
    }> {
      return request(`/stores/${storeId}/ai/generate-promo`, {
        method: "POST",
        body: JSON.stringify({ prompt, phone }),
      });
    },
  },
};
