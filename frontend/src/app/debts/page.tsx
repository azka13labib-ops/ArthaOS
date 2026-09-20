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
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardContent } from "@/components/ui/Card";
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Buku Kasbon & Piutang Pelanggan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pantau tagihan pelanggan yang belum lunas, catat cicilan kasbon, dan cek riwayat pelunasan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDebts}
              disabled={isLoading}
              title="Perbarui data kasbon"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Piutang Belum Lunas
              </p>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                {formatIDR(totalOutstanding)}
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Kasbon Terkumpul
              </p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                {formatIDR(totalCollected)}
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Jumlah Tagihan Aktif
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {debts.filter((d) => d.status !== "paid").length} Debitur
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("unpaid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "unpaid"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Belum Lunas ({debts.filter((d) => d.status !== "paid").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "paid"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Lunas ({debts.filter((d) => d.status === "paid").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua ({debts.length})
            </button>
          </div>
        </div>

        {/* Debts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="lg" label="Memuat buku kasbon..." />
            </div>
          ) : filteredDebts.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8 text-slate-400" />}
              title="Tidak Ada Catatan Kasbon"
              description={
                statusFilter === "unpaid"
                  ? "Hebat! Tidak ada tagihan kasbon yang tertunggak saat ini."
                  : "Belum ada riwayat transaksi kasbon."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Pelanggan</th>
                    <th className="px-4 py-3.5">Tanggal Kasbon</th>
                    <th className="px-4 py-3.5">Jatuh Tempo</th>
                    <th className="px-4 py-3.5 text-right">Nominal Awal</th>
                    <th className="px-4 py-3.5 text-right">Sisa Tagihan</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDebts.map((d) => {
                    const cust = customerMap.get(d.customer_id) || d.customer;
                    const isPaid = d.status === "paid";
                    const isPartial = d.status === "partial";

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-slate-900">
                          <div className="font-bold text-slate-900">{cust?.name || "Pelanggan"}</div>
                          <div className="text-[10px] text-slate-400">
                            {cust?.phone_number || cust?.phone || "Tanpa No HP"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {formatShortDate(d.created_at)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {d.due_date ? (
                            <span className="font-medium text-slate-800">
                              {formatShortDate(d.due_date)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                          {formatIDR(d.original_amount)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          <span
                            className={
                              isPaid
                                ? "text-slate-400 line-through"
                                : "text-amber-700 font-extrabold"
                            }
                          >
                            {formatIDR(d.remaining_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            variant={isPaid ? "success" : isPartial ? "info" : "warning"}
                            size="sm"
                          >
                            {isPaid ? "Lunas" : isPartial ? "Dicicil" : "Belum Lunas"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {!isPaid ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedDebt(d);
                                setPayAmount(d.remaining_amount);
                                setPaymentMethod("cash");
                                setPaymentNotes("");
                                setPayError("");
                                setIsPayModalOpen(true);
                              }}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Bayar Kasbon
                            </Button>
                          ) : (
                            <span className="text-emerald-600 font-medium text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
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
        description={`Pelanggan: ${
          customerMap.get(selectedDebt?.customer_id || 0)?.name || "Pelanggan"
        } - Sisa Tagihan: ${formatIDR(selectedDebt?.remaining_amount || 0)}`}
      >
        <form onSubmit={handlePayDebt} className="space-y-4">
          {payError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {payError}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Nominal Pembayaran (Rp)
              </label>
              {selectedDebt && (
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedDebt.remaining_amount)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  Bayar Lunas Semua
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "cash"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <Banknote className="w-4 h-4" /> Tunai
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "transfer"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <CreditCard className="w-4 h-4" /> Transfer Bank
              </button>
            </div>
          </div>

          <Input
            label="Catatan Pembayaran (Opsional)"
            placeholder="Contoh: Cicilan tahap 1 / Titip ke kasir"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingPayment}>
              Simpan Pembayaran
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
