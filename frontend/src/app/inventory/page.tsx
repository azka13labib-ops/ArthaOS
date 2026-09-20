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
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardContent } from "@/components/ui/Card";
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Stok & Katalog Produk
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola daftar SKU, penetapan harga jual, mutasi stok, dan audit pergerakan barang.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProducts}
              disabled={isLoading}
              title="Segarkan daftar produk"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setProductError("");
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Produk Baru
            </Button>
          </div>
        </div>

        {/* 3 Overview Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Variasi SKU
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {products.length} Item
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Unit Fisik Tersedia
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {totalStockCount} pcs
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Nilai Aset Harga Jual
              </p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">
                {formatIDR(totalValuation)}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Search & Stock Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === "low"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Menipis (≤5)
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === "out"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Habis (0)
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <Spinner size="lg" label="Memuat inventori..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Package className="w-8 h-8 text-slate-400" />}
              title="Tidak Ada Produk"
              description={
                searchQuery || stockFilter !== "all"
                  ? "Tidak ada produk yang sesuai dengan kriteria filter saat ini."
                  : "Katalog produk Anda masih kosong. Tambahkan produk pertama untuk mulai berjualan."
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
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">SKU & Barcode</th>
                    <th className="px-4 py-3.5">Nama Produk</th>
                    <th className="px-4 py-3.5 text-right">Harga Beli</th>
                    <th className="px-4 py-3.5 text-right">Harga Jual</th>
                    <th className="px-4 py-3.5 text-right">Margin Laba</th>
                    <th className="px-4 py-3.5 text-center">Stok Fisik</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const margin =
                      p.sell_price > 0
                        ? Math.round(((p.sell_price - p.buy_price) / p.sell_price) * 100)
                        : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-mono">
                          <span className="font-bold text-slate-900 block">{p.sku}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {p.barcode || "Tanpa Barcode"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-xs">
                          {p.name}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                          {formatIDR(p.buy_price)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          {formatIDR(p.sell_price)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              margin >= 30
                                ? "bg-emerald-50 text-emerald-700"
                                : margin > 0
                                ? "bg-blue-50 text-blue-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            +{margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-extrabold ${
                              p.current_stock === 0
                                ? "bg-rose-100 text-rose-700"
                                : p.current_stock <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {p.current_stock} pcs
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(p);
                                setAdjustmentType("add");
                                setAdjustmentDelta("");
                                setAdjustError("");
                                setIsAdjustModalOpen(true);
                              }}
                              title="Sesuaikan stok / restock"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Sesuaikan
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewMovements(p)}
                              title="Riwayat mutasi stok"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
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
        title="Tambah Produk Baru ke Katalog"
        description="Daftarkan SKU baru dengan harga pokok (HPP) dan harga jual."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {productError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Harga Beli / HPP (Rp)"
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

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingProduct}>
              Simpan Produk
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Adjust Stock */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Penyesuaian Stok Barang"
        description={`Produk: ${selectedProduct?.name} (${selectedProduct?.sku}) - Stok saat ini: ${selectedProduct?.current_stock} pcs`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          {adjustError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {adjustError}
            </div>
          )}

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Jenis Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  adjustmentType === "add"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                + Tambah Stok (Restock)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("reduce")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  adjustmentType === "reduce"
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                - Kurangi Stok (Rusak / Opname)
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
            label="Alasan / Catatan Penyesuaian"
            placeholder="Contoh: Pembelian supplier / Barang pecah / Hasil opname bulanan"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAdjust}>
              Konfirmasi Perubahan Stok
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Audit Movements */}
      <Modal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        title="Riwayat Mutasi & Pergerakan Stok"
        description={`Audit trail pergerakan stok untuk: ${movementProduct?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-3">
          {isLoadingMovements ? (
            <div className="p-8">
              <Spinner size="md" label="Memuat riwayat pergerakan..." />
            </div>
          ) : movements.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Belum ada riwayat mutasi stok untuk produk ini.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {movements.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 capitalize">
                        {m.movement_type === "sale"
                          ? "Penjualan Kasir"
                          : m.movement_type === "restock"
                          ? "Restock Barang"
                          : m.movement_type === "adjustment"
                          ? "Penyesuaian Manual"
                          : m.movement_type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    {m.notes && <p className="text-[11px] text-slate-500 mt-0.5">{m.notes}</p>}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        m.quantity_delta > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta} pcs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
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
