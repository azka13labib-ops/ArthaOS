"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  Printer,
  RefreshCw,
  ArrowRight,
  PieChart,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/utils";
import { ProfitLossReport, StockValuationReport } from "@/lib/types";

export default function ReportsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [stockValuation, setStockValuation] = useState<StockValuationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Date Filters
  const todayStr = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadReports = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);

    try {
      const [plData, stockData] = await Promise.all([
        api.reports.profitLoss(activeStore.id, startDate, endDate),
        api.reports.stockValuation(activeStore.id),
      ]);
      setProfitLoss(plData);
      setStockValuation(stockData);
    } catch {
      setProfitLoss(null);
      setStockValuation(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore, startDate, endDate]);

  useEffect(() => {
    let mounted = true;
    if (activeStore) {
      loadReports().then(() => {
        if (!mounted) return;
      });
    }
    return () => {
      mounted = false;
    };
  }, [activeStore, loadReports]);

  const handlePrint = () => {
    window.print();
  };

  const grossSales = profitLoss?.gross_sales ?? 0;
  const cogs = profitLoss?.cogs ?? 0;
  const grossProfit = profitLoss?.gross_profit ?? 0;
  const expenses = profitLoss?.expenses ?? 0;
  const netProfit = profitLoss?.net_profit ?? 0;

  const grossMarginPercent =
    grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0;
  const netMarginPercent =
    grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white mb-1">
              Laporan Keuangan
            </h1>
            <p className="text-sm text-slate-400">
              Laporan Laba Rugi real-time berdasarkan transaksi kasir dan mutasi inventori.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-none border-white/10 hover:bg-white/5 h-10 px-4"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" /> Cetak
            </Button>
            <Button
              variant="outline"
              className="rounded-none border-white/10 hover:bg-white/5 h-10 px-4"
              onClick={loadReports}
              disabled={isLoading}
              title="Perbarui laporan"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white border border-white/10 p-1 flex flex-col sm:flex-row items-center justify-between gap-0">
          <div className="flex items-center gap-3 px-4 py-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Periode:</span>
          </div>

          <div className="flex flex-wrap items-center gap-0 w-full sm:w-auto">
            <div className="flex items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-3 border-l border-white/10 text-sm bg-white/5 backdrop-blur-xl border-white/10 text-white focus-visible:outline-none focus-visible:bg-white/5 transition-colors"
              />
              <div className="px-4 py-3 border-l border-white/10 bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                S/D
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-3 border-l border-r border-white/10 text-sm bg-white/5 backdrop-blur-xl border-white/10 text-white focus-visible:outline-none focus-visible:bg-white/5 transition-colors"
              />
            </div>
            <Button 
              variant="primary" 
              className="rounded-none h-11 px-8 bg-white/10 hover:bg-white/20 text-white hover:bg-slate-800"
              onClick={loadReports}
            >
              Terapkan
            </Button>
          </div>
        </div>

        {/* 2 Main Sections: Income Statement & Stock Valuation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
          {/* Left 2 Cols: Income Statement (Laba Rugi) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white">
              <div className="bg-white/10 hover:bg-white/20 px-6 py-5 border-b border-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white tracking-tight">
                    Laba Rugi (Income Statement)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    OUTLET: {activeStore?.name}
                  </p>
                </div>
                <div className="px-3 py-1 bg-white/10 text-white text-xs font-bold tracking-wider rounded-none">
                  MARGIN: {netMarginPercent}%
                </div>
              </div>

              <div className="p-6 md:p-8">
                {isLoading ? (
                  <div className="py-12 flex justify-center">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="space-y-0 text-sm">
                    {/* Item 1: Pendapatan Penjualan */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-slate-100 group hover:bg-white/5 transition-colors">
                      <div className="px-2">
                        <p className="font-semibold text-white">
                          1. Total Penjualan Kotor (Gross Sales)
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Akumulasi penerimaan kas, transfer, dan piutang penjualan
                        </p>
                      </div>
                      <span className="font-semibold text-white text-lg px-2 mt-2 sm:mt-0">
                        {formatIDR(grossSales)}
                      </span>
                    </div>

                    {/* Item 2: HPP */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-slate-100 group hover:bg-white/5 transition-colors">
                      <div className="px-2">
                        <p className="font-semibold text-white">
                          2. Harga Pokok Penjualan (HPP / COGS)
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Harga modal beli barang yang terjual
                        </p>
                      </div>
                      <span className="font-semibold text-rose-400 text-lg px-2 mt-2 sm:mt-0">
                        -{formatIDR(cogs)}
                      </span>
                    </div>

                    {/* Item 3: Laba Kotor */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 bg-white/5 border-b border-white/10 px-4 mt-2">
                      <div>
                        <p className="font-semibold text-white">
                          3. Laba Kotor (Gross Profit)
                        </p>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                          Margin Kotor: {grossMarginPercent}%
                        </p>
                      </div>
                      <span className="font-medium text-white text-2xl mt-2 sm:mt-0 tracking-tight">
                        {formatIDR(grossProfit)}
                      </span>
                    </div>

                    {/* Item 4: Biaya Operasional */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-slate-100 group hover:bg-white/5 transition-colors mt-2">
                      <div className="px-2">
                        <p className="font-semibold text-white">
                          4. Beban Operasional (Expenses)
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Listrik, gaji, sewa, dan pengeluaran harian
                        </p>
                      </div>
                      <span className="font-semibold text-rose-400 text-lg px-2 mt-2 sm:mt-0">
                        -{formatIDR(expenses)}
                      </span>
                    </div>

                    {/* Final Net Profit */}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 mt-6 border ${
                        netProfit >= 0
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-rose-500/10 border-rose-500/20"
                      }`}
                    >
                      <div>
                        <p className={`font-semibold text-sm uppercase tracking-widest ${netProfit >= 0 ? "text-emerald-950" : "text-rose-950"}`}>
                          Laba Bersih (Net Profit)
                        </p>
                        <p className={`text-xs mt-1 ${netProfit >= 0 ? "text-emerald-400/80" : "text-rose-700/80"}`}>
                          Setelah dikurangi HPP & seluruh biaya operasional
                        </p>
                      </div>
                      <span
                        className={`text-3xl font-medium tracking-tight mt-3 sm:mt-0 ${
                          netProfit >= 0 ? "text-emerald-400" : "text-rose-700"
                        }`}
                      >
                        {formatIDR(netProfit)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Stock Valuation Asset Report */}
          <div className="space-y-6">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white">
              <div className="px-6 py-5 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-white" />
                  <h3 className="text-lg font-medium text-white tracking-tight">Valuasi Aset Stok</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Audit nilai inventori fisik saat ini
                </p>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="py-12 flex justify-center">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-5 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white hover:border-white/20 transition-colors group">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mb-2">
                        Total Fisik Produk
                      </p>
                      <p className="text-2xl font-medium text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                        {stockValuation?.total_inventory_items ?? 0} <span className="text-sm text-slate-400 font-normal lowercase tracking-normal">Unit</span>
                      </p>
                    </div>

                    <div className="p-5 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white hover:border-white/20 transition-colors group">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mb-2">
                        Nilai Aset (Harga Beli/HPP)
                      </p>
                      <p className="text-2xl font-medium text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                        {formatIDR(stockValuation?.total_asset_cost ?? 0)}
                      </p>
                    </div>

                    <div className="p-5 border border-white/10 bg-white/10 hover:bg-white/20 text-white">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mb-2">
                        Nilai Aset (Harga Jual)
                      </p>
                      <p className="text-2xl font-medium text-white tracking-tight">
                        {formatIDR(stockValuation?.total_asset_retail ?? 0)}
                      </p>
                    </div>

                    <div className="p-5 border border-white/10 bg-emerald-50">
                      <p className="text-emerald-300 font-semibold uppercase tracking-wider text-[11px] mb-2">
                        Proyeksi Potensi Laba Kotor
                      </p>
                      <p className="text-2xl font-medium text-emerald-400 tracking-tight">
                        {formatIDR(stockValuation?.potential_gross_profit ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
