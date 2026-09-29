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
  BookOpen,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatDate, formatIDR } from "@/lib/utils";
import { Customer, Debt } from "@/lib/types";

export default function CustomersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
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
  debts.forEach((d) => {
    if (d.status !== "paid") {
      const current = customerDebtMap.get(d.customer_id) || 0;
      customerDebtMap.set(d.customer_id, current + Number(d.remaining_amount));
    }
  });

  const filteredCustomers = customers.filter((c) => {
    const phone = c.phone_number || c.phone || "";
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      phone.toLowerCase().includes(q)
    );
  });

  const formatWhatsAppLink = (phoneStr: string) => {
    let clean = phoneStr.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground mb-1">
              Direktori Pelanggan
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola basis data pelanggan toko, nomor kontak WhatsApp, dan status kasbon.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-none border-border hover:bg-muted h-10 px-4"
              onClick={loadCustomersData}
              disabled={isLoading}
              title="Perbarui daftar pelanggan"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              variant="default"
              className="rounded-none bg-background text-foreground hover:bg-muted h-10 px-6"
              onClick={() => {
                setError("");
                setIsModalOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Tambah Pelanggan
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-border bg-card">
          <div className="p-6 md:p-8 border-b sm:border-b-0 sm:border-r border-border">
            <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Total Pelanggan Terdaftar
            </p>
            <h3 className="text-4xl font-medium tracking-tight text-foreground">
              {customers.length}
            </h3>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Pelanggan Kasbon Aktif
            </p>
            <h3 className="text-4xl font-medium tracking-tight text-foreground">
              {customerDebtMap.size}
            </h3>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-96 group">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-foreground transition-colors" />
          <input
            type="text"
            placeholder="Cari nama atau nomor telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 text-sm bg-card border border-border rounded-none focus-visible:outline-none focus-visible:border-ring transition-colors placeholder:text-muted-foreground"
          />
        </div>

        {/* Customer Table */}
        <div className="bg-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-muted-foreground" />}
              title="Belum Ada Pelanggan"
              description={
                searchQuery
                  ? "Tidak ada pelanggan yang cocok dengan pencarian Anda."
                  : "Mulai simpan data pelanggan untuk memudahkan transaksi kasbon dan pengiriman tagihan."
              }
              actionLabel="Tambah Pelanggan Baru"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wide">Nama Pelanggan</th>
                    <th className="px-6 py-4 font-semibold tracking-wide">Nomor Kontak</th>
                    <th className="px-6 py-4 font-semibold tracking-wide text-right">Status Kasbon Aktif</th>
                    <th className="px-6 py-4 font-semibold tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const debtAmount = customerDebtMap.get(c.id) || 0;
                    const phone = c.phone_number || c.phone || "";

                    return (
                      <tr key={c.id} className="hover:bg-muted transition-colors group">
                        <td className="px-6 py-4 font-medium text-foreground">
                          {c.name}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {phone ? (
                            <span className="font-mono">{phone}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {debtAmount > 0 ? (
                            <span className="font-medium text-rose-500 tracking-tight text-lg">
                              {formatIDR(debtAmount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Nihil</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end">
                            {phone ? (
                              <a
                                href={formatWhatsAppLink(phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  className="rounded-none border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 h-8 px-3 text-xs"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Hubungi
                                </Button>
                              </a>
                            ) : (
                              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Tanpa Kontak</span>
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
        title="Tambah Pelanggan"
        description="Simpan kontak pelanggan untuk pencatatan transaksi kasir dan buku kasbon."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/30">
              {error}
            </div>
          )}

          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Nomor Telepon / WhatsApp (Opsional)"
            placeholder="Contoh: 081234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            helperText="Digunakan untuk kirim pengingat kasbon & bukti bayar"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-6"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="default" className="rounded-none px-6 bg-background text-foreground hover:bg-muted" isLoading={isSubmitting}>
              Simpan Pelanggan
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}


