"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Package,
  BookOpen,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  Store as StoreIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import { Transaction, Product, ProfitLossReport, StockValuationReport, Debt } from "@/lib/types";
import type { Variants } from "framer-motion";

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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

  const loadDashboardData = useCallback(async (storeId: number) => {
    setIsLoadingData(true);
    setError("");

    try {
      const [plData, stockData, salesData, prodData, debtsData] = await Promise.all([
        api.reports.profitLoss(storeId).catch(() => null),
        api.reports.stockValuation(storeId).catch(() => null),
        api.sales.list(storeId).catch(() => []),
        api.products.list(storeId).catch(() => []),
        api.debts.list(storeId).catch(() => []),
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
  }, []);

  useEffect(() => {
    let mounted = true;
    if (activeStore) {
      loadDashboardData(activeStore.id).then(() => {
        if (!mounted) return;
      });
    }
    return () => {
      mounted = false;
    };
  }, [activeStore, loadDashboardData]);

  if (authLoading || isLoadingStores) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <Spinner size="lg" label="Menyiapkan ruang kerja..." />
      </div>
    );
  }

  if (!activeStore) {
    return (
      <AppLayout>
        <div className="p-8 max-w-3xl mx-auto mt-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center backdrop-blur-sm">
            <StoreIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Belum Ada Toko Terpilih</h2>
            <p className="text-slate-400">Silakan pilih toko dari sidebar kiri atau buat toko baru untuk mulai mengelola bisnis Anda.</p>
          </div>
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
      <motion.div 
        className="space-y-8 max-w-[1400px] mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10 relative">
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-4xl font-light tracking-tight text-white mb-2 flex items-center gap-3">
              Ringkasan Hari Ini
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </h1>
            <p className="text-sm text-slate-400">
              Performa berjalan untuk <strong className="text-white font-medium">{activeStore.name}</strong>
            </p>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={loadDashboardData}
              disabled={isLoadingData}
              className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
              Segarkan Data
            </button>
            <Link href="/pos">
              <button className="flex items-center justify-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white text-sm font-medium transition-all shadow-glow hover:scale-105 active:scale-95">
                Buka Kasir &rarr;
              </button>
            </Link>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm flex items-center justify-between rounded-xl backdrop-blur-sm">
            <span>{error}</span>
            <button className="px-3 py-1.5 hover:bg-rose-500/20 rounded-lg transition-colors" onClick={loadDashboardData}>Muat Ulang</button>
          </motion.div>
        )}

        {/* Top Level KPIs - Glassmorphism Style */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/20 transition-colors" />
            <p className="text-sm font-medium text-slate-400 mb-6">Omzet Kotor</p>
            <div>
              <h3 className="text-3xl font-light text-white tracking-tight">
                {formatIDR(profitLoss?.gross_sales ?? 0)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">HPP: {formatIDR(profitLoss?.cogs ?? 0)}</p>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-colors" />
            <p className="text-sm font-medium text-slate-400 mb-6 flex items-center gap-2">
              Laba Bersih <TrendingUp className="w-4 h-4 text-emerald-400" />
            </p>
            <div>
              <h3 className="text-3xl font-light text-emerald-400 tracking-tight">
                {formatIDR(profitLoss?.net_profit ?? 0)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Beban: {formatIDR(profitLoss?.expenses ?? 0)}</p>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
             <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-colors" />
            <p className="text-sm font-medium text-slate-400 mb-6">Valuasi Stok</p>
            <div>
              <h3 className="text-3xl font-light text-white tracking-tight">
                {formatIDR(stockValuation?.total_asset_retail ?? 0)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">{products.length} SKU terdaftar</p>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
             <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] group-hover:bg-rose-500/20 transition-colors" />
            <p className="text-sm font-medium text-slate-400 mb-6">Kasbon Tertunda</p>
            <div>
              <h3 className="text-3xl font-light text-rose-400 tracking-tight">
                {formatIDR(totalUnpaidDebt)}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                {debts.filter((d) => d.status !== "paid").length} tagihan aktif
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/pos", label: "Kasir Baru", desc: "Scan & Checkout", icon: ShoppingCart },
            { href: "/inventory", label: "Kelola Stok", desc: "Mutasi & Opname", icon: Package },
            { href: "/expenses", label: "Catat Beban", desc: "Pengeluaran harian", icon: Receipt },
            { href: "/debts", label: "Tagih Kasbon", desc: "Kirim via WhatsApp", icon: BookOpen }
          ].map((item, idx) => (
            <Link key={idx} href={item.href} className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-primary/50 transition-all backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <item.icon className="w-6 h-6 text-slate-400 group-hover:text-primary mb-4 transition-colors relative z-10" />
              <div className="font-medium text-white text-base mb-1 relative z-10">{item.label}</div>
              <div className="text-xs text-slate-400 relative z-10">{item.desc}</div>
            </Link>
          ))}
        </motion.div>

        {/* Data Sections */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Recent Transactions */}
          <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <h3 className="text-lg font-medium text-white">Transaksi Terkini</h3>
              <Link href="/pos" className="text-sm font-medium text-primary hover:text-primary-light flex items-center transition-colors">
                Lihat Semua <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            <div className="flex-1 p-6">
              {isLoadingData ? (
                <div className="py-10 flex justify-center"><Spinner size="md" /></div>
              ) : recentSales.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 border border-dashed border-white/10 rounded-xl">
                  Belum ada transaksi hari ini.
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400">
                        <th className="pb-3 font-medium">ID / Waktu</th>
                        <th className="pb-3 font-medium">Metode</th>
                        <th className="pb-3 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentSales.map((trx) => {
                        const method = trx.payments?.[0]?.payment_method || "cash";
                        return (
                          <tr key={trx.id} className="hover:bg-white/5 transition-colors group">
                            <td className="py-4">
                              <div className="font-medium text-white group-hover:text-primary transition-colors">TRX-{trx.id.toString().padStart(5, "0")}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{formatDate(trx.occurred_at)}</div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                method === "cash" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                method === "debt" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                "bg-white/10 text-slate-300 border border-white/10"
                              }`}>
                                {method === "debt" ? "Kasbon" : method}
                              </span>
                            </td>
                            <td className="py-4 text-right font-medium text-white">
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
          </div>

          {/* Low Stock Alerts */}
          <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <h3 className="text-lg font-medium text-white">Peringatan Stok</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lowStockProducts.length > 0 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                {lowStockProducts.length} Item
              </span>
            </div>

            <div className="flex-1 p-6">
              {lowStockProducts.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 border border-dashed border-white/10 rounded-xl">
                  Stok aman. Tidak ada peringatan.
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.slice(0, 6).map((p) => (
                    <div key={p.id} className="p-4 rounded-xl flex justify-between items-center bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-colors">
                      <div className="pr-4 truncate">
                        <div className="text-sm font-medium text-white truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.sku}</div>
                      </div>
                      <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${p.current_stock === 0 ? "text-rose-300 bg-rose-500/20 border border-rose-500/30" : "text-amber-300 bg-amber-500/20 border border-amber-500/30"}`}>
                        {p.current_stock}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
