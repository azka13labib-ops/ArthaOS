"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  PackageOpen,
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
  const [isLoading, setIsLoading] = useState(true);

  // Selected Product State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  // Add Recipe Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    }
  }, [activeStore, loadInitialData]);

  const loadRecipe = async (product: Product) => {
    if (!activeStore) return;
    setSelectedProduct(product);
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
      setError("Pilih bahan baku terlebih dahulu");
      return;
    }

    const qtyNumber = Number(quantity);
    if (!qtyNumber || qtyNumber <= 0) {
      setError("Masukkan kuantitas yang valid");
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
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan bahan ke resep"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecipeItem = async (itemId: number) => {
    if (!activeStore || !selectedProduct) return;
    if (!confirm("Hapus bahan ini dari resep?")) return;

    try {
      await api.recipes.deleteItem(activeStore.id, itemId);
      await loadRecipe(selectedProduct);
    } catch (err) {
      alert("Gagal menghapus bahan dari resep");
      console.error(err);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-screen-2xl mx-auto w-full flex flex-col h-[calc(100vh-4rem)]">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground mb-1">
              Resep Produk (BOM)
            </h1>
            <p className="text-sm text-muted-foreground">
              Atur komposisi bahan baku untuk memotong stok otomatis saat penjualan terjadi.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Left Panel: Products List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="relative w-full group">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background text-foreground border border-border rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Tidak ada produk ditemukan.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => loadRecipe(p)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors ${
                          selectedProduct?.id === p.id ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className={`text-sm font-medium truncate ${selectedProduct?.id === p.id ? "text-primary" : "text-foreground"}`}>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {p.sku}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 ${selectedProduct?.id === p.id ? "text-primary" : "text-muted-foreground"}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Panel: Recipe Detail */}
          <div className="w-full lg:w-2/3 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden flex-1 min-h-0">
            {!selectedProduct ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState
                  icon={<PackageOpen className="w-12 h-12 text-muted-foreground/30" />}
                  title="Pilih Produk"
                  description="Silakan pilih produk dari daftar di samping kiri untuk mengelola resepnya."
                />
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-muted/10">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">{selectedProduct.name}</h2>
                    <p className="text-sm text-muted-foreground font-mono">SKU: {selectedProduct.sku}</p>
                  </div>
                  <Button
                    onClick={() => {
                      setError("");
                      setIsAddModalOpen(true);
                    }}
                    className="shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Bahan
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                  {isLoadingRecipe ? (
                    <div className="p-12 flex justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : recipeItems.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChefHat className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">Resep Kosong</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                        Produk ini belum memiliki bahan baku. Penjualan produk ini hanya akan memotong stok fisik produk itu sendiri (jika ada).
                      </p>
                      <Button onClick={() => setIsAddModalOpen(true)} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Resep Pertama
                      </Button>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="text-muted-foreground border-b border-border bg-muted/30">
                        <tr>
                          <th className="px-6 py-4 font-medium">Bahan Baku</th>
                          <th className="px-6 py-4 font-medium text-right">Kuantitas per Porsi</th>
                          <th className="px-6 py-4 font-medium text-right">Biaya Pokok (Est)</th>
                          <th className="px-6 py-4 font-medium text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recipeItems.map((item) => {
                          const cost = item.raw_material 
                            ? item.raw_material.cost_per_unit * item.quantity 
                            : 0;
                            
                          return (
                            <tr key={item.id} className="hover:bg-card transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-medium text-foreground block">{item.raw_material?.name}</span>
                                <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.raw_material?.sku}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-semibold">{item.quantity}</span>{" "}
                                <span className="text-muted-foreground">{item.raw_material?.unit}</span>
                              </td>
                              <td className="px-6 py-4 text-right text-muted-foreground">
                                {formatIDR(cost)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecipeItem(item.id)}
                                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                  title="Hapus bahan dari resep"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/10 font-medium">
                          <td className="px-6 py-4 text-right" colSpan={2}>Estimasi Total HPP:</td>
                          <td className="px-6 py-4 text-right text-primary">
                            {formatIDR(
                              recipeItems.reduce((sum, item) => 
                                sum + ((item.raw_material?.cost_per_unit || 0) * item.quantity), 0
                              )
                            )}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Recipe Item */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Bahan Baku ke Resep"
        description={`Pilih bahan baku untuk menyusun resep ${selectedProduct?.name}.`}
        maxWidth="md"
      >
        <form onSubmit={handleAddRecipeItem} className="space-y-5 pt-2">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Pilih Bahan Baku</label>
            <select
              value={selectedRawMaterialId}
              onChange={(e) => setSelectedRawMaterialId(e.target.value)}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">-- Pilih Bahan Baku --</option>
              {rawMaterials.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} (Stok: {rm.current_stock} {rm.unit})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Kuantitas per Produk"
            type="number"
            step="0.01"
            placeholder="Contoh: 15.5"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            autoFocus
          />
          {selectedRawMaterialId && (
            <p className="text-xs text-muted-foreground mt-1">
              Satuan: {rawMaterials.find(rm => rm.id === Number(selectedRawMaterialId))?.unit || "-"}
            </p>
          )}

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
              Tambah
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
