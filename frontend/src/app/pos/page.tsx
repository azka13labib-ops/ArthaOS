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
    if (activeStore) {
      loadInitialData().then(() => {
        if (!isMounted) return;
      });
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
        colors: ['#047857', '#10b981', '#059669', '#ffffff'] // Emerald theme
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
        <div className="p-8 max-w-3xl mx-auto mt-12">
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
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Left Column: Product Catalog & Search (60%) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/10">
          {/* Top Search Bar */}
          <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex items-center gap-3 shrink-0">
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-400 transition-colors" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nama produk, SKU, atau scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 hover:border-white/20 rounded-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:block">
              {filteredProducts.length} Produk
            </div>
          </div>

          {/* Product Grid Catalog */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="w-8 h-8 text-slate-500" />}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-0 border-t border-l border-white/10">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.current_stock <= 0;
                  const inCartItem = cart.find((c) => c.product.id === p.id);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`relative flex flex-col justify-between p-4 border-b border-r border-white/10 text-left transition-all select-none ${
                        isOutOfStock
                          ? "bg-white/5 opacity-60 cursor-not-allowed"
                          : inCartItem
                          ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/50"
                          : "bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/5 active:bg-white/10"
                      }`}
                    >
                      {/* Product details */}
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase truncate">
                            {p.sku}
                          </span>
                          {inCartItem && (
                            <span className="w-5 h-5 bg-emerald-500 text-slate-950 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                              {inCartItem.quantity}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                      </div>

                      {/* Price & Stock info */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-emerald-400">
                          {formatIDR(p.sell_price)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-300"
                              : p.current_stock <= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-white/10 text-slate-500"
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
        <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-white/5 backdrop-blur-xl border-white/10 text-white shrink-0 border-t lg:border-t-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-white" />
              <h3 className="font-semibold text-sm text-white tracking-tight">Keranjang</h3>
              <Badge variant="neutral" size="sm" className="rounded-none font-medium">
                {totalItemsCount} item
              </Badge>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold uppercase tracking-wider flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Kosongkan
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingCart className="w-10 h-10 stroke-1 mb-3 text-slate-500" />
                <p className="text-sm font-medium text-slate-500">Belum ada pesanan</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih produk dari katalog untuk memulai.
                </p>
              </div>
            ) : (
              <div className="border border-white/10 divide-y divide-slate-200">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-white/5 backdrop-blur-xl border-white/10 text-white flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <p className="text-sm font-semibold text-white truncate flex-1 leading-snug">
                        {item.product.name}
                      </p>
                      <p className="text-sm font-bold text-white text-right shrink-0">
                        {formatIDR(item.product.sell_price * item.quantity)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-400 font-medium">
                        {formatIDR(item.product.sell_price)} x {item.quantity}
                      </p>
                      
                      {/* Quantity Controller */}
                      <div className="flex items-center gap-1 border border-white/10 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 text-slate-500 hover:bg-white/10 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.current_stock}
                          className="w-6 h-6 text-slate-500 hover:bg-white/10 disabled:opacity-40 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-6 h-6 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Bottom Summary & Checkout Button */}
          <div className="p-5 bg-white/5 backdrop-blur-xl border-white/10 text-white border-t border-white/10 space-y-4 shrink-0">
            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatIDR(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak / Diskon</span>
                <span className="font-medium text-slate-400">Rp 0</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                <span className="text-sm font-semibold text-white">Total Tagihan</span>
                <span className="text-2xl font-bold text-emerald-400 tracking-tight">
                  {formatIDR(totalAmount)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold tracking-wide rounded-none h-12 bg-white/10 hover:bg-white/20 hover:bg-emerald-400 text-slate-950 border-transparent"
              disabled={cart.length === 0}
              onClick={() => {
                setCashGiven(totalAmount.toString());
                setIsCheckoutOpen(true);
              }}
            >
              Bayar Sekarang <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Pembayaran"
        description="Selesaikan transaksi dengan memilih metode pembayaran."
        maxWidth="lg"
      >
        <div className="space-y-5 pt-2">
          {checkoutError && (
            <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20">
              {checkoutError}
            </div>
          )}

          {/* Total Payable Banner */}
          <div className="p-5 bg-white/5 border border-white/10 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total Tagihan
            </p>
            <p className="text-4xl font-light text-white tracking-tight">
              {formatIDR(totalAmount)}
            </p>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wide mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-white/10">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-3 border-r border-b sm:border-b-0 border-white/10 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all ${
                  paymentMethod === "cash"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white/5 backdrop-blur-xl border-white/10 text-white text-slate-500 hover:bg-white/5"
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`p-3 border-r border-b sm:border-b-0 border-white/10 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all ${
                  paymentMethod === "transfer"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white/5 backdrop-blur-xl border-white/10 text-white text-slate-500 hover:bg-white/5"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("qris")}
                className={`p-3 border-r border-white/10 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all ${
                  paymentMethod === "qris"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white/5 backdrop-blur-xl border-white/10 text-white text-slate-500 hover:bg-white/5"
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("debt")}
                className={`p-3 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all ${
                  paymentMethod === "debt"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white/5 backdrop-blur-xl border-white/10 text-white text-slate-500 hover:bg-white/5"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>Kasbon</span>
              </button>
            </div>
          </div>

          {/* Method 1: Cash Options & Quick Denominations */}
          {paymentMethod === "cash" && (
            <div className="space-y-4">
              <Input
                label="Nominal Uang Diterima (Rp)"
                type="number"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder="0"
                autoFocus
              />

              {/* Fast Denomination Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "Uang Pas", val: totalAmount },
                  { label: "10rb", val: 10000 },
                  { label: "20rb", val: 20000 },
                  { label: "50rb", val: 50000 },
                  { label: "100rb", val: 100000 },
                  { label: "200rb", val: 200000 },
                ].map((denom) => (
                  <button
                    key={denom.label}
                    type="button"
                    className="px-3 py-1.5 border border-white/10 text-xs font-medium text-slate-500 hover:bg-white/5 hover:border-white/20 transition-colors"
                    onClick={() => setCashGiven(denom.val.toString())}
                  >
                    {denom.label}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Kembalian</span>
                <span
                  className={
                    parsedCashGiven >= totalAmount
                      ? "text-3xl font-light text-white"
                      : "text-lg font-medium text-rose-400"
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
            <div className="p-5 bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 space-y-3 text-sm text-slate-500 text-center">
              <p className="font-medium text-white uppercase tracking-widest text-xs">Rekening Tujuan</p>
              <div className="p-4 bg-white/5 border border-white/10">
                <p className="font-mono text-xl text-white font-bold tracking-widest">BCA 8830 1928 392</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">A/N {activeStore.name}</p>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Pastikan mutasi dana telah masuk sebelum menyelesaikan transaksi.
              </p>
            </div>
          )}

          {/* Method 3: QRIS View */}
          {paymentMethod === "qris" && (
            <div className="p-6 bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 flex flex-col items-center justify-center text-center">
              <div className="w-40 h-40 bg-white/5 backdrop-blur-xl border-white/10 text-white p-3 border border-white/10 flex items-center justify-center mb-4">
                <QrCode className="w-32 h-32 text-white" />
              </div>
              <p className="text-sm font-semibold text-white uppercase tracking-wider">QRIS Standar Nasional</p>
              <p className="text-[11px] text-slate-400 mt-1">Dukung pembayaran dari semua aplikasi E-Wallet & Mobile Banking</p>
            </div>
          )}

          {/* Method 4: Kasbon / Debt options */}
          {paymentMethod === "debt" && (
            <div className="p-4 bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wide">
                  Pilih Pelanggan Kasbon
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="text-xs font-semibold text-emerald-400 flex items-center gap-1 hover:text-emerald-300"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah Baru
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 text-sm text-white focus-visible:outline-none focus-visible:border-slate-400 rounded-none"
              >
                <option value="">-- Pilih Pelanggan --</option>
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
            placeholder="Contoh: Dibungkus plastik pisah"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-6"
              onClick={() => setIsCheckoutOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              className="rounded-none px-8 bg-white/10 hover:bg-white/20 hover:bg-emerald-400 text-slate-950"
              isLoading={isSubmittingSale}
              onClick={handleProcessSale}
            >
              Proses Transaksi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Pelanggan Baru"
        description="Data pelanggan akan tersimpan untuk transaksi selanjutnya."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-4">
          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Joko Widodo"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Nomor Telepon / WhatsApp (Opsional)"
            placeholder="Contoh: 0812..."
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsAddCustomerOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="rounded-none bg-white/10 hover:bg-white/20 text-white hover:bg-slate-800" isLoading={isCreatingCustomer}>
              Simpan Data
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt & Success Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Pembayaran Berhasil"
        maxWidth="md"
      >
        <div className="space-y-6 text-center pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 text-white mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Transaksi telah tersimpan dan stok otomatis terpotong.
          </p>

          {/* Receipt Preview Box */}
          <div
            id="printable-receipt"
            className="p-6 bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 text-left text-xs space-y-4 font-mono text-white max-w-sm mx-auto"
          >
            <div className="text-center pb-4 border-b border-dashed border-white/20">
              <p className="font-bold text-base tracking-widest uppercase mb-1">{activeStore.name}</p>
              <p className="text-[10px] text-slate-400 uppercase">{activeStore.address || "Outlet Resmi"}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                {formatDate(completedTransaction?.occurred_at || new Date())}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                TRX-{completedTransaction?.id.toString().padStart(5, "0")}
              </p>
            </div>

            {/* Receipt Items */}
            <div className="space-y-2 py-3 border-b border-dashed border-white/20">
              {completedTransaction?.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <span className="flex-1">
                    {it.quantity}x Item #{it.product_id}
                  </span>
                  <span className="font-semibold">{formatIDR(it.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-sm font-bold tracking-wider">
                <span>TOTAL</span>
                <span>{formatIDR(completedTransaction?.total_amount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-widest">
                <span>Metode</span>
                <span>
                  {completedTransaction?.payments?.[0]?.payment_method || "CASH"}
                </span>
              </div>
            </div>

            <div className="text-center pt-6 text-[10px] text-slate-400 uppercase tracking-widest">
              Terima Kasih
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintReceipt}
              className="flex-1 rounded-none h-12 text-white border-white/10"
            >
              <Printer className="w-4 h-4 mr-2" /> Cetak Struk
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsReceiptOpen(false)}
              className="flex-1 rounded-none h-12 bg-white/10 hover:bg-white/20 text-white hover:bg-slate-800"
            >
              Transaksi Baru
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
