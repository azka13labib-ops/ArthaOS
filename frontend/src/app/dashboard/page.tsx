"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Package,
  BookOpen,
  ShoppingCart,
  Receipt,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Store as StoreIcon,
  RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import { Transaction, Product, ProfitLossReport, StockValuationReport, Debt } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore, isLoadingStores } = useStore();

  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [stockValuation, setStockValuation] = useState<StockValuationReport | null>(null);
  const [recentSales, setRecentSales] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadDashboardData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoadingData(true);
    setError("");

    try {
      const [plData, stockData, salesData, prodData, debtsData] = await Promise.all([
        api.reports.profitLoss(activeStore.id).catch(() => null),
        api.reports.stockValuation(activeStore.id).catch(() => null),
        api.sales.list(activeStore.id).catch(() => []),
        api.products.list(activeStore.id).catch(() => []),
        api.debts.list(activeStore.id).catch(() => []),
      ]);

      setProfitLoss(plData);
      setStockValuation(stockData);
      setRecentSales(Array.isArray(salesData) ? salesData.slice(0, 8) : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setDebts(Array.isArray(debtsData) ? debtsData : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data dashboard");
    } finally {
      setIsLoadingData(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadDashboardData();
    }
  }, [activeStore, loadDashboardData]);

  if (authLoading || isLoadingStores) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" label="Menyiapkan data toko..." />
      </div>
    );
  }

  if (!activeStore) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <EmptyState
            icon={<StoreIcon className="w-8 h-8 text-emerald-600" />}
            title="Belum Ada Toko Terpilih"
            description="Silakan pilih toko yang sudah ada atau buat toko baru dari menu kiri untuk mulai mengelola bisnis Anda."
          />
        </div>
      </AppLayout>
    );
  }

  // Calculate low stock products (≤ 5 units)
  const lowStockProducts = products.filter((p) => p.current_stock <= 5);
  // Calculate total unpaid debt
  const totalUnpaidDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Ringkasan Bisnis
              </h2>
              <Badge variant="success" size="sm">
                Aktif
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Outlet: <span className="font-semibold text-slate-700">{activeStore.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={isLoadingData}
              title="Perbarui data"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingData ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Link href="/pos">
              <Button variant="primary" size="sm">
                <ShoppingCart className="w-4 h-4 mr-1.5" /> Buka Kasir POS
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadDashboardData}>
              Coba Lagi
            </Button>
          </div>
        )}

        {/* 4 Core Financial KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Penjualan Kotor */}
          <Card className="hover:border-slate-300 transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Omzet Penjualan
                </p>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatIDR(profitLoss?.gross_sales ?? 0)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="text-emerald-600 font-medium">HPP: {formatIDR(profitLoss?.cogs ?? 0)}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Laba Bersih */}
          <Card className="hover:border-slate-300 transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Laba Bersih (Net Profit)
                </p>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3
                  className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                    (profitLoss?.net_profit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatIDR(profitLoss?.net_profit ?? 0)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Setelah beban: {formatIDR(profitLoss?.expenses ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Nilai Valuasi Stok */}
          <Card className="hover:border-slate-300 transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Valuasi Aset Stok
                </p>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatIDR(stockValuation?.total_asset_retail ?? 0)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {products.length} SKU katalog terdaftar
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Sisa Kasbon / Piutang */}
          <Card className="hover:border-slate-300 transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Piutang Kasbon Belum Lunas
                </p>
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatIDR(totalUnpaidDebt)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {debts.filter((d) => d.status !== "paid").length} tagihan aktif
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/pos">
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Transaksi Kasir</p>
                <p className="text-[11px] text-slate-500">Scan & Checkout</p>
              </div>
            </div>
          </Link>

          <Link href="/inventory">
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Kelola Stok</p>
                <p className="text-[11px] text-slate-500">Restock & Opname</p>
              </div>
            </div>
          </Link>

          <Link href="/expenses">
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Catat Biaya</p>
                <p className="text-[11px] text-slate-500">Pengeluaran Toko</p>
              </div>
            </div>
          </Link>

          <Link href="/debts">
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Buku Kasbon</p>
                <p className="text-[11px] text-slate-500">Bayar & Tagih</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 2 Column Layout: Recent Sales & Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Transactions */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Riwayat Transaksi Terkini</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transaksi penjualan yang tercatat secara real-time
                  </p>
                </div>
                <Link href="/pos">
                  <Button variant="outline" size="sm">
                    Buat Penjualan <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingData ? (
                  <div className="p-8">
                    <Spinner size="md" label="Memuat riwayat..." />
                  </div>
                ) : recentSales.length === 0 ? (
                  <EmptyState
                    title="Belum Ada Transaksi"
                    description="Belum ada transaksi penjualan yang dicatat untuk outlet ini."
                    actionLabel="Buka Kasir Sekarang"
                    onAction={() => router.push("/pos")}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">ID / Waktu</th>
                          <th className="px-4 py-3">Jumlah Item</th>
                          <th className="px-4 py-3">Metode Bayar</th>
                          <th className="px-4 py-3 text-right">Total Transaksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentSales.map((trx) => {
                          const paymentMethod = trx.payments?.[0]?.payment_method || "cash";
                          const itemCount = trx.items?.reduce((acc, it) => acc + it.quantity, 0) ?? 0;

                          return (
                            <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                <div className="font-semibold">TRX-{trx.id.toString().padStart(5, "0")}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {formatDate(trx.occurred_at)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {itemCount} pcs
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    paymentMethod === "debt"
                                      ? "warning"
                                      : paymentMethod === "cash"
                                      ? "success"
                                      : "info"
                                  }
                                  size="sm"
                                >
                                  {paymentMethod === "debt"
                                    ? "Kasbon / Piutang"
                                    : paymentMethod.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {formatIDR(trx.total_amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right 1 Col: Low Stock Alerts */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <CardTitle>Peringatan Stok</CardTitle>
                  </div>
                  <Badge variant={lowStockProducts.length > 0 ? "warning" : "success"} size="sm">
                    {lowStockProducts.length} Produk
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Produk dengan stok tersisa 5 atau kurang
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {lowStockProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Semua stok produk saat ini dalam batas aman.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {lowStockProducts.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="truncate mr-2">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            SKU: {p.sku} | Harga: {formatIDR(p.sell_price)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              p.current_stock === 0
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.current_stock} pcs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                  <Link href="/inventory">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Buka Manajemen Stok & Restock
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
