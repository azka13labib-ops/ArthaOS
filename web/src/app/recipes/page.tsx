"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  PackageOpen,
  ArrowLeft,
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Scale,
  X,
  PieChart,
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
import { Product, RawMaterial, RecipeItem } from "@/lib/types";
import { formatIDR } from "@/lib/utils";

export default function RecipesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recipeStatusFilter, setRecipeStatusFilter] = useState<"all" | "has_recipe" | "no_recipe">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Selected Product State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  // Mobile navigation state: show master list or detail view
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Add Recipe Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Delete Confirmation Modal (NO native confirm!)
  const [itemToDelete, setItemToDelete] = useState<RecipeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadInitialData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const [productsData, materialsData] = await Promise.all([
        api.products.list(activeStore.id),
        api.rawMaterials.list(activeStore.id),
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setRawMaterials(Array.isArray(materialsData) ? materialsData : []);
    } catch {
      setProducts([]);
      setRawMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadInitialData();
      setSelectedProduct(null);
      setRecipeItems([]);
      setMobileView("list");
    }
  }, [activeStore, loadInitialData]);

  const loadRecipe = async (product: Product) => {
    if (!activeStore) return;
    setSelectedProduct(product);
    setMobileView("detail");
    setIsLoadingRecipe(true);
    try {
      const data = await api.recipes.listByProduct(activeStore.id, product.id);
      setRecipeItems(Array.isArray(data) ? data : []);
    } catch {
      setRecipeItems([]);
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleAddRecipeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !selectedProduct) return;

    if (!selectedRawMaterialId) {
      setError("Pilih bahan baku terlebih dahulu.");
      return;
    }

    const qtyNumber = Number(quantity);
    if (!qtyNumber || qtyNumber <= 0 || isNaN(qtyNumber)) {
      setError("Masukkan kuantitas penggunaan yang valid (lebih dari 0).");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.recipes.addItem(activeStore.id, selectedProduct.id, {
        raw_material_id: Number(selectedRawMaterialId),
        quantity: qtyNumber,
      });

      await loadRecipe(selectedProduct);
      setIsAddModalOpen(false);
      setSelectedRawMaterialId("");
      setQuantity("");
      showToast("Bahan baku berhasil ditambahkan ke dalam formulasi resep.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan bahan baku ke resep."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeStore || !selectedProduct || !itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.recipes.deleteItem(activeStore.id, itemToDelete.id);
      await loadRecipe(selectedProduct);
      setItemToDelete(null);
      showToast("Komponen bahan berhasil dihapus dari resep.");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Gagal menghapus komponen bahan dari resep.",
        false
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Raw material lookup helper (guarantees robust data even if backend doesn't preload)
  const getMaterialForItem = useCallback(
    (item: RecipeItem): RawMaterial | undefined => {
      return (
        item.raw_material ||
        rawMaterials.find((rm) => rm.id === item.raw_material_id)
      );
    },
    [rawMaterials]
  );

  // HPP and Profitability Calculations for the selected product
  const hppAnalysis = useMemo(() => {
    if (!selectedProduct) return null;

    let totalHPP = 0;
    const itemsWithCost = recipeItems.map((item) => {
      const mat = getMaterialForItem(item);
      const costPerUnit = mat?.cost_per_unit || 0;
      const subtotalCost = costPerUnit * item.quantity;
      totalHPP += subtotalCost;

      // Serving capacity calculation: how many servings can be made with current stock of this ingredient
      const currentStock = mat?.current_stock || 0;
      const maxServings =
        item.quantity > 0 ? Math.floor(currentStock / item.quantity) : 0;

      return {
        ...item,
        material: mat,
        costPerUnit,
        subtotalCost,
        maxServings,
      };
    });

    const sellPrice = selectedProduct.sell_price || 0;
    const grossMargin = sellPrice - totalHPP;
    const marginPercentage =
      sellPrice > 0 ? (grossMargin / sellPrice) * 100 : 0;

    // Bottleneck / Serving Capacity
    let minCapacity = Infinity;
    let limitingMaterial: string | null = null;
    let limitingStock = 0;
    let limitingUnit = "";

    if (itemsWithCost.length > 0) {
      for (const item of itemsWithCost) {
        if (item.maxServings < minCapacity) {
          minCapacity = item.maxServings;
          limitingMaterial = item.material?.name || "Bahan Baku";
          limitingStock = item.material?.current_stock || 0;
          limitingUnit = item.material?.unit || "unit";
        }
      }
    } else {
      minCapacity = 0;
    }

    if (minCapacity === Infinity) minCapacity = 0;

    return {
      totalHPP,
      sellPrice,
      grossMargin,
      marginPercentage,
      itemsWithCost,
      servingCapacity: minCapacity,
      limitingMaterial,
      limitingStock,
      limitingUnit,
    };
  }, [selectedProduct, recipeItems, getMaterialForItem]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      // Check recipe status if products have recipe_items preloaded or we check by id
      return true;
    });
  }, [products, searchQuery]);

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
                <ChefHat className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Resep & HPP Produk (Bill of Materials)
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Atur formulasi bahan baku per menu untuk kalkulasi HPP otomatis dan pemotongan stok saat transaksi penjualan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border font-medium">
              {products.length} Total Produk
            </span>
            <span className="text-xs px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border font-medium">
              {rawMaterials.length} Pilihan Bahan Baku
            </span>
          </div>
        </div>

        {/* Main Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Master Panel: Product List */}
          <div
            className={`lg:col-span-4 bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col ${
              mobileView === "detail" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Search Box */}
            <div className="p-4 border-b border-border bg-muted/20 space-y-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari produk menu atau SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 min-h-[40px] text-sm bg-background text-foreground border border-border rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    aria-label="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Product List Items */}
            <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {isLoading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Spinner size="md" />
                  <span className="text-xs">Memuat katalog produk...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Tidak ada produk yang cocok dengan pencarian.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => loadRecipe(p)}
                      className={`w-full text-left p-4 min-h-[44px] flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-primary text-primary"
                          : "hover:bg-muted/40 border-l-4 border-transparent text-foreground"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {p.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            {p.sku}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatIDR(p.sell_price)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        <ChevronRight
                          className={`w-4 h-4 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Panel: Recipe & COGS Breakdown */}
          <div
            className={`lg:col-span-8 space-y-6 ${
              mobileView === "list" ? "hidden lg:block" : "block"
            }`}
          >
            {/* Mobile Back Button */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="default"
                className="min-h-[44px] w-full justify-start text-xs font-semibold gap-2 mb-4"
                onClick={() => setMobileView("list")}
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Daftar Produk
              </Button>
            </div>

            {!selectedProduct ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center shadow-xs">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <PackageOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    Pilih Produk Menu
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Silakan klik salah satu menu di daftar sebelah kiri untuk meninjau komposisi bahan, menghitung HPP (Harga Pokok Produksi), dan memantau margin keuntungan.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Product Detail Top Banner */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {selectedProduct.sku}
                      </span>
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedProduct.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>
                        Harga Jual:{" "}
                        <strong className="text-foreground">
                          {formatIDR(selectedProduct.sell_price)}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Komposisi:{" "}
                        <strong className="text-foreground">
                          {recipeItems.length} Bahan
                        </strong>
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="default"
                    size="default"
                    className="min-h-[44px] px-4 font-semibold shadow-sm shrink-0"
                    onClick={() => {
                      setError("");
                      setSelectedRawMaterialId("");
                      setQuantity("");
                      setIsAddModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Bahan Baku
                  </Button>
                </div>

                {/* HPP & Margin Calculation Hero Card */}
                {hppAnalysis && (
                  <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                          Kalkulasi HPP & Margin Keuntungan
                        </h3>
                      </div>

                      {/* Profit Margin Health Badge */}
                      {hppAnalysis.sellPrice > 0 && recipeItems.length > 0 && (
                        <div>
                          {hppAnalysis.grossMargin < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <TrendingDown className="w-3.5 h-3.5" />
                              Rugi (HPP &gt; Harga Jual)
                            </span>
                          ) : hppAnalysis.marginPercentage >= 65 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Margin Sangat Bagus ({hppAnalysis.marginPercentage.toFixed(1)}%)
                            </span>
                          ) : hppAnalysis.marginPercentage >= 35 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Margin Standar ({hppAnalysis.marginPercentage.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Margin Tipis ({hppAnalysis.marginPercentage.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Metric Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Total HPP */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Total HPP / Porsi
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatIDR(hppAnalysis.totalHPP)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Akumulasi biaya bahan baku per porsi
                        </p>
                      </div>

                      {/* Harga Jual */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Harga Jual Menu
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatIDR(hppAnalysis.sellPrice)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Harga di kasir POS
                        </p>
                      </div>

                      {/* Margin Kotor */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Laba Kotor (Gross Margin)
                        </p>
                        <p
                          className={`text-2xl font-bold ${
                            hppAnalysis.grossMargin >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {formatIDR(hppAnalysis.grossMargin)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {hppAnalysis.sellPrice > 0
                            ? `${hppAnalysis.marginPercentage.toFixed(1)}% dari harga jual`
                            : "Harga jual belum diset"}
                        </p>
                      </div>
                    </div>

                    {/* Serving Capacity Banner (Batch Bottleneck) */}
                    {recipeItems.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground">
                              Estimasi Kapasitas Persediaan:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              Dapat memproduksi sekitar{" "}
                              <strong className="text-foreground">
                                {hppAnalysis.servingCapacity} porsi
                              </strong>
                              {hppAnalysis.limitingMaterial && (
                                <> (terbatasi oleh {hppAnalysis.limitingMaterial}: sisa {hppAnalysis.limitingStock} {hppAnalysis.limitingUnit})</>
                              )}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[11px] shrink-0 self-start sm:self-center ${
                            hppAnalysis.servingCapacity === 0
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : hppAnalysis.servingCapacity <= 10
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {hppAnalysis.servingCapacity === 0
                            ? "Bahan Baku Habis"
                            : hppAnalysis.servingCapacity <= 10
                            ? "Kapasitas Rendah"
                            : "Kapasitas Aman"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Recipe Ingredients List */}
                <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">
                        Komposisi Bahan Baku ({recipeItems.length})
                      </h4>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Kuantitas per 1 porsi menu
                    </span>
                  </div>

                  {isLoadingRecipe ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Spinner size="md" />
                      <span className="text-xs">Memuat komposisi resep...</span>
                    </div>
                  ) : recipeItems.length === 0 ? (
                    <div className="p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                        <ChefHat className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">
                        Resep Belum Dibuat
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Produk ini belum memiliki bahan baku. Saat penjualan terjadi di POS, sistem akan memotong stok fisik produk jadi itu sendiri.
                      </p>
                      <Button
                        variant="outline"
                        size="default"
                        className="min-h-[44px] text-xs font-semibold"
                        onClick={() => {
                          setError("");
                          setIsAddModalOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Tambah Bahan Pertama
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-muted/30 text-muted-foreground border-b border-border text-xs uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-5 py-3">Bahan Baku</th>
                              <th className="px-5 py-3 text-right">Kebutuhan / Porsi</th>
                              <th className="px-5 py-3 text-right">Harga Pokok Modal</th>
                              <th className="px-5 py-3 text-right">Subtotal Biaya</th>
                              <th className="px-5 py-3 text-right">Kontribusi HPP</th>
                              <th className="px-5 py-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {hppAnalysis?.itemsWithCost.map((item) => {
                              const contributionPercent =
                                hppAnalysis.totalHPP > 0
                                  ? (item.subtotalCost / hppAnalysis.totalHPP) * 100
                                  : 0;

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-muted/20 transition-colors"
                                >
                                  <td className="px-5 py-3.5">
                                    <div className="font-semibold text-foreground">
                                      {item.material?.name || "Bahan Baku"}
                                    </div>
                                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                                      {item.material?.sku} • Sisa stok:{" "}
                                      {item.material?.current_stock}{" "}
                                      {item.material?.unit}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-right font-medium text-foreground">
                                    <span className="text-base font-bold">
                                      {item.quantity}
                                    </span>{" "}
                                    <span className="text-xs text-muted-foreground">
                                      {item.material?.unit}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-right text-xs text-muted-foreground">
                                    {formatIDR(item.costPerUnit)} / {item.material?.unit}
                                  </td>
                                  <td className="px-5 py-3.5 text-right font-bold text-foreground">
                                    {formatIDR(item.subtotalCost)}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                      {contributionPercent.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="min-h-[36px] text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 p-2"
                                      onClick={() => setItemToDelete(item)}
                                      title="Hapus bahan dari formulasi resep"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-muted/20 border-t border-border font-bold">
                            <tr>
                              <td className="px-5 py-3 text-foreground" colSpan={3}>
                                Total Biaya HPP per Porsi:
                              </td>
                              <td className="px-5 py-3 text-right text-primary text-base">
                                {formatIDR(hppAnalysis?.totalHPP || 0)}
                              </td>
                              <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                                100%
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="block sm:hidden divide-y divide-border">
                        {hppAnalysis?.itemsWithCost.map((item) => {
                          const contributionPercent =
                            hppAnalysis.totalHPP > 0
                              ? (item.subtotalCost / hppAnalysis.totalHPP) * 100
                              : 0;

                          return (
                            <div key={item.id} className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h5 className="font-semibold text-foreground text-sm">
                                    {item.material?.name || "Bahan Baku"}
                                  </h5>
                                  <p className="font-mono text-[11px] text-muted-foreground">
                                    {item.material?.sku} • Sisa stok: {item.material?.current_stock} {item.material?.unit}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-rose-600 p-2"
                                  onClick={() => setItemToDelete(item)}
                                  title="Hapus bahan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border">
                                <div>
                                  <span className="text-muted-foreground">Takaran Porsi:</span>
                                  <p className="font-bold text-foreground">
                                    {item.quantity} {item.material?.unit}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Biaya Bahan:</span>
                                  <p className="font-bold text-primary">
                                    {formatIDR(item.subtotalCost)} ({contributionPercent.toFixed(1)}%)
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div className="p-4 bg-muted/30 flex justify-between items-center text-sm font-bold">
                          <span>Total HPP Resep:</span>
                          <span className="text-primary text-base">
                            {formatIDR(hppAnalysis?.totalHPP || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Tambah Bahan ke Resep */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Bahan ke Formulasi Resep"
        description={
          selectedProduct
            ? `Tentukan takaran bahan baku per 1 porsi untuk menu ${selectedProduct.name}.`
            : undefined
        }
        maxWidth="md"
      >
        <form onSubmit={handleAddRecipeItem} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Pilih Bahan Baku
            </label>
            <select
              value={selectedRawMaterialId}
              onChange={(e) => setSelectedRawMaterialId(e.target.value)}
              className="w-full text-sm rounded-lg border border-input bg-background text-foreground px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              required
            >
              <option value="">Pilih bahan baku...</option>
              {rawMaterials.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} (Stok: {rm.current_stock} {rm.unit} • {formatIDR(rm.cost_per_unit)}/{rm.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Selected material details banner */}
          {selectedRawMaterialId && (
            (() => {
              const selectedRm = rawMaterials.find(
                (rm) => rm.id === Number(selectedRawMaterialId)
              );
              if (!selectedRm) return null;
              return (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Satuan unit:</span>
                    <span className="font-semibold text-foreground">
                      {selectedRm.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga modal satuan:</span>
                    <span className="font-semibold text-primary">
                      {formatIDR(selectedRm.cost_per_unit)} / {selectedRm.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stok gudang saat ini:</span>
                    <span className="font-semibold text-foreground">
                      {selectedRm.current_stock} {selectedRm.unit}
                    </span>
                  </div>
                </div>
              );
            })()
          )}

          <div>
            <Input
              label={`Kuantitas Takaran per Porsi (${
                rawMaterials.find((rm) => rm.id === Number(selectedRawMaterialId))?.unit || "satuan"
              })`}
              type="number"
              step="any"
              min="0.001"
              placeholder="Contoh: 15.5 atau 0.25"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              autoFocus
              helperText="Jumlah bahan yang terpakai dalam pembuatan 1 porsi menu ini."
            />
          </div>

          {/* Subtotal preview inside modal */}
          {selectedRawMaterialId && quantity !== "" && Number(quantity) > 0 && (
            (() => {
              const selectedRm = rawMaterials.find(
                (rm) => rm.id === Number(selectedRawMaterialId)
              );
              if (!selectedRm) return null;
              const subtotal = selectedRm.cost_per_unit * Number(quantity);
              return (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Estimasi Biaya Bahan per Porsi:
                  </span>
                  <span className="font-bold text-primary text-sm">
                    {formatIDR(subtotal)}
                  </span>
                </div>
              );
            })()
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
              Tambahkan ke Resep
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Konfirmasi Hapus Bahan dari Resep (NO native confirm!) */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Hapus Bahan dari Resep"
        description="Apakah Anda yakin ingin mengeluarkan bahan ini dari formulasi resep?"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {itemToDelete && (
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1.5">
              <p className="font-bold text-foreground text-sm">
                {getMaterialForItem(itemToDelete)?.name || "Bahan Baku"}
              </p>
              <p className="text-muted-foreground">
                Takaran: {itemToDelete.quantity} {getMaterialForItem(itemToDelete)?.unit}
              </p>
              <p className="text-muted-foreground">
                Menu: {selectedProduct?.name}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Tindakan ini hanya akan menghapus bahan dari resep menu ini, stok fisik bahan baku tidak akan berubah.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] px-4 text-xs font-semibold"
              onClick={() => setItemToDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px] px-5 text-xs font-semibold"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Ya, Hapus Bahan
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
