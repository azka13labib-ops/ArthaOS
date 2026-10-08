"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wheat,
  Plus,
  Search,
  SlidersHorizontal,
  X,
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

export default function RawMaterialsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

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
      setError("Nama, SKU, dan Satuan wajib diisi");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.rawMaterials.create(activeStore.id, {
        name: newName.trim(),
        sku: newSKU.trim().toUpperCase(),
        unit: newUnit.trim(),
        cost_per_unit: Number(newCost) || 0,
        initial_stock: Number(newInitialStock) || 0,
      });

      await loadRawMaterials();
      setIsAddModalOpen(false);
      setNewName("");
      setNewSKU("");
      setNewUnit("");
      setNewCost("");
      setNewInitialStock("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan bahan baku"
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
    if (!deltaNumber || deltaNumber === 0) {
      setAdjustError("Masukkan jumlah penyesuaian yang valid");
      return;
    }

    const finalDelta = adjustmentType === "add" ? Math.abs(deltaNumber) : -Math.abs(deltaNumber);

    if (adjustmentType === "reduce" && Math.abs(finalDelta) > selectedMaterial.current_stock) {
      setAdjustError("Jumlah pengurangan melebihi stok yang tersedia saat ini");
      return;
    }

    setAdjustError("");
    setIsSubmittingAdjust(true);

    try {
      await api.rawMaterials.adjustStock(
        activeStore.id,
        selectedMaterial.id,
        finalDelta,
        adjustmentNotes.trim() || undefined
      );

      await loadRawMaterials();
      setIsAdjustModalOpen(false);
      setSelectedMaterial(null);
      setAdjustmentDelta("");
      setAdjustmentNotes("");
    } catch (err: unknown) {
      setAdjustError(
        err instanceof Error ? err.message : "Gagal menyesuaikan stok bahan baku"
      );
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Filtered list
  const filteredMaterials = rawMaterials.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (stockFilter === "low") return m.current_stock > 0 && m.current_stock <= 5;
    if (stockFilter === "out") return m.current_stock === 0;
    return true;
  });

  const totalValuation = rawMaterials.reduce(
    (sum, m) => sum + m.cost_per_unit * m.current_stock,
    0
  );

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground mb-1">
              Bahan Baku
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola stok bahan baku (Raw Materials) untuk produksi resep (BOM).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              className="h-10 px-6 shadow-sm"
              onClick={() => {
                setError("");
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Bahan Baku
            </Button>
          </div>
        </div>

        {/* Overview Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8 flex flex-col justify-between hover:border-primary/50 transition-colors">
            <p className="text-[13px] font-medium text-muted-foreground mb-6 uppercase tracking-wider">Total Item Bahan</p>
            <h3 className="text-3xl font-medium text-foreground tracking-tight">
              {rawMaterials.length} <span className="text-sm text-muted-foreground font-normal tracking-normal lowercase">Item</span>
            </h3>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8 flex flex-col justify-between hover:border-primary/50 transition-colors">
            <p className="text-[13px] font-medium text-muted-foreground mb-6 uppercase tracking-wider">Nilai Total Bahan Baku</p>
            <h3 className="text-3xl font-medium text-primary tracking-tight">
              {formatIDR(totalValuation)}
            </h3>
          </div>
        </div>

        {/* Search & Stock Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96 group">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Cari nama bahan baku, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-background text-foreground border border-border rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary hover:border-primary/50 transition-colors placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center w-full sm:w-auto border border-border bg-card rounded-md shadow-sm overflow-hidden p-1 gap-1">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`px-4 py-1.5 text-xs font-semibold tracking-wide rounded-sm transition-colors ${
                stockFilter === "all"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Semua ({rawMaterials.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`px-4 py-1.5 text-xs font-semibold tracking-wide rounded-sm transition-colors ${
                stockFilter === "low"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Menipis (≤5)
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={`px-4 py-1.5 text-xs font-semibold tracking-wide rounded-sm transition-colors ${
                stockFilter === "out"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Habis (0)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="md" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <EmptyState
              icon={<Wheat className="w-8 h-8 text-muted-foreground" />}
              title="Tidak Ada Bahan Baku"
              description={
                searchQuery || stockFilter !== "all"
                  ? "Tidak ada bahan baku yang sesuai dengan kriteria pencarian/filter."
                  : "Katalog bahan baku Anda masih kosong."
              }
              actionLabel={
                searchQuery || stockFilter !== "all"
                  ? "Reset Filter"
                  : "Tambah Bahan Baku Baru"
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">SKU</th>
                    <th className="px-6 py-4 font-medium">Nama Bahan Baku</th>
                    <th className="px-6 py-4 font-medium text-right">Harga Pokok (Per Satuan)</th>
                    <th className="px-6 py-4 font-medium text-center">Stok</th>
                    <th className="px-6 py-4 font-medium text-center">Satuan</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-card transition-colors">
                      <td className="px-6 py-4 font-mono">
                        <span className="font-semibold text-foreground block">{m.sku}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground max-w-[200px] truncate">
                        {m.name}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {formatIDR(m.cost_per_unit)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-bold ${
                            m.current_stock === 0
                              ? "bg-rose-100 text-rose-700"
                              : m.current_stock <= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {m.current_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-muted-foreground">
                        {m.unit}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            className="h-8 text-xs px-3"
                            onClick={() => {
                              setSelectedMaterial(m);
                              setAdjustmentType("add");
                              setAdjustmentDelta("");
                              setAdjustError("");
                              setIsAdjustModalOpen(true);
                            }}
                            title="Sesuaikan stok"
                          >
                            <SlidersHorizontal className="w-3 h-3 mr-1.5" /> Adjust
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Add New */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Bahan Baku Baru"
        description="Daftarkan SKU bahan baku baru untuk digunakan pada resep produk."
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20">
              {error}
            </div>
          )}

          <Input
            label="Nama Bahan Baku"
            placeholder="Contoh: Biji Kopi Arabica"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kode SKU (Unik)"
              placeholder="Contoh: RM-KOP-ARB"
              value={newSKU}
              onChange={(e) => setNewSKU(e.target.value)}
              required
            />
            <Input
              label="Satuan Unit"
              placeholder="Contoh: gram, ml, pcs"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Harga Pokok Per Satuan (Rp)"
              type="number"
              placeholder="0"
              value={newCost}
              onChange={(e) => setNewCost(Number(e.target.value))}
              required
            />
            <Input
              label="Stok Awal (dalam satuan)"
              type="number"
              placeholder="0"
              value={newInitialStock}
              onChange={(e) => setNewInitialStock(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="px-6"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="default" className="px-6 shadow-sm" isLoading={isSubmitting}>
              Simpan Bahan Baku
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Adjust Stock */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Penyesuaian Stok"
        description={`Item: ${selectedMaterial?.name} (${selectedMaterial?.sku}) • Stok: ${selectedMaterial?.current_stock} ${selectedMaterial?.unit}`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-5 pt-2">
          {adjustError && (
            <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20">
              {adjustError}
            </div>
          )}

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              Tipe Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`py-3 px-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-colors border ${
                  adjustmentType === "add"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                (+) Masuk
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("reduce")}
                className={`py-3 px-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-colors border ${
                  adjustmentType === "reduce"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                (-) Keluar
              </button>
            </div>
          </div>

          <Input
            label={`Jumlah (${selectedMaterial?.unit})`}
            type="number"
            placeholder="Contoh: 100"
            value={adjustmentDelta}
            onChange={(e) => setAdjustmentDelta(Number(e.target.value))}
            required
            autoFocus
          />

          <Input
            label="Alasan / Catatan (Opsional)"
            placeholder="Contoh: Pembelian supplier / Barang rusak"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="px-6"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="default" className="px-6 shadow-sm" isLoading={isSubmittingAdjust}>
              Konfirmasi
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
