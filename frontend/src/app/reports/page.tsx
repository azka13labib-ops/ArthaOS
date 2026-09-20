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
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
    if (activeStore) {
      loadReports();
    }
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Laporan Keuangan & Valuasi Aset
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Laporan Laba Rugi real-time berdasarkan transaksi kasir dan mutasi inventori FIFO.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Cetak Laporan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              disabled={isLoading}
              title="Perbarui laporan"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Periode Laporan:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
            </div>
            <Button variant="primary" size="sm" onClick={loadReports}>
              Terapkan Filter
            </Button>
          </div>
        </div>

        {/* 2 Main Sections: Income Statement & Stock Valuation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Income Statement (Laba Rugi) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-300 shadow-sm">
              <CardHeader className="bg-slate-900 text-white rounded-t-xl py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-base">
                      Laporan Laba Rugi (Income Statement)
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Outlet: {activeStore?.name}
                    </p>
                  </div>
                  <Badge variant="success" size="sm">
                    Margin: {netMarginPercent}%
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4 text-xs">
                {isLoading ? (
                  <div className="py-12">
                    <Spinner size="lg" label="Menghitung laporan laba rugi..." />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Item 1: Pendapatan Penjualan */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          1. Total Penjualan Kotor (Gross Sales)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Akumulasi penerimaan kas, transfer, dan piutang penjualan
                        </p>
                      </div>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatIDR(grossSales)}
                      </span>
                    </div>

                    {/* Item 2: HPP */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-700 text-sm">
                          2. Harga Pokok Penjualan (HPP / COGS)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Harga modal beli barang yang terjual
                        </p>
                      </div>
                      <span className="font-bold text-rose-600 text-sm">
                        -{formatIDR(cogs)}
                      </span>
                    </div>

                    {/* Item 3: Laba Kotor */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          3. Laba Kotor (Gross Profit)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Margin Laba Kotor: {grossMarginPercent}%
                        </p>
                      </div>
                      <span className="font-extrabold text-slate-900 text-base">
                        {formatIDR(grossProfit)}
                      </span>
                    </div>

                    {/* Item 4: Biaya Operasional */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-700 text-sm">
                          4. Beban Operasional (Expenses)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Listrik, gaji, sewa, dan pengeluaran harian
                        </p>
                      </div>
                      <span className="font-bold text-rose-600 text-sm">
                        -{formatIDR(expenses)}
                      </span>
                    </div>

                    {/* Final Net Profit */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        netProfit >= 0
                          ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                          : "bg-rose-50/80 border-rose-300 text-rose-950"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-base uppercase tracking-wide">
                          LABA BERSIH USAHA (NET PROFIT)
                        </p>
                        <p className="text-[11px] opacity-80">
                          Keuntungan bersih setelah dikurangi HPP & seluruh biaya operasional
                        </p>
                      </div>
                      <span
                        className={`text-xl sm:text-2xl font-black ${
                          netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatIDR(netProfit)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right 1 Col: Stock Valuation Asset Report */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <CardTitle>Valuasi Aset Stok</CardTitle>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit nilai inventori fisik yang tersimpan di toko
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {isLoading ? (
                  <div className="py-8">
                    <Spinner size="md" label="Menghitung valuasi..." />
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-500 font-semibold uppercase text-[10px]">
                        Total Fisik Produk
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {stockValuation?.total_inventory_items ?? 0} Unit Barang
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-500 font-semibold uppercase text-[10px]">
                        Nilai Aset Berdasarkan Harga Modal (HPP)
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {formatIDR(stockValuation?.total_asset_cost ?? 0)}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-emerald-800 font-semibold uppercase text-[10px]">
                        Nilai Aset Berdasarkan Harga Jual
                      </p>
                      <p className="text-lg font-bold text-emerald-700 mt-1">
                        {formatIDR(stockValuation?.total_asset_retail ?? 0)}
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800 font-semibold uppercase text-[10px]">
                        Proyeksi Potensi Laba Kotor Stok
                      </p>
                      <p className="text-lg font-bold text-blue-700 mt-1">
                        {formatIDR(stockValuation?.potential_gross_profit ?? 0)}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
