"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Search,
  TrendingDown,
  RefreshCw,
  Tag,
  CreditCard,
  Banknote,
  Calendar,
  PieChart,
  Filter,
  AlertCircle,
  Clock,
  ArrowDownRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import { Transaction } from "@/lib/types";

const CATEGORIES = [
  "Operasional",
  "Listrik & Air",
  "Sewa Tempat",
  "Gaji Karyawan",
  "Logistik & Kurir",
  "Pemasaran",
  "Pemeliharaan & Servis",
  "Lain-lain",
] as const;

function parseExpenseMeta(rawDesc?: string | null): { category: string; note: string } {
  if (!rawDesc) {
    return { category: "Operasional", note: "Pengeluaran Operasional" };
  }
  const match = rawDesc.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    return { category: match[1], note: match[2] || match[1] };
  }
  return { category: "Operasional", note: rawDesc };
}

export default function ExpensesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState<string>("Operasional");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadExpenses = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const data = await api.expenses.list(activeStore.id);
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadExpenses();
    }
  }, [activeStore, loadExpenses]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    const amountNum = Number(amount);

    if (!amountNum || amountNum <= 0) {
      setError("Masukkan nominal biaya yang valid.");
      return;
    }

    if (!description.trim()) {
      setError("Keterangan pengeluaran wajib diisi.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.expenses.create(activeStore.id, {
        amount: amountNum,
        category,
        description: `[${category}] ${description.trim()}`,
        payment_method: paymentMethod,
      });

      await loadExpenses();
      setIsModalOpen(false);
      setAmount("");
      setDescription("");
      setCategory("Operasional");
      setPaymentMethod("cash");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mencatat pengeluaran operasional."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick amount chip add
  const handleQuickAddAmount = (addValue: number) => {
    const current = typeof amount === "number" ? amount : 0;
    setAmount(current + addValue);
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const totalAmount = expenses.reduce(
      (sum, exp) => sum + Number(exp.total_amount || 0),
      0
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthExpenses = expenses.filter((exp) => {
      const dt = new Date(exp.occurred_at);
      return (
        !isNaN(dt.getTime()) &&
        dt.getFullYear() === currentYear &&
        dt.getMonth() === currentMonth
      );
    });

    const currentMonthTotal = currentMonthExpenses.reduce(
      (sum, exp) => sum + Number(exp.total_amount || 0),
      0
    );

    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      const { category: cat } = parseExpenseMeta(exp.description);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.total_amount || 0);
    });

    let topCategory = "Belum Ada";
    let topCategoryTotal = 0;
    Object.entries(categoryTotals).forEach(([cat, catTotal]) => {
      if (catTotal > topCategoryTotal) {
        topCategory = cat;
        topCategoryTotal = catTotal;
      }
    });

    const averagePerTransaction =
      expenses.length > 0 ? Math.round(totalAmount / expenses.length) : 0;

    return {
      totalAmount,
      totalCount: expenses.length,
      currentMonthTotal,
      currentMonthCount: currentMonthExpenses.length,
      topCategory,
      topCategoryTotal,
      topCategoryPercentage:
        totalAmount > 0 ? Math.round((topCategoryTotal / totalAmount) * 100) : 0,
      averagePerTransaction,
    };
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return expenses.filter((exp) => {
      const { category: cat, note } = parseExpenseMeta(exp.description);
      const idStr = `exp-${exp.id.toString().padStart(5, "0")}`.toLowerCase();
      const rawText = (exp.description || "").toLowerCase();

      const matchSearch =
        !q ||
        idStr.includes(q) ||
        note.toLowerCase().includes(q) ||
        rawText.includes(q) ||
        cat.toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === "all" || cat === selectedCategory;

      const pMethod = exp.payments?.[0]?.payment_method || "cash";
      const matchPaymentMethod =
        selectedPaymentMethod === "all" || pMethod === selectedPaymentMethod;

      return matchSearch && matchCategory && matchPaymentMethod;
    });
  }, [expenses, searchQuery, selectedCategory, selectedPaymentMethod]);

  const currentMonthName = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <AppLayout>
      <div className="space-y-6 w-full pb-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Pengeluaran Outlet
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {expenses.length} Transaksi
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Catat dan pantau seluruh pos biaya operasional untuk perhitungan laba bersih toko.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              className="h-10 px-4 min-h-[44px] sm:min-h-0 text-xs font-medium shadow-xs"
              onClick={loadExpenses}
              disabled={isLoading}
              title="Perbarui daftar pengeluaran"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Segarkan
            </Button>
            <Button
              variant="default"
              className="h-10 px-5 min-h-[44px] sm:min-h-0 text-xs font-semibold shadow-xs"
              onClick={() => {
                setError("");
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Catat Pengeluaran
            </Button>
          </div>
        </div>

        {/* Modern KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pengeluaran Akumulasi */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Biaya Operasional
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatIDR(metrics.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Akumulasi {metrics.totalCount} transaksi pengeluaran
              </p>
            </div>
          </div>

          {/* Card 2: Bulan Ini */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bulan Ini ({currentMonthName})
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatIDR(metrics.currentMonthTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.currentMonthCount} transaksi periode berjalan
              </p>
            </div>
          </div>

          {/* Card 3: Pos Biaya Terbesar */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pos Biaya Terbesar
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold tracking-tight text-foreground truncate" title={metrics.topCategory}>
                {metrics.topCategory}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.topCategoryTotal > 0
                  ? `${formatIDR(metrics.topCategoryTotal)} (${metrics.topCategoryPercentage}%)`
                  : "Belum ada rincian pos"}
              </p>
            </div>
          </div>

          {/* Card 4: Rata-rata per Transaksi */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rata-Rata Transaksi
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatIDR(metrics.averagePerTransaction)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estimasi rata-rata per nota biaya
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-foreground transition-colors" />
            <input
              type="text"
              placeholder="Cari ID pengeluaran, nota, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-xs">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                aria-label="Filter kategori pengeluaran"
              >
                <option value="all">Semua Kategori</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                aria-label="Filter metode pembayaran"
              >
                <option value="all">Semua Metode</option>
                <option value="cash">Tunai (Kas Toko)</option>
                <option value="transfer">Transfer Bank</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses List & Table */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Spinner size="md" />
              <p className="text-xs text-muted-foreground">Memuat data pengeluaran...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
                title={
                  expenses.length === 0
                    ? "Belum Ada Pengeluaran"
                    : "Tidak Ditemukan Pengeluaran"
                }
                description={
                  expenses.length === 0
                    ? "Belum ada transaksi biaya operasional yang dicatat di outlet ini."
                    : "Tidak ada pengeluaran yang cocok dengan kriteria pencarian Anda."
                }
                actionLabel={expenses.length === 0 ? "Catat Pengeluaran Baru" : undefined}
                onAction={expenses.length === 0 ? () => setIsModalOpen(true) : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-xs text-muted-foreground border-b border-border bg-muted/50 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">ID & Waktu</th>
                    <th className="px-5 py-3.5">Kategori</th>
                    <th className="px-5 py-3.5">Keterangan Biaya</th>
                    <th className="px-5 py-3.5 text-center">Metode Bayar</th>
                    <th className="px-5 py-3.5 text-right">Nominal Pengeluaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredExpenses.map((exp) => {
                    const { category: cat, note } = parseExpenseMeta(exp.description);
                    const pMethod = exp.payments?.[0]?.payment_method || "cash";
                    const isCash = pMethod === "cash";

                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-muted/40 transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-semibold text-foreground tracking-wide">
                            EXP-{exp.id.toString().padStart(5, "0")}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDate(exp.occurred_at)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-medium border border-border"
                          >
                            {cat}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-foreground font-medium whitespace-normal max-w-md">
                          <p className="line-clamp-2 leading-snug">{note}</p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium border border-border">
                            {isCash ? (
                              <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            )}
                            {isCash ? "Tunai" : "Transfer"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="font-bold text-rose-600 dark:text-rose-400 text-base font-mono tracking-tight flex items-center justify-end gap-1">
                            <ArrowDownRight className="w-4 h-4 shrink-0" />
                            {formatIDR(exp.total_amount)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pencatatan Pengeluaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Pengeluaran Toko"
        description="Dokumentasikan pengeluaran operasional outlet untuk pembukuan akurat."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExpense} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount input with live preview & quick buttons */}
          <div className="space-y-2">
            <label
              htmlFor="expense-amount"
              className="block text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Nominal Biaya (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                Rp
              </span>
              <input
                id="expense-amount"
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 text-base font-bold bg-background text-foreground border border-border rounded-lg shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:border-primary/50 transition-colors"
              />
            </div>

            {/* Live Rupiah Preview */}
            {amount !== "" && Number(amount) > 0 && (
              <p className="text-xs font-semibold text-primary">
                Terbaca: {formatIDR(Number(amount))}
              </p>
            )}

            {/* Quick Increment Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Tambah cepat:</span>
              {[10000, 25000, 50000, 100000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2.5 py-1 text-xs rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-colors min-h-[32px]"
                >
                  +{val >= 1000 ? `${val / 1000}rb` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="expense-category"
              className="block text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Kategori Pengeluaran
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 border border-border bg-background rounded-lg shadow-xs text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:border-primary/50 transition-colors cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="expense-description"
              className="block text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Keterangan / Rincian Biaya
            </label>
            <Input
              id="expense-description"
              placeholder="Contoh: Beli token listrik PLN 50.000 / Beli kantong kresek 2 pack"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Sumber Dana (Metode Bayar)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-3 rounded-lg text-xs font-semibold tracking-wide transition-all border flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Kas Toko (Tunai)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`p-3 rounded-lg text-xs font-semibold tracking-wide transition-all border flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                  paymentMethod === "transfer"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Rekening (Transfer)</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] sm:min-h-0 px-5"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="min-h-[44px] sm:min-h-0 px-6 shadow-xs font-semibold"
              isLoading={isSubmitting}
            >
              Simpan Pengeluaran
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
