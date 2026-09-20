"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  UserPlus,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen,
  X,
  Package,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import { Product, Customer, CartItem, Transaction } from "@/lib/types";

export default function PosPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris" | "debt">("cash");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Customer creation modal inside POS
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Success Receipt Modal
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadInitialData = useCallback(async () => {
    if (!activeStore) return;
    try {
      const [prods, custs] = await Promise.all([
        api.products.list(activeStore.id),
        api.customers.list(activeStore.id).catch(() => []),
      ]);
      setProducts(prods);
      setCustomers(custs);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    let isMounted = true;
    if (activeStore && isMounted) {
      loadInitialData();
    }
    return () => {
      isMounted = false;
    };
  }, [activeStore, loadInitialData]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.current_stock) return item;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.sell_price * item.quantity,
    0
  );
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const parsedCashGiven = Number(cashGiven) || 0;
  const changeAmount = Math.max(0, parsedCashGiven - totalAmount);

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  // Handle barcode scanner Enter key in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  // Create new customer on the fly
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !newCustName.trim()) return;

    setIsCreatingCustomer(true);
    try {
      const created = await api.customers.create(activeStore.id, {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
      });
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomerId(created.id);
      setIsAddCustomerOpen(false);
      setNewCustName("");
      setNewCustPhone("");
    } catch {
      // error
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Submit sale transaction
  const handleProcessSale = async () => {
    if (!activeStore || cart.length === 0) return;
    setCheckoutError("");

    if (paymentMethod === "cash" && parsedCashGiven < totalAmount) {
      setCheckoutError("Nominal uang tunai kurang dari total belanja");
      return;
    }

    if (paymentMethod === "debt" && !selectedCustomerId) {
      setCheckoutError("Pilih pelanggan untuk mencatat transaksi Kasbon / Piutang");
      return;
    }

    setIsSubmittingSale(true);

    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const paymentsPayload = [
        {
          amount: totalAmount,
          payment_method: paymentMethod,
          customer_id: paymentMethod === "debt" ? Number(selectedCustomerId) : null,
          due_date: paymentMethod === "debt" && dueDate ? dueDate : null,
        },
      ];

      const res = await api.sales.create(activeStore.id, {
        items: itemsPayload,
        payments: paymentsPayload,
        description: notes.trim() || undefined,
      });

      // Update local product stocks
      setProducts((prev) =>
        prev.map((prod) => {
          const cartMatch = cart.find((c) => c.product.id === prod.id);
          if (cartMatch) {
            return {
              ...prod,
              current_stock: Math.max(0, prod.current_stock - cartMatch.quantity),
            };
          }
          return prod;
        })
      );

      setCompletedTransaction(res);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      setCart([]);
      setCashGiven("");
      setSelectedCustomerId("");
      setDueDate("");
      setNotes("");

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      setCheckoutError(
        err instanceof Error ? err.message : "Gagal memproses transaksi penjualan"
      );
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!activeStore) {
    return (
      <AppLayout>
        <div className="p-6">
          <EmptyState
            title="Pilih Toko Terlebih Dahulu"
            description="Silakan pilih outlet aktif Anda dari menu samping."
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-100">
        {/* Left Column: Product Catalog & Search (60%) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
          {/* Top Search Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nama produk, SKU, atau scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:block">
              {filteredProducts.length} Produk
            </div>
          </div>

          {/* Product Grid Catalog */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="lg" label="Memuat katalog produk..." />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="w-8 h-8 text-slate-400" />}
                title="Produk Tidak Ditemukan"
                description={
                  searchQuery
                    ? `Tidak ada produk yang cocok dengan pencarian "${searchQuery}".`
                    : "Belum ada produk di outlet ini. Tambahkan produk di menu Stok & Katalog."
                }
                actionLabel={searchQuery ? "Bersihkan Pencarian" : "Tambah Produk Baru"}
                onAction={() =>
                  searchQuery ? setSearchQuery("") : router.push("/inventory")
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.current_stock <= 0;
                  const inCartItem = cart.find((c) => c.product.id === p.id);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all select-none ${
                        isOutOfStock
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : inCartItem
                          ? "bg-emerald-50/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
                      }`}
                    >
                      {/* Product details */}
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase truncate">
                            {p.sku}
                          </span>
                          {inCartItem && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                              {inCartItem.quantity}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                      </div>

                      {/* Price & Stock info */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-600">
                          {formatIDR(p.sell_price)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-700"
                              : p.current_stock <= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isOutOfStock ? "Habis" : `${p.current_stock} pcs`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Cart & Checkout Panel (40%) */}
        <div className="w-full lg:w-96 xl:w-105 flex flex-col bg-slate-50 shrink-0 border-t lg:border-t-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Keranjang Belanja</h3>
              <Badge variant="neutral" size="sm">
                {totalItemsCount} pcs
              </Badge>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Kosongkan
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Keranjang Masih Kosong</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-50">
                  Pilih produk dari katalog di sebelah kiri untuk memulai transaksi.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {formatIDR(item.product.sell_price)} x {item.quantity} ={" "}
                      <span className="text-emerald-700 font-semibold">
                        {formatIDR(item.product.sell_price * item.quantity)}
                      </span>
                    </p>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-2xs font-bold text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      disabled={item.quantity >= item.product.current_stock}
                      className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center shadow-2xs font-bold text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      title="Hapus dari keranjang"
                      className="w-6 h-6 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Bottom Summary & Checkout Button */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal Item</span>
                <span className="font-semibold text-slate-900">{formatIDR(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak / Diskon</span>
                <span className="font-medium text-slate-500">Rp 0</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total Pembayaran</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {formatIDR(totalAmount)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full text-sm font-bold tracking-wide shadow-md"
              disabled={cart.length === 0}
              onClick={() => {
                setCashGiven(totalAmount.toString());
                setIsCheckoutOpen(true);
              }}
            >
              Bayar Sekarang ({totalItemsCount} item) <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Pembayaran Transaksi Kasir"
        description="Pilih metode bayar pelanggan untuk menyelesaikan pesanan."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {checkoutError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {checkoutError}
            </div>
          )}

          {/* Total Payable Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              Total yang Harus Dibayar
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
              {formatIDR(totalAmount)}
            </p>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  paymentMethod === "cash"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  paymentMethod === "transfer"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("qris")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  paymentMethod === "qris"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QRIS Instan</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("debt")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  paymentMethod === "debt"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>Kasbon / Utang</span>
              </button>
            </div>
          </div>

          {/* Method 1: Cash Options & Quick Denominations */}
          {paymentMethod === "cash" && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <Input
                label="Nominal Uang Diterima (Rp)"
                type="number"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder="0"
                autoFocus
              />

              {/* Fast Denomination Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Uang Pas", val: totalAmount },
                  { label: "10rb", val: 10000 },
                  { label: "20rb", val: 20000 },
                  { label: "50rb", val: 50000 },
                  { label: "100rb", val: 100000 },
                  { label: "200rb", val: 200000 },
                ].map((denom) => (
                  <Button
                    key={denom.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCashGiven(denom.val.toString())}
                  >
                    {denom.label}
                  </Button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-700">Kembalian:</span>
                <span
                  className={
                    parsedCashGiven >= totalAmount
                      ? "text-emerald-700 text-base"
                      : "text-rose-600 text-base"
                  }
                >
                  {parsedCashGiven >= totalAmount
                    ? formatIDR(changeAmount)
                    : `Kurang ${formatIDR(totalAmount - parsedCashGiven)}`}
                </span>
              </div>
            </div>
          )}

          {/* Method 2: Transfer details */}
          {paymentMethod === "transfer" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Rekening Tujuan Toko:</p>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <p className="font-mono text-slate-900 font-bold">BCA: 8830-1928-392</p>
                <p className="text-slate-500">A/N: {activeStore.name}</p>
              </div>
              <p className="text-[11px] text-slate-500">
                Pastikan bukti transfer telah terverifikasi sebelum menyelesaikan transaksi.
              </p>
            </div>
          )}

          {/* Method 3: QRIS View */}
          {paymentMethod === "qris" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="w-36 h-36 bg-white p-2 border border-slate-200 rounded-lg flex items-center justify-center mb-2">
                <QrCode className="w-28 h-28 text-slate-900" />
              </div>
              <p className="text-xs font-semibold text-slate-800">Scan QRIS Standar Nasional</p>
              <p className="text-[11px] text-slate-500">Gopay, OVO, Dana, ShopeePay, BCA Mobile</p>
            </div>
          )}

          {/* Method 4: Kasbon / Debt options */}
          {paymentMethod === "debt" && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-amber-900 uppercase">
                  Pilih Pelanggan Kasbon
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="text-amber-800 font-bold flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah Pelanggan
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <option value="">-- Pilih Nama Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>

              <Input
                label="Tanggal Jatuh Tempo (Opsional)"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <Input
            label="Catatan Transaksi (Opsional)"
            placeholder="Contoh: Titip ke kurir / Meja 03"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isSubmittingSale}
              onClick={handleProcessSale}
              className="px-6"
            >
              Selesaikan Transaksi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Daftarkan Pelanggan Baru"
        description="Pelanggan baru akan otomatis tersimpan dalam daftar kontak toko."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Pak Joko"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Nomor WhatsApp / HP (Opsional)"
            placeholder="Contoh: 08123456789"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCustomerOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreatingCustomer}>
              Simpan Pelanggan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt & Success Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Transaksi Berhasil!"
        maxWidth="md"
      >
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-1">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-xs text-slate-500">
            Transaksi telah tersimpan dalam database dan stok produk telah diperbarui.
          </p>

          {/* Receipt Preview Box */}
          <div
            id="printable-receipt"
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-3 font-mono text-slate-800"
          >
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <p className="font-bold text-sm tracking-wider uppercase">{activeStore.name}</p>
              <p className="text-[10px] text-slate-500">{activeStore.address || "Outlet Resmi"}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {formatDate(completedTransaction?.occurred_at || new Date())}
              </p>
              <p className="text-[10px] text-slate-400">
                TRX-{completedTransaction?.id.toString().padStart(5, "0")}
              </p>
            </div>

            {/* Receipt Items */}
            <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300">
              {completedTransaction?.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate pr-2">
                    {it.quantity}x Item #{it.product_id}
                  </span>
                  <span>{formatIDR(it.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{formatIDR(completedTransaction?.total_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Metode Bayar:</span>
                <span className="uppercase">
                  {completedTransaction?.payments?.[0]?.payment_method || "CASH"}
                </span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
              Terima kasih atas kunjungan Anda!
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintReceipt}
              className="flex-1"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Cetak Struk
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsReceiptOpen(false)}
              className="flex-1"
            >
              Transaksi Baru
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
