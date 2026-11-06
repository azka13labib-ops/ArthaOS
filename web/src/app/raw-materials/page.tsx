"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wheat,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
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
import { formatIDR } from "@/lib/utils";
import { RawMaterial } from "@/lib/types";

// Common F&B and retail units preset
const COMMON_UNITS = [
  "gram",
  "kg",
  "ml",
  "liter",
  "pcs",
  "pack",
  "butir",
  "porsi",
  "sachet",
  "lembar",
];

const ADJUSTMENT_REASONS = [
  "Pembelian baru",
  "Koreksi stok opname",
  "Bahan rusak atau kadaluarsa",
  "Bahan tumpah atau susut",
  "Sampel atau uji coba",
];

export default function RawMaterialsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "safe" | "low" | "out">("all");

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Add Raw Material Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSKU, setNewSKU] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCost, setNewCost] = useState<number | "">("");
  const [newInitialStock, setNewInitialStock] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number | "">("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "reduce">("add");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadRawMaterials = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const data = await api.rawMaterials.list(activeStore.id);
      setRawMaterials(Array.isArray(data) ? data : []);
    } catch {
      setRawMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadRawMaterials();
    }
  }, [activeStore, loadRawMaterials]);

  // Create handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;

    if (!newName.trim() || !newSKU.trim() || !newUnit.trim()) {
      setError("Nama bahan baku, SKU, dan Satuan unit wajib diisi.");
      return;
    }

    const costNum = Number(newCost);
    if (newCost === "" || isNaN(costNum) || costNum < 0) {
      setError("Harga pokok per satuan harus bernilai minimal 0.");
      return;
    }

    const stockNum = Number(newInitialStock);
    if (newInitialStock === "" || isNaN(stockNum) || stockNum < 0) {
      setError("Stok awal harus bernilai minimal 0.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.rawMaterials.create(activeStore.id, {
        name: newName.trim(),
        sku: newSKU.trim().toUpperCase(),
        unit: newUnit.trim().toLowerCase(),
        cost_per_unit: costNum,
        initial_stock: stockNum,
      });

      await loadRawMaterials();
      setIsAddModalOpen(false);
      setNewName("");
      setNewSKU("");
      setNewUnit("");
      setNewCost("");
      setNewInitialStock("");
      showToast(`Bahan baku "${newName.trim()}" berhasil ditambahkan.`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan bahan baku baru."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Adjust stock handler
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !selectedMaterial) return;

    const deltaNumber = Number(adjustmentDelta);
    if (!deltaNumber || deltaNumber <= 0 || isNaN(deltaNumber)) {
      setAdjustError("Masukkan kuantitas penyesuaian yang lebih besar dari 0.");
      return;
    }

    const finalDelta = adjustmentType === "add" ? Math.abs(deltaNumber) : -Math.abs(deltaNumber);

    if (adjustmentType === "reduce" && Math.abs(finalDelta) > selectedMaterial.current_stock) {
      setAdjustError(
        `Pengurangan (${deltaNumber} ${selectedMaterial.unit}) melebihi stok yang tersedia (${selectedMaterial.current_stock} ${selectedMaterial.unit}).`
      );
      return;
    }

    setAdjustError("");
    setIsSubmittingAdjust(true);

    try {
      await api.rawMaterials.adjustStock(
        activeStore.id,
        selectedMaterial.id,
        finalDelta,
        adjustmentNotes.trim() || (adjustmentType === "add" ? "Penerimaan stok bahan" : "Pengurangan stok bahan")
      );

      await loadRawMaterials();
      setIsAdjustModalOpen(false);
      const actionName = adjustmentType === "add" ? "ditambahkan" : "dikurangkan";
      showToast(
        `Stok ${selectedMaterial.name} berhasil ${actionName} sebesar ${deltaNumber} ${selectedMaterial.unit}.`
      );
      setSelectedMaterial(null);
      setAdjustmentDelta("");
      setAdjustmentNotes("");
    } catch (err: unknown) {
      setAdjustError(
        err instanceof Error ? err.message : "Gagal memperbarui stok bahan baku."
      );
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const totalItems = rawMaterials.length;
    const totalValuation = rawMaterials.reduce(
      (sum, m) => sum + m.cost_per_unit * m.current_stock,
      0
    );
    const lowStockCount = rawMaterials.filter(
      (m) => m.current_stock > 0 && m.current_stock <= 5
    ).length;
    const outOfStockCount = rawMaterials.filter((m) => m.current_stock === 0).length;
    const safeStockCount = rawMaterials.filter((m) => m.current_stock > 5).length;

    return {
      totalItems,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      safeStockCount,
    };
  }, [rawMaterials]);

  // Filtered list
  const filteredMaterials = useMemo(() => {
    return rawMaterials.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (stockFilter === "safe") return m.current_stock > 5;
      if (stockFilter === "low") return m.current_stock > 0 && m.current_stock <= 5;
      if (stockFilter === "out") return m.current_stock === 0;
      return true;
    });
  }, [rawMaterials, searchQuery, stockFilter]);

  // Helper for stock status badge
  const getStockBadge = (stock: number, unit: string) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Habis (0 {unit})
        </span>
      );
    }
    if (stock <= 5) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Menipis ({stock} {unit})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Aman ({stock} {unit})
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
        {/* Floating Notification Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 border transition-all duration-200 ${
              toast.ok
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-rose-600 text-white border-rose-500"
            }`}
          >
            {toast.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-80 p-1"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Wheat className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Bahan Baku & Inventaris
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola stok bahan baku mentah, satuan unit, nilai modal, dan komposisi resep (BOM).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              className="min-h-[44px] px-3.5 text-xs font-medium"
              onClick={loadRawMaterials}
              title="Perbarui data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>

            <Button
              variant="default"
              size="default"
              className="min-h-[44px] px-4 font-semibold shadow-sm"
              onClick={() => {
                setError("");
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Bahan Baku
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Jenis Bahan
              </p>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.totalItems}{" "}
                <span className="text-xs font-normal text-muted-foreground">varian</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {stats.safeStockCount} aman dalam persediaan
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nilai Total Aset Bahan
              </p>
              <h3 className="text-2xl font-bold text-primary">
                {formatIDR(stats.totalValuation)}
              </h3>
              <p className="text-xs text-muted-foreground">
                Modal persediaan bahan baku aktif
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Peringatan Stok Kritis
              </p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {stats.lowStockCount + stats.outOfStockCount}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {stats.outOfStockCount} habis, {stats.lowStockCount} menipis
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Perlu restock segera untuk produksi
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama bahan, kode SKU, atau satuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 min-h-[44px] text-sm bg-background text-foreground border border-border rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-muted/40 border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`px-3 py-2 min-h-[40px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                stockFilter === "all"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Semua ({stats.totalItems})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("safe")}
              className={`px-3 py-2 min-h-[40px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                stockFilter === "safe"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Stok Aman ({stats.safeStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`px-3 py-2 min-h-[40px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                stockFilter === "low"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Menipis ({stats.lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={`px-3 py-2 min-h-[40px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                stockFilter === "out"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Habis ({stats.outOfStockCount})
            </button>
          </div>
        </div>

        {/* Content Area: Table on Desktop, Cards on Mobile */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Spinner size="md" />
              <p className="text-sm">Memuat inventaris bahan baku...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<Wheat className="w-10 h-10 text-muted-foreground" />}
                title="Bahan Baku Tidak Ditemukan"
                description={
                  searchQuery || stockFilter !== "all"
                    ? "Tidak ada item bahan baku yang sesuai dengan kriteria filter saat ini."
                    : "Anda belum mendaftarkan bahan baku untuk outlet ini. Tambahkan bahan baku baru untuk mulai membuat resep produk."
                }
                actionLabel={
                  searchQuery || stockFilter !== "all"
                    ? "Reset Filter"
                    : "Tambah Bahan Baku Pertama"
                }
                onAction={() => {
                  if (searchQuery || stockFilter !== "all") {
                    setSearchQuery("");
                    setStockFilter("all");
                  } else {
                    setIsAddModalOpen(true);
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-muted/30 text-muted-foreground border-b border-border text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">SKU</th>
                      <th className="px-6 py-3.5">Nama Bahan</th>
                      <th className="px-6 py-3.5 text-right">Harga Pokok Satuan</th>
                      <th className="px-6 py-3.5 text-center">Stok Fisik</th>
                      <th className="px-6 py-3.5 text-center">Satuan Unit</th>
                      <th className="px-6 py-3.5 text-right">Nilai Total Modal</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMaterials.map((m) => {
                      const totalCostVal = m.cost_per_unit * m.current_stock;
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-muted/20 transition-colors group"
                        >
                          <td className="px-6 py-4 font-mono text-xs">
                            <span className="px-2 py-1 rounded-md bg-muted font-medium text-foreground border border-border">
                              {m.sku}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground text-sm">
                              {m.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-foreground">
                            {formatIDR(m.cost_per_unit)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              / {m.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-base font-bold text-foreground">
                              {m.current_stock.toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                              {m.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-primary">
                            {formatIDR(totalCostVal)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {getStockBadge(m.current_stock, m.unit)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-[36px] text-xs font-medium px-3 gap-1.5"
                              onClick={() => {
                                setSelectedMaterial(m);
                                setAdjustmentType("add");
                                setAdjustmentDelta("");
                                setAdjustmentNotes("");
                                setAdjustError("");
                                setIsAdjustModalOpen(true);
                              }}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              Sesuaikan Stok
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards */}
              <div className="block md:hidden divide-y divide-border">
                {filteredMaterials.map((m) => {
                  const totalCostVal = m.cost_per_unit * m.current_stock;
                  return (
                    <div key={m.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-muted font-mono text-[11px] font-medium text-muted-foreground border border-border">
                            {m.sku}
                          </span>
                          <h4 className="text-base font-bold text-foreground mt-1">
                            {m.name}
                          </h4>
                        </div>
                        {getStockBadge(m.current_stock, m.unit)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-3 rounded-lg border border-border">
                        <div>
                          <p className="text-muted-foreground">Stok Saat Ini:</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {m.current_stock.toLocaleString("id-ID")} {m.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Harga Modal:</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {formatIDR(m.cost_per_unit)} / {m.unit}
                          </p>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-border flex justify-between items-center">
                          <span className="text-muted-foreground">Total Nilai Bahan:</span>
                          <span className="font-semibold text-primary">
                            {formatIDR(totalCostVal)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="default"
                        className="w-full min-h-[44px] text-xs font-semibold justify-center"
                        onClick={() => {
                          setSelectedMaterial(m);
                          setAdjustmentType("add");
                          setAdjustmentDelta("");
                          setAdjustmentNotes("");
                          setAdjustError("");
                          setIsAdjustModalOpen(true);
                        }}
                      >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Sesuaikan Stok Bahan
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal 1: Tambah Bahan Baku Baru */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Bahan Baku Baru"
        description="Daftarkan jenis bahan baku mentah baru untuk inventaris dan formulasi resep menu."
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Nama Bahan Baku"
            placeholder="Contoh: Biji Kopi House Blend Arabica"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              // Auto suggest SKU if empty
              if (!newSKU && e.target.value.length >= 3) {
                const words = e.target.value.trim().split(" ");
                const code = words
                  .slice(0, 3)
                  .map((w) => w.substring(0, 3).toUpperCase())
                  .join("-");
                setNewSKU(`RM-${code}`);
              }
            }}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kode SKU (Unik)"
              placeholder="Contoh: RM-KOP-ARB"
              value={newSKU}
              onChange={(e) => setNewSKU(e.target.value.toUpperCase())}
              required
              helperText="Gunakan kode yang ringkas dan mudah diingat."
            />

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Satuan Unit Dasar
              </label>
              <Input
                placeholder="Contoh: gram, kg, ml, pcs"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                required
              />
              {/* Quick unit suggestion pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setNewUnit(u)}
                    className={`px-2 py-1 text-[11px] rounded-md font-medium border transition-colors ${
                      newUnit.toLowerCase() === u
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Harga Pokok Modal (Rp per ${newUnit || "satuan"})`}
              type="number"
              min="0"
              placeholder="0"
              value={newCost}
              onChange={(e) => setNewCost(e.target.value === "" ? "" : Number(e.target.value))}
              required
              helperText="Biaya pembelian per satuan unit terkecil."
            />

            <Input
              label={`Stok Awal Fisik (${newUnit || "satuan"})`}
              type="number"
              min="0"
              placeholder="0"
              value={newInitialStock}
              onChange={(e) =>
                setNewInitialStock(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              helperText="Kuantitas bahan yang saat ini ada di gudang/outlet."
            />
          </div>

          {/* Quick Projection Card */}
          {newCost !== "" && newInitialStock !== "" && (
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Estimasi Total Nilai Persediaan Awal:
              </span>
              <span className="font-bold text-primary text-sm">
                {formatIDR((Number(newCost) || 0) * (Number(newInitialStock) || 0))}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] px-5"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="min-h-[44px] px-6 shadow-sm font-semibold"
              isLoading={isSubmitting}
            >
              Simpan Bahan Baku
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Penyesuaian Stok (Stock Adjustment) */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Penyesuaian Stok Bahan Baku"
        description={
          selectedMaterial
            ? `Atur penyesuaian kuantitas fisik untuk ${selectedMaterial.name} (${selectedMaterial.sku}).`
            : undefined
        }
        maxWidth="md"
      >
        <form onSubmit={handleAdjustStock} className="space-y-5 pt-2">
          {adjustError && (
            <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{adjustError}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          {selectedMaterial && (
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Stok Tersedia Saat Ini
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {selectedMaterial.current_stock.toLocaleString("id-ID")}{" "}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedMaterial.unit}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Harga Pokok
                </p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  {formatIDR(selectedMaterial.cost_per_unit)} / {selectedMaterial.unit}
                </p>
              </div>
            </div>
          )}

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Arah Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`min-h-[44px] py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all border flex items-center justify-center gap-2 ${
                  adjustmentType === "add"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Tambah Stok (Masuk)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("reduce")}
                className={`min-h-[44px] py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all border flex items-center justify-center gap-2 ${
                  adjustmentType === "reduce"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Kurangi Stok (Keluar)
              </button>
            </div>
          </div>

          <Input
            label={`Jumlah Kuantitas Penyesuaian (${selectedMaterial?.unit || "satuan"})`}
            type="number"
            min="0.01"
            step="any"
            placeholder="Contoh: 50"
            value={adjustmentDelta}
            onChange={(e) =>
              setAdjustmentDelta(e.target.value === "" ? "" : Number(e.target.value))
            }
            required
            autoFocus
          />

          {/* Live Math Projection Preview */}
          {selectedMaterial && adjustmentDelta !== "" && Number(adjustmentDelta) > 0 && (
            <div className="p-3 rounded-lg bg-card border border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Stok awal:</span>
                <span>
                  {selectedMaterial.current_stock} {selectedMaterial.unit}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Penyesuaian:</span>
                <span
                  className={
                    adjustmentType === "add"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }
                >
                  {adjustmentType === "add" ? "+" : "-"} {Number(adjustmentDelta)}{" "}
                  {selectedMaterial.unit}
                </span>
              </div>
              <div className="pt-1.5 border-t border-border flex justify-between font-bold text-foreground">
                <span>Estimasi Stok Baru:</span>
                <span>
                  {adjustmentType === "add"
                    ? selectedMaterial.current_stock + Number(adjustmentDelta)
                    : selectedMaterial.current_stock - Number(adjustmentDelta)}{" "}
                  {selectedMaterial.unit}
                </span>
              </div>
            </div>
          )}

          <div>
            <Input
              label="Alasan atau Catatan Penyesuaian"
              placeholder="Contoh: Pembelian baru dari supplier / Stok rusak"
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
            />
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ADJUSTMENT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setAdjustmentNotes(reason)}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium border transition-colors ${
                    adjustmentNotes === reason
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] px-5"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="min-h-[44px] px-6 shadow-sm font-semibold"
              isLoading={isSubmittingAdjust}
            >
              Konfirmasi Penyesuaian
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
