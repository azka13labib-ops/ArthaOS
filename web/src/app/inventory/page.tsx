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
  RefreshCw,
  X,
  Layers,
  Coins,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate, cn } from "@/lib/utils";
import { Product, InventoryMovement } from "@/lib/types";

export default function InventoryPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  // Toast feedback state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

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
      showToast("Gagal memuat katalog produk toko", "error");
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
      showToast("Produk baru berhasil ditambahkan ke katalog");
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
      setAdjustError("Jumlah pengurangan melebihi sisa stok yang tersedia");
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
      showToast(`Stok ${selectedProduct.name} berhasil diperbarui`);
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
      showToast("Gagal memuat log mutasi stok", "error");
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
              Stok & Katalog Produk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola daftar SKU, penetapan harga jual, mutasi stok, dan audit pergerakan barang.
            </p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={loadProducts}
              disabled={isLoading}
              className="h-11 sm:h-10 px-4 min-h-[44px] sm:min-h-[40px] rounded-lg border-border hover:bg-muted text-sm font-medium"
              title="Segarkan daftar produk"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Segarkan
            </Button>
            <Button
              variant="default"
              className="h-11 sm:h-10 px-5 min-h-[44px] sm:min-h-[40px] rounded-lg shadow-sm text-sm font-medium"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-20" />
              </div>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-32" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Variasi SKU
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {products.length}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">SKU</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Unit Tersedia
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {totalStockCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Pcs fisik</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Nilai Aset Tersimpan
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                    {formatIDR(totalValuation)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search & Stock Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, barcode..."
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

          {/* Filter Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border gap-1 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={cn(
                "h-9 px-3.5 rounded-md text-xs font-medium transition-all min-h-[36px] flex items-center justify-center shrink-0",
                stockFilter === "all"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              Semua ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={cn(
                "h-9 px-3.5 rounded-md text-xs font-medium transition-all min-h-[36px] flex items-center justify-center shrink-0",
                stockFilter === "low"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              Menipis (≤5)
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={cn(
                "h-9 px-3.5 rounded-md text-xs font-medium transition-all min-h-[36px] flex items-center justify-center shrink-0",
                stockFilter === "out"
                  ? "bg-destructive/15 text-destructive font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              Habis (0)
            </button>
          </div>
        </div>

        {/* Products Table Card */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-9 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 sm:p-12">
              <EmptyState
                icon={<Package className="w-8 h-8 text-muted-foreground" />}
                title="Tidak Ada Produk"
                description={
                  searchQuery || stockFilter !== "all"
                    ? "Tidak ada produk yang cocok dengan pencarian atau filter yang dipilih."
                    : "Katalog produk toko Anda masih kosong. Daftarkan produk untuk mulai mengelola stok."
                }
                actionLabel={
                  searchQuery || stockFilter !== "all"
                    ? "Reset Pencarian & Filter"
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
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 sm:px-6 py-3.5">SKU & Barcode</th>
                    <th className="px-5 sm:px-6 py-3.5">Nama Produk</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Harga Beli</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Harga Jual</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Margin Laba</th>
                    <th className="px-5 sm:px-6 py-3.5 text-center">Stok Fisik</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((p) => {
                    const margin =
                      p.sell_price > 0
                        ? Math.round(((p.sell_price - p.buy_price) / p.sell_price) * 100)
                        : 0;

                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 sm:px-6 py-4 font-mono">
                          <span className="font-semibold text-foreground block text-sm">{p.sku}</span>
                          <span className="text-[11px] text-muted-foreground block tracking-wider mt-0.5">
                            {p.barcode || "-"}
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 font-medium text-foreground max-w-[240px] truncate">
                          {p.name}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right text-muted-foreground">
                          {formatIDR(p.buy_price)}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right font-semibold text-foreground">
                          {formatIDR(p.sell_price)}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
                              margin >= 30
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : margin > 0
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {margin > 0 ? `+${margin}%` : `${margin}%`}
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[28px] px-2.5 py-1 rounded-md text-xs font-semibold border",
                              p.current_stock === 0
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : p.current_stock <= 5
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-muted text-foreground border-border"
                            )}
                          >
                            {p.current_stock}
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 sm:h-9 px-3 min-h-[40px] sm:min-h-[36px] rounded-lg text-xs font-medium border-border hover:bg-muted"
                              onClick={() => {
                                setSelectedProduct(p);
                                setAdjustmentType("add");
                                setAdjustmentDelta("");
                                setAdjustError("");
                                setIsAdjustModalOpen(true);
                              }}
                              title="Sesuaikan stok atau restock"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" /> Adjust
                            </Button>
                            <button
                              type="button"
                              className="h-10 w-10 sm:h-9 sm:w-9 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              onClick={() => handleViewMovements(p)}
                              title="Riwayat mutasi stok"
                              aria-label={`Riwayat mutasi untuk ${p.name}`}
                            >
                              <History className="w-4 h-4" />
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
        className="sm:max-w-xl rounded-2xl p-6 shadow-xl border border-border bg-card"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 pt-1">
          {productError && (
            <div className="p-3 rounded-lg text-xs text-destructive bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{productError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nama Produk <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Kopi Susu Gula Aren 250ml"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              required
              autoFocus
              className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Kode SKU (Unik) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: KOP-001"
                value={newProductSKU}
                onChange={(e) => setNewProductSKU(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm font-mono bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Barcode / EAN (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 899123456789"
                value={newProductBarcode}
                onChange={(e) => setNewProductBarcode(e.target.value)}
                className="w-full h-11 px-3 text-sm font-mono bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Harga Beli (Rp) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={newProductBuyPrice}
                onChange={(e) => setNewProductBuyPrice(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Harga Jual (Rp) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={newProductSellPrice}
                onChange={(e) => setNewProductSellPrice(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Stok Awal (pcs) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={newProductInitialStock}
                onChange={(e) => setNewProductInitialStock(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 px-5 rounded-lg border-border hover:bg-muted min-h-[44px] sm:min-h-[40px]"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="h-11 sm:h-10 px-6 rounded-lg min-h-[44px] sm:min-h-[40px] shadow-sm"
              isLoading={isSubmittingProduct}
            >
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
        description={
          selectedProduct
            ? `Item: ${selectedProduct.name} (${selectedProduct.sku}) - Sisa Stok: ${selectedProduct.current_stock} pcs`
            : "Sesuaikan jumlah unit stok fisik."
        }
        maxWidth="lg"
        className="sm:max-w-xl rounded-2xl p-6 shadow-xl border border-border bg-card"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4 pt-1">
          {adjustError && (
            <div className="p-3 rounded-lg text-xs text-destructive bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{adjustError}</span>
            </div>
          )}

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wider">
              Tipe Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={cn(
                  "h-11 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border flex items-center justify-center gap-1.5 min-h-[44px]",
                  adjustmentType === "add"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <ArrowUpRight className="w-4 h-4" /> Masuk (Restock)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("reduce")}
                className={cn(
                  "h-11 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border flex items-center justify-center gap-1.5 min-h-[44px]",
                  adjustmentType === "reduce"
                    ? "border-destructive bg-destructive/10 text-destructive shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <ArrowDownRight className="w-4 h-4" /> Keluar (Koreksi)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Jumlah Unit (pcs) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              placeholder="Contoh: 10"
              min="1"
              value={adjustmentDelta}
              onChange={(e) => setAdjustmentDelta(e.target.value === "" ? "" : Number(e.target.value))}
              required
              autoFocus
              className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Alasan atau Catatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Restock supplier, barang rusak, atau opname"
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-foreground"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 px-5 rounded-lg border-border hover:bg-muted min-h-[44px] sm:min-h-[40px]"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="h-11 sm:h-10 px-6 rounded-lg min-h-[44px] sm:min-h-[40px] shadow-sm"
              isLoading={isSubmittingAdjust}
            >
              Konfirmasi Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Audit Movements */}
      <Modal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        title="Riwayat Pergerakan Stok"
        description={
          movementProduct
            ? `Audit log mutasi untuk: ${movementProduct.name} (${movementProduct.sku})`
            : "Catatan riwayat transaksi dan penyesuaian stok."
        }
        maxWidth="lg"
        className="sm:max-w-xl rounded-2xl p-6 shadow-xl border border-border bg-card"
      >
        <div className="space-y-4 pt-1">
          {isLoadingMovements ? (
            <div className="py-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 border border-border rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border border-border rounded-xl bg-muted/20">
              <Package className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="font-medium text-foreground">Belum ada riwayat mutasi</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transaksi kasir atau penyesuaian stok akan tercatat otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-xl">
              {movements.map((m) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between text-sm bg-card hover:bg-muted/30 transition-colors">
                  <div className="pr-3">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <span className="font-medium text-foreground text-xs uppercase tracking-wider">
                        {m.movement_type === "sale"
                          ? "Penjualan Kasir"
                          : m.movement_type === "restock"
                          ? "Restock Barang"
                          : m.movement_type === "adjustment"
                          ? "Penyesuaian Manual"
                          : m.movement_type}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold border",
                        m.quantity_delta > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 px-6 rounded-lg border-border hover:bg-muted min-h-[44px] sm:min-h-[40px]"
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
