"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { Supplier, Purchase, Product, RawMaterial, CreatePurchaseRequest } from "@/lib/types";
import {
  Truck,
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  Package,
  Wheat,
  Download,
  Printer,
  ChevronRight,
  Filter,
  Building2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PurchasesPage() {
  const { activeStore } = useStore();
  const [activeTab, setActiveTab] = useState<"purchases" | "suppliers">("purchases");

  // Data states
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState<{
    supplier_id: number | null;
    invoice_number: string;
    purchase_date: string;
    payment_status: "paid" | "pending";
    payment_method: "cash" | "transfer" | "debt";
    notes: string;
    items: Array<{
      item_type: "product" | "raw_material";
      id: number;
      name: string;
      quantity: number;
      buy_price: number;
    }>;
  }>({
    supplier_id: null,
    invoice_number: "",
    purchase_date: new Date().toISOString().split("T")[0],
    payment_status: "paid",
    payment_method: "cash",
    notes: "",
    items: [],
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const [purchasesRes, suppliersRes, productsRes, rmRes] = await Promise.all([
        api.purchases.list(activeStore.id, 100, 0).catch(() => ({ data: [], total: 0, limit: 100, offset: 0 })),
        api.suppliers.list(activeStore.id).catch(() => []),
        api.products.list(activeStore.id).catch(() => []),
        api.rawMaterials.list(activeStore.id).catch(() => []),
      ]);
      setPurchases(purchasesRes.data || []);
      setSuppliers(suppliersRes || []);
      setProducts(productsRes || []);
      setRawMaterials(rmRes || []);
    } catch (err) {
      console.error("Failed to load purchase data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStore]);

  // Metrics
  const metrics = useMemo(() => {
    const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const paidCount = purchases.filter((p) => p.payment_status === "paid").length;
    const pendingCount = purchases.filter((p) => p.payment_status === "pending").length;
    return {
      totalSpent,
      invoiceCount: purchases.length,
      paidCount,
      pendingCount,
      supplierCount: suppliers.length,
    };
  }, [purchases, suppliers]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchSearch =
        p.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supplier?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || p.payment_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.address || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [suppliers, searchQuery]);

  // Handle Add Item to Purchase Form
  const handleAddItem = (type: "product" | "raw_material", id: number) => {
    if (type === "product") {
      const prod = products.find((p) => p.id === id);
      if (!prod) return;
      // Check if already in items
      const existing = purchaseForm.items.find((it) => it.item_type === "product" && it.id === id);
      if (existing) {
        setPurchaseForm({
          ...purchaseForm,
          items: purchaseForm.items.map((it) =>
            it.item_type === "product" && it.id === id ? { ...it, quantity: it.quantity + 1 } : it
          ),
        });
      } else {
        setPurchaseForm({
          ...purchaseForm,
          items: [
            ...purchaseForm.items,
            {
              item_type: "product",
              id: prod.id,
              name: prod.name,
              quantity: 1,
              buy_price: prod.buy_price || 0,
            },
          ],
        });
      }
    } else {
      const rm = rawMaterials.find((r) => r.id === id);
      if (!rm) return;
      const existing = purchaseForm.items.find((it) => it.item_type === "raw_material" && it.id === id);
      if (existing) {
        setPurchaseForm({
          ...purchaseForm,
          items: purchaseForm.items.map((it) =>
            it.item_type === "raw_material" && it.id === id ? { ...it, quantity: it.quantity + 1 } : it
          ),
        });
      } else {
        setPurchaseForm({
          ...purchaseForm,
          items: [
            ...purchaseForm.items,
            {
              item_type: "raw_material",
              id: rm.id,
              name: `${rm.name} (${rm.unit})`,
              quantity: 1,
              buy_price: rm.cost_per_unit || 0,
            },
          ],
        });
      }
    }
  };

  const handleUpdateItemQty = (index: number, quantity: number) => {
    const next = [...purchaseForm.items];
    next[index].quantity = Math.max(1, quantity);
    setPurchaseForm({ ...purchaseForm, items: next });
  };

  const handleUpdateItemPrice = (index: number, buy_price: number) => {
    const next = [...purchaseForm.items];
    next[index].buy_price = Math.max(0, buy_price);
    setPurchaseForm({ ...purchaseForm, items: next });
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((_, i) => i !== index),
    });
  };

  const totalPurchaseCalc = useMemo(() => {
    return purchaseForm.items.reduce((sum, it) => sum + it.quantity * it.buy_price, 0);
  }, [purchaseForm.items]);

  // Handle Save Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    if (purchaseForm.items.length === 0) {
      setErrorMsg("Tambahkan minimal 1 item barang yang dibeli");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload: CreatePurchaseRequest = {
        supplier_id: purchaseForm.supplier_id ? Number(purchaseForm.supplier_id) : null,
        invoice_number: purchaseForm.invoice_number.trim() || undefined,
        purchase_date: purchaseForm.purchase_date,
        payment_status: purchaseForm.payment_status,
        payment_method: purchaseForm.payment_method,
        notes: purchaseForm.notes,
        items: purchaseForm.items.map((it) => ({
          item_type: it.item_type,
          product_id: it.item_type === "product" ? it.id : undefined,
          raw_material_id: it.item_type === "raw_material" ? it.id : undefined,
          item_name: it.name,
          quantity: it.quantity,
          buy_price: it.buy_price,
        })),
      };

      await api.purchases.create(activeStore.id, payload);
      setIsPurchaseModalOpen(false);
      setPurchaseForm({
        supplier_id: null,
        invoice_number: "",
        purchase_date: new Date().toISOString().split("T")[0],
        payment_status: "paid",
        payment_method: "cash",
        notes: "",
        items: [],
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan faktur pembelian");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Save / Update Supplier
  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!supplierForm.name.trim()) {
      setErrorMsg("Nama pemasok wajib diisi");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (editingSupplier) {
        await api.suppliers.update(activeStore.id, editingSupplier.id, supplierForm);
      } else {
        await api.suppliers.create(activeStore.id, supplierForm);
      }
      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      setSupplierForm({ name: "", phone: "", email: "", address: "", notes: "" });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan pemasok");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Supplier
  const handleDeleteSupplier = async (supplierId: number) => {
    if (!activeStore) return;
    if (!confirm("Apakah Anda yakin ingin menghapus pemasok ini?")) return;
    try {
      await api.suppliers.delete(activeStore.id, supplierId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus pemasok");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" />
            Pembelian & Pemasok (Kulakan)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catat stok masuk dari supplier, kelola faktur belanja toko, dan database pemasok.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "purchases" ? (
            <Button
              onClick={() => {
                setErrorMsg("");
                setIsPurchaseModalOpen(true);
              }}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Catat Pembelian Masuk (PO)
            </Button>
          ) : (
            <Button
              onClick={() => {
                setErrorMsg("");
                setEditingSupplier(null);
                setSupplierForm({ name: "", phone: "", email: "", address: "", notes: "" });
                setIsSupplierModalOpen(true);
              }}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Tambah Pemasok Baru
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Belanja (All Time)</p>
            <h3 className="text-xl font-bold text-foreground mt-1">{formatRupiah(metrics.totalSpent)}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Faktur Pembelian</p>
            <h3 className="text-xl font-bold text-foreground mt-1">{metrics.invoiceCount} Transaksi</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Pembayaran</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-emerald-600">{metrics.paidCount} Lunas</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-amber-600">{metrics.pendingCount} Tempo</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pemasok Terdaftar</p>
            <h3 className="text-xl font-bold text-foreground mt-1">{metrics.supplierCount} Vendor</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Building2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("purchases")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "purchases"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            Faktur & Stok Masuk ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "suppliers"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            Daftar Pemasok ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "purchases" ? "Cari no faktur/supplier..." : "Cari nama/HP pemasok..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {activeTab === "purchases" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="pending">Tempo / Pending</option>
            </select>
          )}

          <Button variant="outline" size="sm" onClick={loadData} title="Muat Ulang" className="h-9 px-2.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tab 1: Purchases Table */}
      {activeTab === "purchases" && (
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span>Memuat data pembelian...</span>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-foreground">Belum ada faktur pembelian</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klik tombol "Catat Pembelian Masuk" untuk menambah stok dan faktur baru.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">No. Faktur</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Pemasok</th>
                    <th className="py-3 px-4">Jumlah Item</th>
                    <th className="py-3 px-4">Total Tagihan</th>
                    <th className="py-3 px-4">Metode & Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPurchases.map((p) => {
                    const itemCount = p.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{p.invoice_number}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(p.purchase_date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {p.supplier ? (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {p.supplier.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Tanpa Supplier</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <Badge variant="outline" className="text-xs font-normal">
                            {p.items?.length || 0} jenis ({itemCount} unit)
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{formatRupiah(p.total_amount)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={p.payment_status === "paid" ? "default" : "secondary"}
                              className={`text-xs capitalize ${
                                p.payment_status === "paid"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {p.payment_status === "paid" ? "Lunas" : "Tempo"}
                            </Badge>
                            <span className="text-xs text-muted-foreground uppercase">({p.payment_method})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPurchase(p);
                              setIsDetailModalOpen(true);
                            }}
                            className="h-8 gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Suppliers Directory */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span>Memuat data pemasok...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border rounded-xl bg-card p-8 flex flex-col items-center justify-center gap-3">
              <Building2 className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-foreground">Belum ada data pemasok</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tambahkan supplier untuk mencatat kontak dan riwayat belanja secara rapi.
                </p>
              </div>
            </div>
          ) : (
            filteredSuppliers.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/70 bg-card p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{s.name}</h3>
                      {s.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.notes}</p>}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Truck className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {s.phone && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span>{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-start gap-2 text-foreground/80">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{s.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Terdaftar: {new Date(s.created_at || "").toLocaleDateString("id-ID")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSupplier(s);
                        setSupplierForm({
                          name: s.name,
                          phone: s.phone || "",
                          email: s.email || "",
                          address: s.address || "",
                          notes: s.notes || "",
                        });
                        setIsSupplierModalOpen(true);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSupplier(s.id)}
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal 1: Catat Pembelian Baru */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Catat Pembelian Masuk / Kulakan (PO)
            </DialogTitle>
            <DialogDescription>
              Input faktur stok masuk. Stok produk atau bahan baku akan otomatis bertambah ke sistem.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPurchase} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Pilih Pemasok (Supplier)</Label>
                <select
                  value={purchaseForm.supplier_id || ""}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      supplier_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full mt-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Tanpa Pemasok / Beli Lepas --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nomor Faktur / Nota Pembelian</Label>
                <Input
                  placeholder="Contoh: INV-SUP-009 (Kosongkan utk auto)"
                  value={purchaseForm.invoice_number}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
                  className="mt-1.5 h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Tanggal Pembelian</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                  className="mt-1.5 h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Status Bayar</Label>
                  <select
                    value={purchaseForm.payment_status}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        payment_status: e.target.value as "paid" | "pending",
                      })
                    }
                    className="w-full mt-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                  >
                    <option value="paid">Lunas</option>
                    <option value="pending">Tempo / Hutang</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Metode</Label>
                  <select
                    value={purchaseForm.payment_method}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        payment_method: e.target.value as "cash" | "transfer" | "debt",
                      })
                    }
                    className="w-full mt-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground"
                  >
                    <option value="cash">Tunai (Cash)</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="debt">Kasbon / Tempo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Item Selector Section */}
            <div className="pt-3 border-t border-border">
              <Label className="text-xs font-semibold mb-2 block">Pilih Barang yang Masuk:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                    <Package className="h-3 w-3" /> Tambah Produk Jadi:
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem("product", Number(e.target.value));
                        e.target.value = "";
                      }
                    }}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                  >
                    <option value="">+ Pilih Produk...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stok: {p.current_stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                    <Wheat className="h-3 w-3" /> Tambah Bahan Baku:
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem("raw_material", Number(e.target.value));
                        e.target.value = "";
                      }
                    }}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                  >
                    <option value="">+ Pilih Bahan Baku...</option>
                    {rawMaterials.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.unit} - Stok: {r.current_stock})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3">Nama Barang</th>
                      <th className="py-2 px-3 w-28">Kuantitas</th>
                      <th className="py-2 px-3 w-36">Harga Beli Satuan</th>
                      <th className="py-2 px-3 w-32 text-right">Subtotal</th>
                      <th className="py-2 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {purchaseForm.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground italic">
                          Belum ada item barang yang dipilih di atas.
                        </td>
                      </tr>
                    ) : (
                      purchaseForm.items.map((it, idx) => (
                        <tr key={`${it.item_type}-${it.id}-${idx}`}>
                          <td className="py-2 px-3 font-medium text-foreground">
                            <span className="flex items-center gap-1.5">
                              {it.item_type === "product" ? (
                                <Package className="h-3.5 w-3.5 text-blue-500" />
                              ) : (
                                <Wheat className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              {it.name}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                              className="h-7 w-24 text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min={0}
                              value={it.buy_price}
                              onChange={(e) => handleUpdateItemPrice(idx, parseInt(e.target.value) || 0)}
                              className="h-7 w-32 text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-foreground">
                            {formatRupiah(it.quantity * it.buy_price)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(idx)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="mt-3 flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/60">
                <span className="text-xs font-semibold text-muted-foreground">Total Tagihan Faktur:</span>
                <span className="text-lg font-bold text-foreground">{formatRupiah(totalPurchaseCalc)}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Catatan Tambahan (Opsional)</Label>
              <Input
                placeholder="Misal: Barang diantar via kurir toko, jatuh tempo 14 hari"
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                className="mt-1.5 h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting || purchaseForm.items.length === 0}>
                {submitting ? "Menyimpan..." : "Simpan & Tambah Stok"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Tambah / Edit Supplier */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingSupplier ? "Edit Data Pemasok" : "Tambah Pemasok Baru"}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi kontak dan detail vendor penyedia barang toko Anda.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitSupplier} className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Nama Pemasok / Perusahaan *</Label>
              <Input
                placeholder="Contoh: PT Sumber Pangan Makmur / Toko Budi Grosir"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                required
                className="mt-1 h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Nomor WhatsApp / HP</Label>
                <Input
                  placeholder="081234567890"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  placeholder="sales@vendor.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Alamat Gudang / Toko</Label>
              <Input
                placeholder="Jl. Raya Pasar Induk No. 12"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                className="mt-1 h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Catatan / Rekening Bank</Label>
              <Input
                placeholder="BCA 123456789 a/n Budi (Tempo max 7 hari)"
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                className="mt-1 h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSupplierModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : editingSupplier ? "Simpan Perubahan" : "Tambah Pemasok"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Detail Faktur Pembelian */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Detail Faktur Pembelian
              </span>
              <Badge
                variant={selectedPurchase?.payment_status === "paid" ? "default" : "secondary"}
                className={`text-xs ${
                  selectedPurchase?.payment_status === "paid"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}
              >
                {selectedPurchase?.payment_status === "paid" ? "LUNAS" : "TEMPO / BELUM LUNAS"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block">Nomor Faktur:</span>
                  <span className="font-mono font-bold text-foreground">{selectedPurchase.invoice_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tanggal:</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedPurchase.purchase_date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Pemasok:</span>
                  <span className="font-medium text-foreground">
                    {selectedPurchase.supplier?.name || "Tanpa Supplier"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Metode Pembayaran:</span>
                  <span className="font-medium text-foreground uppercase">{selectedPurchase.payment_method}</span>
                </div>
              </div>

              {/* Items breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Daftar Barang Masuk:
                </h4>
                <div className="rounded-lg border border-border divide-y divide-border/60">
                  {selectedPurchase.items?.map((it) => (
                    <div key={it.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {it.item_type === "product" ? (
                            <Package className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <Wheat className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {it.item_name}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {it.quantity} unit × {formatRupiah(it.buy_price)}
                        </div>
                      </div>
                      <div className="font-bold text-foreground">{formatRupiah(it.subtotal)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-bold text-foreground">Total Tagihan:</span>
                <span className="text-lg font-bold text-primary">{formatRupiah(selectedPurchase.total_amount)}</span>
              </div>

              {selectedPurchase.notes && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Catatan: </span>
                  {selectedPurchase.notes}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Tutup
            </Button>
            <Button
              onClick={() => {
                window.print();
              }}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Cetak Nota Faktur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
