"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Tag,
  CreditCard,
  Banknote,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import { Transaction } from "@/lib/types";

export default function ExpensesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState("Operasional");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Operasional",
    "Listrik & Air",
    "Sewa Tempat",
    "Gaji Karyawan",
    "Logistik & Kurir",
    "Pemasaran",
    "Lain-lain",
  ];

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
      setError("Masukkan nominal biaya yang valid");
      return;
    }

    if (!description.trim()) {
      setError("Keterangan pengeluaran wajib diisi");
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
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal mencatat pengeluaran"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return exp.description?.toLowerCase().includes(q);
  });

  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Pengeluaran & Biaya Operasional
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Catat dan pantau seluruh pos biaya outlet untuk perhitungan laba bersih yang presisi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadExpenses}
              disabled={isLoading}
              title="Perbarui daftar pengeluaran"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setError("");
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Catat Pengeluaran Baru
            </Button>
          </div>
        </div>

        {/* Total Expense KPI Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Biaya Operasional Tercatat
                </p>
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-2">
                {formatIDR(totalExpenseAmount)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {expenses.length} transaksi pengeluaran
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari deskripsi pengeluaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="lg" label="Memuat catatan pengeluaran..." />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-slate-400" />}
              title="Belum Ada Catatan Biaya"
              description="Belum ada transaksi pengeluaran operasional yang dicatat di outlet ini."
              actionLabel="Catat Pengeluaran Baru"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">ID / Waktu</th>
                    <th className="px-4 py-3.5">Keterangan Biaya</th>
                    <th className="px-4 py-3.5">Metode Bayar</th>
                    <th className="px-4 py-3.5 text-right">Nominal Pengeluaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="font-semibold">EXP-{exp.id.toString().padStart(5, "0")}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatDate(exp.occurred_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium">
                        {exp.description || "Pengeluaran Operasional"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="neutral" size="sm">
                          {exp.payments?.[0]?.payment_method?.toUpperCase() || "TUNAI"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-rose-600 text-sm">
                        -{formatIDR(exp.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Pengeluaran Operasional"
        description="Masukkan rincian biaya yang dikeluarkan oleh toko."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Nominal Biaya (Rp)"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Kategori Pengeluaran
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Deskripsi / Keterangan"
            placeholder="Contoh: Beli token listrik 50.000 / Beli kantong plastik 1 pack"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Dibayar Menggunakan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "cash"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <Banknote className="w-4 h-4" /> Uang Kas Toko
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "transfer"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Rekening Bank
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan Pengeluaran
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
