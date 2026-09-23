"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  BookOpen,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  Store as StoreIcon,
  RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" label="Menyiapkan ruang kerja..." />
      </div>
    );
  }

  if (!activeStore) {
    return (
      <AppLayout>
        <div className="p-8 max-w-3xl mx-auto mt-12">
          <EmptyState
            icon={<StoreIcon className="w-8 h-8 text-slate-400" />}
            title="Belum Ada Toko Terpilih"
            description="Silakan pilih toko dari sidebar kiri atau buat toko baru untuk mulai mengelola bisnis Anda."
          />
        </div>
      </AppLayout>
    );
  }

  const lowStockProducts = products.filter((p) => p.current_stock <= 5);
  const totalUnpaidDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-950 mb-1">
              Ringkasan Hari Ini
            </h1>
            <p className="text-sm text-slate-500">
              Performa berjalan untuk <strong className="text-slate-950 font-semibold">{activeStore.name}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadDashboardData}
              disabled={isLoadingData}
              className="rounded-none border-slate-200 hover:bg-slate-50 h-10 px-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
              Segarkan Data
            </Button>
            <Link href="/pos">
              <Button className="rounded-none bg-slate-950 hover:bg-slate-800 text-white h-10 px-6">
                Buka Kasir &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between rounded-sm">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadDashboardData}>Muat Ulang</Button>
          </div>
        )}

        {/* Top Level KPIs - Editorial Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200">
          {/* KPI 1 */}
          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6">Omzet Kotor</p>
            <div>
              <h3 className="text-3xl font-medium text-slate-950 tracking-tight">
                {formatIDR(profitLoss?.gross_sales ?? 0)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">HPP: {formatIDR(profitLoss?.cogs ?? 0)}</p>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6 flex items-center gap-2">
              Laba Bersih <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </p>
            <div>
              <h3 className="text-3xl font-medium text-emerald-700 tracking-tight">
                {formatIDR(profitLoss?.net_profit ?? 0)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Beban: {formatIDR(profitLoss?.expenses ?? 0)}</p>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6">Valuasi Stok</p>
            <div>
              <h3 className="text-3xl font-medium text-slate-950 tracking-tight">
                {formatIDR(stockValuation?.total_asset_retail ?? 0)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">{products.length} SKU terdaftar</p>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-white p-6 md:p-8 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <p className="text-[13px] font-medium text-slate-500 mb-6">Kasbon Tertunda</p>
            <div>
              <h3 className="text-3xl font-medium text-rose-700 tracking-tight">
                {formatIDR(totalUnpaidDebt)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                {debts.filter((d) => d.status !== "paid").length} tagihan aktif
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/pos", label: "Kasir Baru", desc: "Scan & Checkout", icon: ShoppingCart },
            { href: "/inventory", label: "Kelola Stok", desc: "Mutasi & Opname", icon: Package },
            { href: "/expenses", label: "Catat Beban", desc: "Pengeluaran harian", icon: Receipt },
            { href: "/debts", label: "Tagih Kasbon", desc: "Kirim via WhatsApp", icon: BookOpen }
          ].map((item, idx) => (
            <Link key={idx} href={item.href} className="group border border-slate-200 p-5 hover:border-emerald-700 transition-colors bg-white">
              <item.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 mb-4 transition-colors" />
              <div className="font-semibold text-slate-950 text-sm mb-1">{item.label}</div>
              <div className="text-xs text-slate-500">{item.desc}</div>
            </Link>
          ))}
        </div>

        {/* Data Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Recent Transactions */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-lg font-medium text-slate-950">Transaksi Terkini</h3>
              <Link href="/pos" className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center">
                Lihat Semua <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>
            
            {isLoadingData ? (
              <div className="py-10"><Spinner size="md" /></div>
            ) : recentSales.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200">
                Belum ada transaksi hari ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-3 font-medium">ID / Waktu</th>
                      <th className="py-3 font-medium">Metode</th>
                      <th className="py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSales.map((trx) => {
                      const method = trx.payments?.[0]?.payment_method || "cash";
                      return (
                        <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-slate-950">TRX-{trx.id.toString().padStart(5, "0")}</div>
                            <div className="text-xs text-slate-500">{formatDate(trx.occurred_at)}</div>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                              method === "cash" ? "bg-emerald-50 text-emerald-700" :
                              method === "debt" ? "bg-rose-50 text-rose-700" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {method === "debt" ? "Kasbon" : method}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium text-slate-950">
                            {formatIDR(trx.total_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-lg font-medium text-slate-950">Peringatan Stok</h3>
              <span className={`text-xs font-bold px-2 py-0.5 ${lowStockProducts.length > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                {lowStockProducts.length} Item
              </span>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 bg-slate-50">
                Stok aman. Tidak ada peringatan.
              </div>
            ) : (
              <div className="border border-slate-200 divide-y divide-slate-100">
                {lowStockProducts.slice(0, 6).map((p) => (
                  <div key={p.id} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50">
                    <div className="pr-4 truncate">
                      <div className="text-sm font-medium text-slate-950 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.sku}</div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 ${p.current_stock === 0 ? "text-rose-700 bg-rose-50" : "text-amber-700 bg-amber-50"}`}>
                      {p.current_stock}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
