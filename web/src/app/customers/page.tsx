"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  RefreshCw,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  X,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, cn } from "@/lib/utils";
import { Customer, Debt } from "@/lib/types";

export default function CustomersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debtFilter, setDebtFilter] = useState<"all" | "debt" | "settled">("all");

  // Toast feedback state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Add Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadCustomersData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const [custList, debtList] = await Promise.all([
        api.customers.list(activeStore.id),
        api.debts.list(activeStore.id).catch(() => []),
      ]);
      setCustomers(Array.isArray(custList) ? custList : []);
      setDebts(Array.isArray(debtList) ? debtList : []);
    } catch {
      setCustomers([]);
      setDebts([]);
      showToast("Gagal memuat direktori pelanggan", "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadCustomersData();
    }
  }, [activeStore, loadCustomersData]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!name.trim()) {
      setError("Nama pelanggan wajib diisi");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.customers.create(activeStore.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      await loadCustomersData();
      setIsModalOpen(false);
      setName("");
      setPhone("");
      showToast("Pelanggan baru berhasil disimpan ke direktori");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan pelanggan"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute active debt map per customer
  const customerDebtMap = new Map<number, number>();
  let totalOutstandingDebt = 0;

  debts.forEach((d) => {
    if (d.status !== "paid") {
      const current = customerDebtMap.get(d.customer_id) || 0;
      const remaining = Number(d.remaining_amount) || 0;
      customerDebtMap.set(d.customer_id, current + remaining);
      totalOutstandingDebt += remaining;
    }
  });

  const filteredCustomers = customers.filter((c) => {
    const contact = c.phone_number || c.phone || "";
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      contact.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    const hasDebt = (customerDebtMap.get(c.id) || 0) > 0;
    if (debtFilter === "debt") return hasDebt;
    if (debtFilter === "settled") return !hasDebt;

    return true;
  });

  const formatWhatsAppLink = (phoneStr: string) => {
    let clean = phoneStr.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase() || "PL";
  };

  return (
    <AppLayout>
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 bg-card",
            toast.type === "success"
              ? "border-emerald-500/30 text-foreground"
              : "border-destructive/30 text-destructive"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Direktori Pelanggan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola basis data pelanggan toko, nomor kontak WhatsApp, dan status kasbon.
            </p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={loadCustomersData}
              disabled={isLoading}
              className="h-11 sm:h-10 px-4 min-h-[44px] sm:min-h-[40px] rounded-lg border-border hover:bg-muted text-sm font-medium"
              title="Perbarui daftar pelanggan"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Segarkan
            </Button>
            <Button
              variant="default"
              className="h-11 sm:h-10 px-5 min-h-[44px] sm:min-h-[40px] rounded-lg shadow-sm text-sm font-medium"
              onClick={() => {
                setError("");
                setIsModalOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Tambah Pelanggan
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-20" />
              </div>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-20" />
              </div>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-32" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Pelanggan Terdaftar
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {customers.length}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Orang</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pelanggan Kasbon Aktif
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ReceiptText className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {customerDebtMap.size}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Pelanggan</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Piutang Berjalan
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-destructive">
                    {formatIDR(totalOutstandingDebt)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search & Debt Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama atau nomor WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 sm:h-10 pl-10 pr-9 text-sm bg-card text-foreground border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border gap-1 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setDebtFilter("all")}
              className={cn(
                "h-9 px-3.5 rounded-md text-xs font-medium transition-all min-h-[36px] flex items-center justify-center shrink-0",
                debtFilter === "all"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              Semua ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter("debt")}
              className={cn(
                "h-9 px-3.5 rounded-md text-xs font-medium transition-all min-h-[36px] flex items-center justify-center shrink-0",
                debtFilter === "debt"
                  ? "bg-destructive/15 text-destructive font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              Ada Kasbon ({customerDebtMap.size})
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter("settled")}
              className={cn(
                "h-9 px-3.5 rounded-md text-xs font-medium transition-all min-h-[36px] flex items-center justify-center shrink-0",
                debtFilter === "settled"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              Lunas / Nihil ({Math.max(0, customers.length - customerDebtMap.size)})
            </button>
          </div>
        </div>

        {/* Customer Table Card */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 sm:p-12">
              <EmptyState
                icon={<Users className="w-8 h-8 text-muted-foreground" />}
                title="Belum Ada Pelanggan"
                description={
                  searchQuery || debtFilter !== "all"
                    ? "Tidak ada pelanggan yang cocok dengan pencarian atau filter yang dipilih."
                    : "Mulai simpan data pelanggan untuk memudahkan pencatatan kasbon dan pengiriman tagihan transaksi."
                }
                actionLabel={
                  searchQuery || debtFilter !== "all"
                    ? "Reset Pencarian & Filter"
                    : "Tambah Pelanggan Baru"
                }
                onAction={() => {
                  if (searchQuery || debtFilter !== "all") {
                    setSearchQuery("");
                    setDebtFilter("all");
                  } else {
                    setIsModalOpen(true);
                  }
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 sm:px-6 py-3.5">Nama Pelanggan</th>
                    <th className="px-5 sm:px-6 py-3.5">Nomor Kontak WhatsApp</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Status Kasbon Aktif</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCustomers.map((c) => {
                    const debtAmount = customerDebtMap.get(c.id) || 0;
                    const phone = c.phone_number || c.phone || "";
                    const initials = getInitials(c.name);

                    return (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            <span className="font-medium text-foreground text-sm">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-muted-foreground">
                          {phone ? (
                            <div className="flex items-center gap-1.5 font-mono text-sm">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                              <span>{phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Tidak ada nomor
                            </span>
                          )}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          {debtAmount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                              {formatIDR(debtAmount)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3.5 h-3.5" /> Lunas / Nihil
                            </span>
                          )}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end">
                            {phone ? (
                              <a
                                href={formatWhatsAppLink(phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  className="h-10 sm:h-9 px-3.5 min-h-[40px] sm:min-h-[36px] rounded-lg text-xs font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors shadow-xs"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> WhatsApp
                                </Button>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                Kontak nihil
                              </span>
                            )}
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Pelanggan Baru"
        description="Simpan kontak pelanggan untuk pencatatan transaksi kasir dan buku kasbon."
        maxWidth="lg"
        className="sm:max-w-xl rounded-2xl p-6 shadow-xl border border-border bg-card"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-lg text-xs text-destructive bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nama Lengkap Pelanggan <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nomor Telepon atau WhatsApp (Opsional)
            </label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-3 text-sm font-mono bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Digunakan untuk mengirimkan pengingat jatuh tempo kasbon dan bukti pembayaran digital.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 px-5 rounded-lg border-border hover:bg-muted min-h-[44px] sm:min-h-[40px]"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="h-11 sm:h-10 px-6 rounded-lg min-h-[44px] sm:min-h-[40px] shadow-sm"
              isLoading={isSubmitting}
            >
              Simpan Pelanggan
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
