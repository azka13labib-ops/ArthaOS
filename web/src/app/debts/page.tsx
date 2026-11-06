"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  Users,
  AlertCircle,
  History,
  Phone,
  Calendar,
  ChevronRight,
  User,
  ArrowRight,
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
import { formatIDR, formatDate, formatShortDate } from "@/lib/utils";
import { Debt, Customer, DebtPayment } from "@/lib/types";

function isOverdue(dueDateStr?: string | null, status?: string): boolean {
  if (!dueDateStr || status === "paid") return false;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export default function DebtsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "partial" | "paid">("unpaid");

  // Pay Debt Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payError, setPayError] = useState("");

  // History Installment Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);

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

  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !selectedDebt) return;
    const amountNum = Number(payAmount);

    if (!amountNum || amountNum <= 0) {
      setPayError("Masukkan nominal pembayaran yang valid.");
      return;
    }

    if (amountNum > selectedDebt.remaining_amount) {
      setPayError("Nominal pembayaran tidak boleh melebihi sisa tagihan kasbon.");
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
        err instanceof Error ? err.message : "Gagal memproses pembayaran kasbon."
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const totalOutstanding = debts
      .filter((d) => d.status !== "paid")
      .reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0);

    const totalCollected = debts.reduce(
      (sum, d) =>
        sum + (Number(d.original_amount || 0) - Number(d.remaining_amount || 0)),
      0
    );

    const totalOriginalAmount = debts.reduce(
      (sum, d) => sum + Number(d.original_amount || 0),
      0
    );

    const activeUnpaidDebts = debts.filter((d) => d.status !== "paid");
    const activeDebtorIds = new Set(activeUnpaidDebts.map((d) => d.customer_id));

    const overdueCount = debts.filter((d) => isOverdue(d.due_date, d.status)).length;
    const paidCount = debts.filter((d) => d.status === "paid").length;
    const partialCount = debts.filter((d) => d.status === "partial").length;
    const unpaidOnlyCount = debts.filter((d) => d.status === "unpaid").length;

    return {
      totalOutstanding,
      totalCollected,
      totalOriginalAmount,
      activeDebtorCount: activeDebtorIds.size,
      totalDebtCount: debts.length,
      unpaidCount: activeUnpaidDebts.length,
      paidCount,
      partialCount,
      unpaidOnlyCount,
      overdueCount,
    };
  }, [debts]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return debts.filter((d) => {
      const cust = customerMap.get(d.customer_id) || d.customer;
      const custName = cust?.name?.toLowerCase() || "";
      const custPhone = (cust?.phone_number || cust?.phone || "").toLowerCase();
      const debtIdStr = `debt-${d.id.toString().padStart(5, "0")}`.toLowerCase();

      const matchSearch =
        !q ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        debtIdStr.includes(q);

      if (!matchSearch) return false;

      if (statusFilter === "unpaid") return d.status !== "paid";
      if (statusFilter === "partial") return d.status === "partial";
      if (statusFilter === "paid") return d.status === "paid";
      return true;
    });
  }, [debts, customerMap, searchQuery, statusFilter]);

  const selectedDebtor = selectedDebt
    ? customerMap.get(selectedDebt.customer_id) || selectedDebt.customer
    : null;

  return (
    <AppLayout>
      <div className="space-y-6 w-full pb-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Buku Kasbon & Piutang
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {metrics.unpaidCount} Aktif
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau piutang pelanggan, catat cicilan kasbon, dan periksa histori pelunasan secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={loadDebts}
              disabled={isLoading}
              className="h-10 px-4 min-h-[44px] sm:min-h-0 text-xs font-medium shadow-xs"
              title="Perbarui data kasbon"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Segarkan
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Piutang Berjalan */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Piutang Berjalan
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {formatIDR(metrics.totalOutstanding)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.unpaidCount} tagihan kasbon belum lunas
              </p>
            </div>
          </div>

          {/* Card 2: Telah Dilunasi / Terkumpul */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Telah Terkumpul
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatIDR(metrics.totalCollected)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dana piutang berhasil kembali ke kas
              </p>
            </div>
          </div>

          {/* Card 3: Total Akumulasi Pinjaman */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Plafon Diberikan
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatIDR(metrics.totalOriginalAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Akumulasi {metrics.totalDebtCount} transaksi kasbon
              </p>
            </div>
          </div>

          {/* Card 4: Pelanggan Aktif Kasbon */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Debitur Aktif
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.activeDebtorCount}{" "}
                <span className="text-sm font-normal text-muted-foreground">Orang</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.overdueCount > 0 ? (
                  <span className="text-rose-500 font-medium">
                    {metrics.overdueCount} tagihan melewati jatuh tempo
                  </span>
                ) : (
                  "Tidak ada tagihan tertunggak parah"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-foreground transition-colors" />
            <input
              type="text"
              placeholder="Cari nama pelanggan, no telp, atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-xs overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter("unpaid")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap min-h-[36px] sm:min-h-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "unpaid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>Belum Lunas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "unpaid" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {metrics.unpaidCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("partial")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap min-h-[36px] sm:min-h-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "partial"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>Dicicil</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "partial" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {metrics.partialCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap min-h-[36px] sm:min-h-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "paid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>Lunas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "paid" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {metrics.paidCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap min-h-[36px] sm:min-h-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>Semua</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {metrics.totalDebtCount}
              </span>
            </button>
          </div>
        </div>

        {/* Debts Table */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Spinner size="md" />
              <p className="text-xs text-muted-foreground">Memuat data kasbon pelanggan...</p>
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<BookOpen className="w-8 h-8 text-muted-foreground" />}
                title={
                  statusFilter === "unpaid"
                    ? "Tidak Ada Tagihan Kasbon"
                    : "Belum Ada Catatan Kasbon"
                }
                description={
                  statusFilter === "unpaid"
                    ? "Hebat! Seluruh tagihan kasbon pelanggan saat ini sudah tertagih lunas."
                    : "Belum ada transaksi dengan status kasbon pada outlet ini."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-xs text-muted-foreground border-b border-border bg-muted/50 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Pelanggan (Debitur)</th>
                    <th className="px-5 py-3.5">Waktu & Jatuh Tempo</th>
                    <th className="px-5 py-3.5 text-right">Nilai Pokok</th>
                    <th className="px-5 py-3.5 text-right">Sisa Tagihan</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDebts.map((d) => {
                    const cust = customerMap.get(d.customer_id) || d.customer;
                    const isPaid = d.status === "paid";
                    const isPartial = d.status === "partial";
                    const overdue = isOverdue(d.due_date, d.status);
                    const paidPercent =
                      d.original_amount > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((d.original_amount - d.remaining_amount) /
                                d.original_amount) *
                                100
                            )
                          )
                        : 0;

                    const custName = cust?.name || "Pelanggan";
                    const custPhone = cust?.phone_number || cust?.phone;
                    const initial = custName.charAt(0).toUpperCase();

                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-muted/40 transition-colors group"
                      >
                        {/* Customer Info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                <span>{custName}</span>
                                {d.payments && d.payments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHistoryDebt(d);
                                      setIsHistoryModalOpen(true);
                                    }}
                                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 cursor-pointer"
                                    title="Lihat riwayat cicilan"
                                  >
                                    <History className="w-3 h-3" />
                                    <span>({d.payments.length}x)</span>
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono mt-0.5">
                                {custPhone ? (
                                  <>
                                    <Phone className="w-3 h-3" />
                                    <span>{custPhone}</span>
                                  </>
                                ) : (
                                  <span>Tanpa nomor telepon</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="px-5 py-4">
                          <div className="text-xs text-foreground font-mono">
                            {formatShortDate(d.created_at)}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            {d.due_date ? (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  overdue
                                    ? "text-rose-600 dark:text-rose-400 font-semibold"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                Tempo: {formatShortDate(d.due_date)}
                                {overdue && " (Lewat)"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-mono">
                                Tempo: Fleksibel
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Original Amount */}
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono text-xs text-muted-foreground">
                            {formatIDR(d.original_amount)}
                          </div>
                          {isPartial && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Terbayar {paidPercent}%
                            </div>
                          )}
                        </td>

                        {/* Remaining Amount */}
                        <td className="px-5 py-4 text-right">
                          <div
                            className={`font-mono font-bold text-base tracking-tight ${
                              isPaid
                                ? "text-muted-foreground line-through"
                                : overdue
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-foreground"
                            }`}
                          >
                            {formatIDR(d.remaining_amount)}
                          </div>
                          {!isPaid && isPartial && (
                            <div className="w-20 ml-auto bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${paidPercent}%` }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Lunas
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold border border-sky-500/20">
                              <Clock className="w-3.5 h-3.5" />
                              Dicicil
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                overdue
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {overdue ? "Jatuh Tempo" : "Belum Lunas"}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right">
                          {!isPaid ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-10 sm:h-9 px-4 min-h-[44px] sm:min-h-0 text-xs font-semibold shadow-xs"
                              onClick={() => {
                                setSelectedDebt(d);
                                setPayAmount(d.remaining_amount);
                                setPaymentMethod("cash");
                                setPaymentNotes("");
                                setPayError("");
                                setIsPayModalOpen(true);
                              }}
                            >
                              <Banknote className="w-3.5 h-3.5 mr-1.5" />
                              Bayar Kasbon
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryDebt(d);
                                setIsHistoryModalOpen(true);
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0 px-2 cursor-pointer"
                            >
                              <span>Lihat Detail</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
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

      {/* Modal Pembayaran Kasbon */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Catat Pembayaran Kasbon"
        description="Dokumentasikan pelunasan atau cicilan piutang dari pelanggan."
        maxWidth="lg"
      >
        <form onSubmit={handlePayDebt} className="space-y-5 pt-2">
          {payError && (
            <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          {/* Debtor Profile Card */}
          {selectedDebt && (
            <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    {selectedDebtor?.name || "Pelanggan"}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  DEBT-{selectedDebt.id.toString().padStart(5, "0")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground">Nilai Pokok:</span>
                  <div className="font-semibold text-foreground font-mono">
                    {formatIDR(selectedDebt.original_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Sisa Tagihan:</span>
                  <div className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                    {formatIDR(selectedDebt.remaining_amount)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input with live preview */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="pay-debt-amount"
                className="block text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Nominal Pembayaran (Rp)
              </label>
              {selectedDebt && (
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedDebt.remaining_amount)}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  Bayar Lunas ({formatIDR(selectedDebt.remaining_amount)})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                Rp
              </span>
              <input
                id="pay-debt-amount"
                type="number"
                min="1"
                max={selectedDebt?.remaining_amount || undefined}
                placeholder="0"
                value={payAmount}
                onChange={(e) =>
                  setPayAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 text-base font-bold bg-background text-foreground border border-border rounded-lg shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:border-primary/50 transition-colors"
              />
            </div>

            {/* Live Rupiah & Calculation Preview */}
            {selectedDebt && payAmount !== "" && Number(payAmount) > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  Nominal dibayar:{" "}
                  <strong className="text-foreground">
                    {formatIDR(Number(payAmount))}
                  </strong>
                </span>
                <span>
                  Sisa kasbon nanti:{" "}
                  <strong className="text-primary font-mono">
                    {formatIDR(
                      Math.max(
                        0,
                        selectedDebt.remaining_amount - Number(payAmount)
                      )
                    )}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Metode Pembayaran
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
                <span>Kasir Tunai</span>
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
                <span>Transfer Bank</span>
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="pay-debt-notes"
              className="block text-xs font-semibold text-foreground uppercase tracking-wider"
            >
              Catatan Pembayaran (Opsional)
            </label>
            <Input
              id="pay-debt-notes"
              placeholder="Contoh: Titip kasir shift siang / Cicilan tahap 1"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] sm:min-h-0 px-5"
              onClick={() => setIsPayModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="min-h-[44px] sm:min-h-0 px-6 shadow-xs font-semibold"
              isLoading={isSubmittingPayment}
            >
              Simpan Pembayaran
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Riwayat Cicilan Pelunasan */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryDebt(null);
        }}
        title="Riwayat Pembayaran Kasbon"
        description={
          historyDebt
            ? `Debitur: ${
                (customerMap.get(historyDebt.customer_id) || historyDebt.customer)?.name || "Pelanggan"
              } • Plafon: ${formatIDR(historyDebt.original_amount)}`
            : "Rincian angsuran kasbon"
        }
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          {historyDebt && (
            <div className="bg-muted/50 border border-border rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">Sisa Piutang Saat Ini:</span>
                <div className="font-bold text-foreground text-sm font-mono mt-0.5">
                  {formatIDR(historyDebt.remaining_amount)}
                </div>
              </div>
              <Badge
                variant={historyDebt.status === "paid" ? "default" : "secondary"}
                className="text-xs capitalize"
              >
                {historyDebt.status === "paid" ? "Sudah Lunas" : "Belum Lunas"}
              </Badge>
            </div>
          )}

          {(!historyDebt?.payments || historyDebt.payments.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Belum ada catatan cicilan pembayaran untuk kasbon ini.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {historyDebt.payments.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="bg-card border border-border rounded-lg p-3 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span>Angsuran #{idx + 1}</span>
                      <span className="text-[10px] text-muted-foreground uppercase px-1.5 py-0.5 bg-muted rounded">
                        {p.payment_method === "cash" ? "Tunai" : "Transfer"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {formatDate(p.paid_at)}
                    </div>
                    {p.notes && (
                      <div className="text-foreground/80 italic text-[11px] mt-1">
                        &quot;{p.notes}&quot;
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      +{formatIDR(p.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] sm:min-h-0 px-5"
              onClick={() => {
                setIsHistoryModalOpen(false);
                setHistoryDebt(null);
              }}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
