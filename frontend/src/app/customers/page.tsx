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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Direktori Pelanggan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola basis data pelanggan toko, nomor kontak WhatsApp, dan status kasbon.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCustomersData}
              disabled={isLoading}
              title="Perbarui daftar pelanggan"
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
              <UserPlus className="w-4 h-4 mr-1.5" /> Tambah Pelanggan
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Pelanggan Terdaftar
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {customers.length} Kontak
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pelanggan Memiliki Kasbon Aktif
              </p>
              <h3 className="text-xl font-extrabold text-amber-600 mt-1">
                {customerDebtMap.size} Pelanggan
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau nomor telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="lg" label="Memuat data pelanggan..." />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-slate-400" />}
              title="Belum Ada Pelanggan"
              description={
                searchQuery
                  ? "Tidak ada pelanggan yang cocok dengan pencarian Anda."
                  : "Mulai simpan data pelanggan untuk memudahkan transaksi kasbon dan pengiriman invoice."
              }
              actionLabel="Tambah Pelanggan Baru"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Nama Pelanggan</th>
                    <th className="px-4 py-3.5">Nomor Kontak</th>
                    <th className="px-4 py-3.5 text-right">Status Kasbon Aktif</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const debtAmount = customerDebtMap.get(c.id) || 0;
                    const phone = c.phone_number || c.phone || "";

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {c.name}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {phone ? (
                            <span className="font-mono font-medium text-slate-800">{phone}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {debtAmount > 0 ? (
                            <span className="font-bold text-amber-700">
                              {formatIDR(debtAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Tidak ada kasbon</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {phone ? (
                              <a
                                href={formatWhatsAppLink(phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 font-bold"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                                </Button>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">Tanpa Kontak</span>
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
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Ibu Rina / Toko Mandiri"
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Simpan Pelanggan
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
