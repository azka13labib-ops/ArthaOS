"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  History,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  X,
  FileSpreadsheet,
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
import { Product, InventoryMovement } from "@/lib/types";

export default function InventoryPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductSKU, setNewProductSKU] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductBuyPrice, setNewProductBuyPrice] = useState<number | "">("");
  const [newProductSellPrice, setNewProductSellPrice] = useState<number | "">("");
  const [newProductInitialStock, setNewProductInitialStock] = useState<number | "">("");
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productError, setProductError] = useState("");

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number | "">("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "reduce">("add");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // Movements Audit Modal
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadProducts = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const data = await api.products.list(activeStore.id);
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadProducts();
    }
  }, [activeStore, loadProducts]);

  // Create Product handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!newProductName.trim() || !newProductSKU.trim()) {
      setProductError("Nama produk dan SKU wajib diisi");
      return;
    }

    setProductError("");
    setIsSubmittingProduct(true);

    try {
      await api.products.create(activeStore.id, {
        name: newProductName.trim(),
        sku: newProductSKU.trim().toUpperCase(),
        barcode: newProductBarcode.trim() || undefined,
        buy_price: Number(newProductBuyPrice) || 0,
        sell_price: Number(newProductSellPrice) || 0,
        initial_stock: Number(newProductInitialStock) || 0,
      });

      await loadProducts();
      setIsAddModalOpen(false);
      setNewProductName("");
      setNewProductSKU("");
      setNewProductBarcode("");
      setNewProductBuyPrice("");
      setNewProductSellPrice("");
      setNewProductInitialStock("");
    } catch (err: unknown) {
      setProductError(
        err instanceof Error ? err.message : "Gagal menambahkan produk baru"
      );
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Adjust stock handler
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !selectedProduct) return;
    const deltaNumber = Number(adjustmentDelta);
    if (!deltaNumber || deltaNumber === 0) {
      setAdjustError("Masukkan jumlah penyesuaian yang valid");
      return;
    }

    const finalDelta = adjustmentType === "add" ? Math.abs(deltaNumber) : -Math.abs(deltaNumber);

    if (adjustmentType === "reduce" && Math.abs(finalDelta) > selectedProduct.current_stock) {
      setAdjustError("Jumlah pengurangan melebihi stok yang tersedia saat ini");
      return;
    }

    setAdjustError("");
    setIsSubmittingAdjust(true);

    try {
      await api.products.adjustStock(
        activeStore.id,
        selectedProduct.id,
        finalDelta,
        adjustmentNotes.trim() || (adjustmentType === "add" ? "Restock manual" : "Koreksi opname")
      );

      await loadProducts();
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
      setAdjustmentDelta("");
      setAdjustmentNotes("");
    } catch (err: unknown) {
      setAdjustError(
        err instanceof Error ? err.message : "Gagal menyesuaikan stok"
      );
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // View movements handler
  const handleViewMovements = async (product: Product) => {
    if (!activeStore) return;
    setMovementProduct(product);
    setIsMovementsModalOpen(true);
    setIsLoadingMovements(true);

    try {
      const data = await api.products.getMovements(activeStore.id, product.id);
      setMovements(Array.isArray(data) ? data : []);
    } catch {
      setMovements([]);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (stockFilter === "low") return p.current_stock > 0 && p.current_stock <= 5;
    if (stockFilter === "out") return p.current_stock === 0;
    return true;
  });

  const totalStockCount = products.reduce((sum, p) => sum + p.current_stock, 0);
  const totalValuation = products.reduce(
    (sum, p) => sum + p.sell_price * p.current_stock,
    0
  );

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-950 mb-1">
              Stok & Katalog Produk
            </h1>
            <p className="text-sm text-slate-500">
              Kelola daftar SKU, penetapan harga jual, mutasi stok, dan audit pergerakan barang.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadProducts}
              disabled={isLoading}
              className="rounded-none border-slate-200 hover:bg-slate-50 h-10 px-4"
              title="Segarkan daftar produk"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              variant="primary"
              className="rounded-none bg-slate-950 hover:bg-slate-800 text-white h-10 px-6"
              onClick={() => {
                setProductError("");
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Produk
            </Button>
          </div>
        </div>

        {/* 3 Overview Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6 uppercase tracking-wider">Total Variasi SKU</p>
            <h3 className="text-3xl font-medium text-slate-950 tracking-tight">
              {products.length} <span className="text-sm text-slate-500 font-normal tracking-normal lowercase">Item</span>
            </h3>
          </div>

          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6 uppercase tracking-wider">Total Unit Tersedia</p>
            <h3 className="text-3xl font-medium text-slate-950 tracking-tight">
              {totalStockCount} <span className="text-sm text-slate-500 font-normal tracking-normal lowercase">Pcs</span>
            </h3>
          </div>

          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6 uppercase tracking-wider">Nilai Aset Tersimpan</p>
            <h3 className="text-3xl font-medium text-emerald-700 tracking-tight">
              {formatIDR(totalValuation)}
            </h3>
          </div>
        </div>

        {/* Search & Stock Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96 group">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-700 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-none focus-visible:outline-none focus-visible:border-slate-400 transition-colors placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-950"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center w-full sm:w-auto border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                stockFilter === "all"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors border-l border-r border-slate-200 ${
                stockFilter === "low"
                  ? "bg-slate-950 text-white border-transparent"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Menipis (≤5)
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={`px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                stockFilter === "out"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Habis (0)
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white border border-slate-200">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="md" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Package className="w-8 h-8 text-slate-300" />}
              title="Tidak Ada Produk"
              description={
                searchQuery || stockFilter !== "all"
                  ? "Tidak ada produk yang sesuai dengan kriteria pencarian/filter."
                  : "Katalog produk Anda masih kosong."
              }
              actionLabel={
                searchQuery || stockFilter !== "all"
                  ? "Reset Filter"
                  : "Tambah Produk Baru"
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
                <thead className="text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">SKU & Barcode</th>
                    <th className="px-6 py-4 font-medium">Nama Produk</th>
                    <th className="px-6 py-4 font-medium text-right">Harga Beli</th>
                    <th className="px-6 py-4 font-medium text-right">Harga Jual</th>
                    <th className="px-6 py-4 font-medium text-right">Margin Laba</th>
                    <th className="px-6 py-4 font-medium text-center">Stok Fisik</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const margin =
                      p.sell_price > 0
                        ? Math.round(((p.sell_price - p.buy_price) / p.sell_price) * 100)
                        : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono">
                          <span className="font-semibold text-slate-950 block">{p.sku}</span>
                          <span className="text-[11px] text-slate-500 block tracking-wider mt-0.5">
                            {p.barcode || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-950 max-w-[200px] truncate">
                          {p.name}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500">
                          {formatIDR(p.buy_price)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-950">
                          {formatIDR(p.sell_price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-bold tracking-wider ${
                              margin >= 30
                                ? "bg-emerald-50 text-emerald-700"
                                : margin > 0
                                ? "bg-slate-100 text-slate-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            +{margin}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-bold ${
                              p.current_stock === 0
                                ? "bg-rose-100 text-rose-800"
                                : p.current_stock <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {p.current_stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              className="h-8 rounded-none border-slate-200 text-xs px-3"
                              onClick={() => {
                                setSelectedProduct(p);
                                setAdjustmentType("add");
                                setAdjustmentDelta("");
                                setAdjustError("");
                                setIsAdjustModalOpen(true);
                              }}
                              title="Sesuaikan stok / restock"
                            >
                              <SlidersHorizontal className="w-3 h-3 mr-1.5" /> Adjust
                            </Button>
                            <button
                              type="button"
                              className="h-8 w-8 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                              onClick={() => handleViewMovements(p)}
                              title="Riwayat mutasi stok"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
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

      {/* Modal 1: Add New Product */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Produk Baru"
        description="Daftarkan SKU baru dengan harga pokok (HPP) dan harga jual."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-5 pt-2">
          {productError && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200">
              {productError}
            </div>
          )}

          <Input
            label="Nama Produk"
            placeholder="Contoh: Kopi Susu Gula Aren 250ml"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kode SKU (Unik)"
              placeholder="Contoh: KOP-001"
              value={newProductSKU}
              onChange={(e) => setNewProductSKU(e.target.value)}
              required
            />
            <Input
              label="Barcode / EAN (Opsional)"
              placeholder="Contoh: 899123456789"
              value={newProductBarcode}
              onChange={(e) => setNewProductBarcode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Harga Beli (Rp)"
              type="number"
              placeholder="0"
              value={newProductBuyPrice}
              onChange={(e) => setNewProductBuyPrice(Number(e.target.value))}
              required
            />
            <Input
              label="Harga Jual (Rp)"
              type="number"
              placeholder="0"
              value={newProductSellPrice}
              onChange={(e) => setNewProductSellPrice(Number(e.target.value))}
              required
            />
            <Input
              label="Stok Awal (pcs)"
              type="number"
              placeholder="0"
              value={newProductInitialStock}
              onChange={(e) => setNewProductInitialStock(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-6"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="rounded-none px-6 bg-slate-950 text-white hover:bg-slate-800" isLoading={isSubmittingProduct}>
              Simpan Produk
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Adjust Stock */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Penyesuaian Stok"
        description={`Item: ${selectedProduct?.name} (${selectedProduct?.sku}) • Stok: ${selectedProduct?.current_stock} pcs`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-5 pt-2">
          {adjustError && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200">
              {adjustError}
            </div>
          )}

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-950 uppercase tracking-wide mb-2">
              Tipe Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-0 border border-slate-200">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`py-3 px-3 text-xs font-semibold tracking-wider uppercase transition-colors border-r border-slate-200 ${
                  adjustmentType === "add"
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                (+) Masuk
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("reduce")}
                className={`py-3 px-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
                  adjustmentType === "reduce"
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                (-) Keluar
              </button>
            </div>
          </div>

          <Input
            label="Jumlah Unit (pcs)"
            type="number"
            placeholder="Contoh: 10"
            value={adjustmentDelta}
            onChange={(e) => setAdjustmentDelta(Number(e.target.value))}
            required
            autoFocus
          />

          <Input
            label="Alasan / Catatan"
            placeholder="Contoh: Pembelian supplier / Barang pecah"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-6"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="rounded-none px-6 bg-slate-950 text-white hover:bg-slate-800" isLoading={isSubmittingAdjust}>
              Konfirmasi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Audit Movements */}
      <Modal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        title="Riwayat Pergerakan Stok"
        description={`Audit log untuk: ${movementProduct?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          {isLoadingMovements ? (
            <div className="p-8">
              <Spinner size="md" />
            </div>
          ) : movements.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200">
              Belum ada riwayat mutasi stok untuk produk ini.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-slate-200 divide-y divide-slate-100">
              {movements.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between text-sm bg-white">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-slate-950 uppercase text-xs tracking-wider">
                        {m.movement_type === "sale"
                          ? "Penjualan Kasir"
                          : m.movement_type === "restock"
                          ? "Restock Barang"
                          : m.movement_type === "adjustment"
                          ? "Penyesuaian Manual"
                          : m.movement_type}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    {m.notes && <p className="text-xs text-slate-500">{m.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-1 font-mono text-xs font-bold ${
                        m.quantity_delta > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-8"
              onClick={() => setIsMovementsModalOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
