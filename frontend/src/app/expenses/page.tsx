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
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
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
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-950 mb-1">
              Pengeluaran
            </h1>
            <p className="text-sm text-slate-500">
              Catat dan pantau seluruh pos biaya outlet untuk perhitungan laba bersih.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-none border-slate-200 hover:bg-slate-50 h-10 px-4"
              onClick={loadExpenses}
              disabled={isLoading}
              title="Perbarui daftar pengeluaran"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              variant="primary"
              className="rounded-none bg-slate-950 text-white hover:bg-slate-800 h-10 px-6"
              onClick={() => {
                setError("");
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Catat Pengeluaran
            </Button>
          </div>
        </div>

        {/* Total Expense KPI Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-6 md:p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[13px] font-medium text-white/70 uppercase tracking-wider">
                Total Biaya Operasional
              </p>
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-4xl font-medium tracking-tight">
              {formatIDR(totalExpenseAmount)}
            </h3>
            <p className="text-sm text-white/60 mt-3 font-mono">
              {expenses.length} Transaksi Tercatat
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-96 group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-slate-950 transition-colors" />
          <input
            type="text"
            placeholder="Cari keterangan biaya..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-none focus-visible:outline-none focus-visible:border-slate-400 transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Expenses Table */}
        <div className="bg-white border border-slate-200">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-slate-300" />}
              title="Belum Ada Pengeluaran"
              description="Belum ada transaksi pengeluaran operasional yang dicatat di outlet ini."
              actionLabel="Catat Pengeluaran Baru"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-slate-500 border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wide">ID & Waktu</th>
                    <th className="px-6 py-4 font-semibold tracking-wide">Keterangan Biaya</th>
                    <th className="px-6 py-4 font-semibold tracking-wide text-center">Metode</th>
                    <th className="px-6 py-4 font-semibold tracking-wide text-right">Nominal Pengeluaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-950">
                        <div className="font-semibold text-slate-950 tracking-wider">EXP-{exp.id.toString().padStart(5, "0")}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          {formatDate(exp.occurred_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium whitespace-normal max-w-sm">
                        {exp.description || "Pengeluaran Operasional"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest uppercase">
                          {exp.payments?.[0]?.payment_method || "TUNAI"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-rose-600 tracking-tight text-lg group-hover:text-rose-700">
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
        title="Catat Pengeluaran"
        description="Masukkan rincian biaya operasional outlet."
      >
        <form onSubmit={handleCreateExpense} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200">
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
            <label className="block text-xs font-semibold text-slate-950 uppercase tracking-wide mb-2">
              Kategori Pengeluaran
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-slate-200 bg-white text-sm text-slate-950 focus-visible:outline-none focus-visible:border-slate-400 transition-colors rounded-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Deskripsi / Keterangan Lengkap"
            placeholder="Contoh: Beli token listrik 50.000 / Beli kantong plastik 1 pack"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-950 uppercase tracking-wide mb-2">
              Sumber Dana (Metode Bayar)
            </label>
            <div className="grid grid-cols-2 gap-0 border border-slate-200">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-3 px-3 text-xs font-semibold tracking-wider uppercase transition-colors border-r border-slate-200 flex items-center justify-center gap-2 ${
                  paymentMethod === "cash"
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Banknote className="w-4 h-4" /> Uang Laci
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`py-3 px-3 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 ${
                  paymentMethod === "transfer"
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Bank/Transfer
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-6"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="rounded-none px-6 bg-slate-950 text-white hover:bg-slate-800" isLoading={isSubmitting}>
              Simpan Pengeluaran
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
