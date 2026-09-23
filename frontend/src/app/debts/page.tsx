"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  DollarSign,
  UserCheck,
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
import { formatIDR, formatDate, formatShortDate } from "@/lib/utils";
import { Debt, Customer } from "@/lib/types";

export default function DebtsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">("unpaid");

  // Pay Debt Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadDebts = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const [debtsData, custsData] = await Promise.all([
        api.debts.list(activeStore.id),
        api.customers.list(activeStore.id).catch(() => []),
      ]);
      setDebts(Array.isArray(debtsData) ? debtsData : []);
      setCustomers(Array.isArray(custsData) ? custsData : []);
    } catch {
      setDebts([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadDebts();
    }
  }, [activeStore, loadDebts]);

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !selectedDebt) return;
    const amountNum = Number(payAmount);

    if (!amountNum || amountNum <= 0) {
      setPayError("Masukkan nominal pembayaran yang valid");
      return;
    }

    if (amountNum > selectedDebt.remaining_amount) {
      setPayError("Nominal pembayaran melebihi sisa tagihan kasbon");
      return;
    }

    setPayError("");
    setIsSubmittingPayment(true);

    try {
      await api.debts.pay(activeStore.id, selectedDebt.id, {
        amount: amountNum,
        payment_method: paymentMethod,
        notes: paymentNotes.trim() || undefined,
      });

      await loadDebts();
      setIsPayModalOpen(false);
      setSelectedDebt(null);
      setPayAmount("");
      setPaymentNotes("");
    } catch (err: unknown) {
      setPayError(
        err instanceof Error ? err.message : "Gagal memproses pembayaran kasbon"
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Helper customer map
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // Filtered debts
  const filteredDebts = debts.filter((d) => {
    const cust = customerMap.get(d.customer_id) || d.customer;
    const custName = cust?.name?.toLowerCase() || "";
    const q = searchQuery.toLowerCase().trim();

    if (q && !custName.includes(q)) return false;

    if (statusFilter === "unpaid") return d.status !== "paid";
    if (statusFilter === "paid") return d.status === "paid";
    return true;
  });

  const totalOutstanding = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  const totalCollected = debts.reduce(
    (sum, d) => sum + (Number(d.original_amount) - Number(d.remaining_amount)),
    0
  );

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white mb-1">
              Buku Kasbon
            </h1>
            <p className="text-sm text-slate-400">
              Pantau piutang pelanggan yang belum lunas, catat cicilan, dan cek riwayat pelunasan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadDebts}
              disabled={isLoading}
              className="rounded-none border-white/10 hover:bg-white/5 h-10 px-4"
              title="Perbarui data kasbon"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200 border border-white/10">
          <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white p-6 md:p-8 flex flex-col justify-between hover:bg-white/5 transition-colors">
            <p className="text-[13px] font-medium text-slate-400 mb-6 uppercase tracking-wider">Total Piutang Berjalan</p>
            <h3 className="text-3xl font-medium text-white tracking-tight">
              {formatIDR(totalOutstanding)}
            </h3>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white p-6 md:p-8 flex flex-col justify-between hover:bg-white/5 transition-colors">
            <p className="text-[13px] font-medium text-slate-400 mb-6 uppercase tracking-wider">Telah Terkumpul</p>
            <h3 className="text-3xl font-medium text-emerald-400 tracking-tight">
              {formatIDR(totalCollected)}
            </h3>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white p-6 md:p-8 flex flex-col justify-between hover:bg-white/5 transition-colors">
            <p className="text-[13px] font-medium text-slate-400 mb-6 uppercase tracking-wider">Pelanggan Kasbon</p>
            <h3 className="text-3xl font-medium text-white tracking-tight">
              {debts.filter((d) => d.status !== "paid").length} <span className="text-sm text-slate-400 font-normal tracking-normal lowercase">Debitur</span>
            </h3>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96 group">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 rounded-none focus-visible:outline-none focus-visible:border-slate-400 transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center w-full sm:w-auto border border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => setStatusFilter("unpaid")}
              className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === "unpaid"
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Belum Lunas ({debts.filter((d) => d.status !== "paid").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors border-l border-r border-white/10 ${
                statusFilter === "paid"
                  ? "bg-white/10 hover:bg-white/20 text-white border-transparent"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Lunas ({debts.filter((d) => d.status === "paid").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === "all"
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Semua ({debts.length})
            </button>
          </div>
        </div>

        {/* Debts Table */}
        <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="md" />
            </div>
          ) : filteredDebts.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8 text-slate-500" />}
              title="Tidak Ada Catatan Kasbon"
              description={
                statusFilter === "unpaid"
                  ? "Hebat! Tidak ada tagihan kasbon yang tertunggak saat ini."
                  : "Belum ada riwayat transaksi kasbon."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium">Pelanggan</th>
                    <th className="px-6 py-4 font-medium">Tanggal Kasbon</th>
                    <th className="px-6 py-4 font-medium">Jatuh Tempo</th>
                    <th className="px-6 py-4 font-medium text-right">Nominal Awal</th>
                    <th className="px-6 py-4 font-medium text-right">Sisa Tagihan</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDebts.map((d) => {
                    const cust = customerMap.get(d.customer_id) || d.customer;
                    const isPaid = d.status === "paid";
                    const isPartial = d.status === "partial";

                    return (
                      <tr key={d.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          <div className="font-semibold text-white">{cust?.name || "Pelanggan"}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {cust?.phone_number || cust?.phone || "Tanpa No HP"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                          {formatShortDate(d.created_at)}
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                          {d.due_date ? (
                            <span className="text-white font-medium">
                              {formatShortDate(d.due_date)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">
                          {formatIDR(d.original_amount)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-white">
                          <span
                            className={
                              isPaid
                                ? "text-slate-500 line-through"
                                : "text-white"
                            }
                          >
                            {formatIDR(d.remaining_amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${isPaid ? 'bg-emerald-50 text-emerald-400' : isPartial ? 'bg-white/10 text-slate-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                             {isPaid ? "Lunas" : isPartial ? "Dicicil" : "Belum Lunas"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isPaid ? (
                            <Button
                              variant="primary"
                              className="h-8 rounded-none px-4 text-xs bg-white/10 hover:bg-white/20 text-white hover:bg-slate-800"
                              onClick={() => {
                                setSelectedDebt(d);
                                setPayAmount(d.remaining_amount);
                                setPaymentMethod("cash");
                                setPaymentNotes("");
                                setPayError("");
                                setIsPayModalOpen(true);
                              }}
                            >
                              Bayar Tagihan
                            </Button>
                          ) : (
                            <span className="text-slate-400 font-semibold tracking-wider text-[11px] uppercase inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                            </span>
                          )}
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

      {/* Pay Debt Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Catat Pembayaran Kasbon"
        description={`Debitur: ${
          customerMap.get(selectedDebt?.customer_id || 0)?.name || "Pelanggan"
        } • Sisa Tagihan: ${formatIDR(selectedDebt?.remaining_amount || 0)}`}
      >
        <form onSubmit={handlePayDebt} className="space-y-5 pt-2">
          {payError && (
            <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20">
              {payError}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-white uppercase tracking-wide">
                Nominal Pembayaran (Rp)
              </label>
              {selectedDebt && (
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedDebt.remaining_amount)}
                  className="text-xs text-slate-400 font-semibold hover:text-white uppercase tracking-wider"
                >
                  Bayar Penuh
                </button>
              )}
            </div>
            <Input
              type="number"
              placeholder="0"
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              required
              autoFocus
            />
          </div>

          {/* Payment Method Switcher */}
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wide mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-0 border border-white/10">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-3 px-3 text-xs font-semibold tracking-wider uppercase transition-colors border-r border-white/10 flex items-center justify-center gap-2 ${
                  paymentMethod === "cash"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white/5 backdrop-blur-xl border-white/10 text-white text-slate-400 hover:bg-white/5"
                }`}
              >
                <Banknote className="w-4 h-4" /> Tunai
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`py-3 px-3 text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 ${
                  paymentMethod === "transfer"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-white/5 backdrop-blur-xl border-white/10 text-white text-slate-400 hover:bg-white/5"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Transfer
              </button>
            </div>
          </div>

          <Input
            label="Catatan Opsional"
            placeholder="Contoh: Cicilan tahap 1 / Titip kasir"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-6"
              onClick={() => setIsPayModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="rounded-none px-6 bg-white/10 hover:bg-white/20 text-white hover:bg-slate-800" isLoading={isSubmittingPayment}>
              Simpan Pembayaran
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
