"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Download,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/utils";
import { exportToCSV, printFormattedReport } from "@/lib/exportUtils";
import { ProfitLossReport, StockValuationReport, CashFlowReport } from "@/lib/types";

export default function ReportsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore, settings } = useStore();

  const [activeTab, setActiveTab] = useState<"profit_loss" | "stock" | "cash_flow">("profit_loss");

  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [stockValuation, setStockValuation] = useState<StockValuationReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
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
      const [plData, stockData, cfData] = await Promise.all([
        api.reports.profitLoss(activeStore.id, startDate, endDate).catch(() => null),
        api.reports.stockValuation(activeStore.id).catch(() => null),
        api.reports.cashFlow(activeStore.id, startDate, endDate).catch(() => null),
      ]);
      setProfitLoss(plData);
      setStockValuation(stockData);
      setCashFlow(cfData);
    } catch (err) {
      console.error("Failed to load reports:", err);
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

  const grossSales = profitLoss?.gross_sales ?? 0;
  const cogs = profitLoss?.cogs ?? 0;
  const grossProfit = profitLoss?.gross_profit ?? 0;
  const expenses = profitLoss?.expenses ?? 0;
  const netProfit = profitLoss?.net_profit ?? 0;

  const grossMarginPercent = grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0;
  const netMarginPercent = grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0;

  const periodText = `${new Date(startDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} s/d ${new Date(endDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!activeStore) return;

    if (activeTab === "profit_loss") {
      const data = [
        { komponen: "Penjualan Kotor (Gross Sales)", nilai: grossSales, keterangan: "Total omzet penjualan kasir" },
        { komponen: "Harga Pokok Penjualan (HPP / COGS)", nilai: cogs, keterangan: "Modal beli barang terjual" },
        { komponen: "Laba Kotor (Gross Profit)", nilai: grossProfit, keterangan: `Margin: ${grossMarginPercent}%` },
        { komponen: "Beban Operasional (Expenses)", nilai: expenses, keterangan: "Biaya operasional toko" },
        { komponen: "Laba Bersih (Net Profit)", nilai: netProfit, keterangan: `Margin: ${netMarginPercent}%` },
      ];
      exportToCSV(`Laporan_Laba_Rugi_${activeStore.name}_${startDate}_${endDate}`, data, [
        { key: "komponen", label: "Komponen Keuangan" },
        { key: "nilai", label: "Nominal (IDR)" },
        { key: "keterangan", label: "Keterangan" },
      ]);
    } else if (activeTab === "stock") {
      const data = [
        { indikator: "Total Fisik Unit Produk", nilai: stockValuation?.total_inventory_items || 0 },
        { indikator: "Nilai Aset Modal (HPP / Biaya Beli)", nilai: stockValuation?.total_asset_cost || 0 },
        { indikator: "Nilai Aset Retail (Harga Jual Total)", nilai: stockValuation?.total_asset_retail || 0 },
        { indikator: "Potensi Laba Kotor Inventori", nilai: stockValuation?.potential_gross_profit || 0 },
      ];
      exportToCSV(`Laporan_Valuasi_Stok_${activeStore.name}_${todayStr}`, data, [
        { key: "indikator", label: "Indikator Inventori" },
        { key: "nilai", label: "Jumlah / Nilai (IDR)" },
      ]);
    } else if (activeTab === "cash_flow") {
      const data = [
        { arus: "Kas Masuk (Cash In)", jumlah: cashFlow?.cash_in || 0, catatan: "Penerimaan penjualan & pelunasan kasbon" },
        { arus: "Kas Keluar (Cash Out)", jumlah: cashFlow?.cash_out || 0, catatan: "Biaya operasional & belanja stok" },
        { arus: "Arus Kas Bersih (Net Cash Flow)", jumlah: cashFlow?.net_cash_flow || 0, catatan: "Selisih kas masuk - keluar" },
      ];
      exportToCSV(`Laporan_Arus_Kas_${activeStore.name}_${startDate}_${endDate}`, data, [
        { key: "arus", label: "Kategori Arus Kas" },
        { key: "jumlah", label: "Nominal (IDR)" },
        { key: "catatan", label: "Catatan" },
      ]);
    }
  };

  // Clean Formatted PDF Printing
  const handlePrintPDF = () => {
    if (!activeStore) return;

    if (activeTab === "profit_loss") {
      const html = `
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Penjualan Kotor</span>
            <span class="summary-val">${formatIDR(grossSales)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Laba Kotor</span>
            <span class="summary-val">${formatIDR(grossProfit)} (${grossMarginPercent}%)</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Laba Bersih</span>
            <span class="summary-val" style="color: ${netProfit >= 0 ? "#059669" : "#dc2626"};">
              ${formatIDR(netProfit)} (${netMarginPercent}%)
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Komponen Laporan</th>
              <th class="text-right">Nominal (IDR)</th>
              <th>Persentase / Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Total Penjualan Kotor (Gross Sales)</strong></td>
              <td class="text-right font-bold">${formatIDR(grossSales)}</td>
              <td>100%</td>
            </tr>
            <tr>
              <td>2. Harga Pokok Penjualan (HPP / COGS)</td>
              <td class="text-right" style="color: #dc2626;">-${formatIDR(cogs)}</td>
              <td>Biaya modal produk terjual</td>
            </tr>
            <tr style="background-color: #f1f5f9;">
              <td><strong>3. Laba Kotor (Gross Profit)</strong></td>
              <td class="text-right font-bold">${formatIDR(grossProfit)}</td>
              <td>Margin: ${grossMarginPercent}%</td>
            </tr>
            <tr>
              <td>4. Beban Operasional (Expenses)</td>
              <td class="text-right" style="color: #dc2626;">-${formatIDR(expenses)}</td>
              <td>Biaya listrik, gaji, & operasional</td>
            </tr>
            <tr style="background-color: #e2e8f0;">
              <td><strong>5. LABA BERSIH (NET PROFIT)</strong></td>
              <td class="text-right font-bold" style="font-size: 14px; color: ${netProfit >= 0 ? "#059669" : "#dc2626"};">
                ${formatIDR(netProfit)}
              </td>
              <td><strong>Margin Bersih: ${netMarginPercent}%</strong></td>
            </tr>
          </tbody>
        </table>
      `;
      printFormattedReport("Laporan Laba Rugi (Income Statement)", activeStore.name, periodText, html);
    } else if (activeTab === "stock") {
      const html = `
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Total Unit Fisik</span>
            <span class="summary-val">${stockValuation?.total_inventory_items || 0} Unit</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Valuasi Modal (HPP)</span>
            <span class="summary-val">${formatIDR(stockValuation?.total_asset_cost || 0)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Valuasi Retail</span>
            <span class="summary-val">${formatIDR(stockValuation?.total_asset_retail || 0)}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Indikator Aset Inventori</th>
              <th class="text-right">Nilai / Jumlah</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Fisik Produk di Gudang & Display</td>
              <td class="text-right font-bold">${stockValuation?.total_inventory_items || 0} Unit</td>
              <td>Akumulasi kuantitas seluruh SKU</td>
            </tr>
            <tr>
              <td>Nilai Aset Berdasarkan Harga Beli (HPP)</td>
              <td class="text-right font-bold">${formatIDR(stockValuation?.total_asset_cost || 0)}</td>
              <td>Modal tertanam dalam stok barang</td>
            </tr>
            <tr>
              <td>Nilai Aset Berdasarkan Harga Jual (Retail)</td>
              <td class="text-right font-bold">${formatIDR(stockValuation?.total_asset_retail || 0)}</td>
              <td>Estimasi omzet jika seluruh stok terjual</td>
            </tr>
            <tr style="background-color: #f0fdf4;">
              <td><strong>Proyeksi Potensi Laba Kotor Inventori</strong></td>
              <td class="text-right font-bold" style="color: #059669;">
                ${formatIDR(stockValuation?.potential_gross_profit || 0)}
              </td>
              <td>Selisih nilai retail dan nilai modal</td>
            </tr>
          </tbody>
        </table>
      `;
      printFormattedReport("Laporan Valuasi & Audit Stok Inventori", activeStore.name, todayStr, html);
    } else if (activeTab === "cash_flow") {
      const html = `
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Total Kas Masuk</span>
            <span class="summary-val" style="color: #059669;">${formatIDR(cashFlow?.cash_in || 0)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Kas Keluar</span>
            <span class="summary-val" style="color: #dc2626;">${formatIDR(cashFlow?.cash_out || 0)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Arus Kas Bersih</span>
            <span class="summary-val">${formatIDR(cashFlow?.net_cash_flow || 0)}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Kategori Arus Kas</th>
              <th class="text-right">Nominal (IDR)</th>
              <th>Rincian</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Kas Masuk (Cash In)</strong></td>
              <td class="text-right font-bold" style="color: #059669;">${formatIDR(cashFlow?.cash_in || 0)}</td>
              <td>Penerimaan kas, transfer & QRIS</td>
            </tr>
            <tr>
              <td><strong>Kas Keluar (Cash Out)</strong></td>
              <td class="text-right font-bold" style="color: #dc2626;">-${formatIDR(cashFlow?.cash_out || 0)}</td>
              <td>Pengeluaran operasional & belanja stok</td>
            </tr>
            <tr style="background-color: #f1f5f9;">
              <td><strong>ARUS KAS BERSIH (NET CASH FLOW)</strong></td>
              <td class="text-right font-bold" style="font-size: 14px;">${formatIDR(cashFlow?.net_cash_flow || 0)}</td>
              <td>Likuiditas periode berjalan</td>
            </tr>
          </tbody>
        </table>
      `;
      printFormattedReport("Laporan Arus Kas (Cash Flow Statement)", activeStore.name, periodText, html);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-8 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <BarChart3 className="h-8 w-8 text-primary" />
              Laporan Keuangan & Analitik
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Laporan Laba Rugi, Valuasi Stok, dan Arus Kas real-time dengan audit pembukuan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 shadow-sm font-semibold text-xs h-9"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Ekspor Excel (CSV)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPDF}
              className="gap-2 shadow-sm font-semibold text-xs h-9"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              Cetak PDF Laporan
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              disabled={isLoading}
              className="h-9 px-3"
              title="Perbarui laporan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Date Filter & Tab Switcher Bar */}
        <div className="bg-card border border-border/80 rounded-xl shadow-sm p-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("profit_loss")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === "profit_loss"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Laba Rugi (Income)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === "stock"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Valuasi Stok
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cash_flow")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === "cash_flow"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              Arus Kas (Cash Flow)
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center bg-background rounded-md border border-input shadow-sm overflow-hidden text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-transparent text-foreground focus:outline-none"
              />
              <span className="px-2 text-muted-foreground bg-muted/40 font-semibold uppercase">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-transparent text-foreground focus:outline-none"
              />
            </div>
            <Button size="sm" onClick={loadReports} className="h-8 text-xs font-semibold px-4">
              Terapkan
            </Button>
          </div>
        </div>

        {/* Tab 1: Income Statement (Laba Rugi) */}
        {activeTab === "profit_loss" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 border border-border bg-card rounded-xl shadow-sm overflow-hidden">
              <div className="bg-muted/40 px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">Laporan Laba Rugi (Income Statement)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Periode: {periodText}</p>
                </div>
                <Badge variant="outline" className="text-xs font-bold px-3 py-1">
                  Margin Bersih: {netMarginPercent}%
                </Badge>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="py-16 flex justify-center">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    {/* Item 1: Gross Sales */}
                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-semibold text-foreground">1. Total Penjualan Kotor (Gross Sales)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Akumulasi penerimaan kasir, transfer & QRIS</p>
                      </div>
                      <span className="font-bold text-base text-foreground">{formatIDR(grossSales)}</span>
                    </div>

                    {/* Item 2: COGS */}
                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-semibold text-foreground">2. Harga Pokok Penjualan (HPP / COGS)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Total harga modal beli barang yang terjual</p>
                      </div>
                      <span className="font-bold text-base text-rose-500">-{formatIDR(cogs)}</span>
                    </div>

                    {/* Item 3: Gross Profit */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div>
                        <p className="font-bold text-foreground">3. Laba Kotor (Gross Profit)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Margin Kotor: {grossMarginPercent}%</p>
                      </div>
                      <span className="font-bold text-xl text-primary">{formatIDR(grossProfit)}</span>
                    </div>

                    {/* Item 4: Expenses */}
                    <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-semibold text-foreground">4. Beban Operasional (Expenses)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Gaji, listrik, sewa, dan pengeluaran harian</p>
                      </div>
                      <span className="font-bold text-base text-rose-500">-{formatIDR(expenses)}</span>
                    </div>

                    {/* Final Net Profit */}
                    <div
                      className={`flex items-center justify-between p-5 rounded-xl border ${
                        netProfit >= 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/10 border-destructive/30 text-destructive"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-base uppercase tracking-wider">5. LABA BERSIH (NET PROFIT)</p>
                        <p className="text-xs opacity-80 mt-0.5">Setelah dikurangi HPP dan seluruh biaya operasional</p>
                      </div>
                      <span className="font-bold text-2xl tracking-tight">{formatIDR(netProfit)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Omzet Penjualan
                </span>
                <h3 className="text-2xl font-bold text-foreground">{formatIDR(grossSales)}</h3>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                  <ArrowUpRight className="h-4 w-4" /> 100% Volume Penjualan
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Efisiensi Modal (HPP Ratio)
                </span>
                <h3 className="text-2xl font-bold text-foreground">
                  {grossSales > 0 ? Math.round((cogs / grossSales) * 100) : 0}%
                </h3>
                <p className="text-xs text-muted-foreground mt-2">Dari total omzet dialokasikan untuk modal barang</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Net Profit Margin
                </span>
                <h3 className="text-2xl font-bold text-primary">{netMarginPercent}%</h3>
                <p className="text-xs text-muted-foreground mt-2">Tingkat profitabilitas bersih bisnis Anda</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stock Valuation */}
        {activeTab === "stock" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 border border-border rounded-xl bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Total Fisik Barang</p>
                <Package className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {stockValuation?.total_inventory_items ?? 0} <span className="text-sm font-normal text-muted-foreground">Unit</span>
              </p>
            </div>

            <div className="p-5 border border-border rounded-xl bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Nilai Modal (HPP)</p>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatIDR(stockValuation?.total_asset_cost ?? 0)}
              </p>
            </div>

            <div className="p-5 border border-border rounded-xl bg-card shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Nilai Retail (Harga Jual)</p>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatIDR(stockValuation?.total_asset_retail ?? 0)}
              </p>
            </div>

            <div className="p-5 border border-primary/20 rounded-xl bg-primary/5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-primary font-semibold uppercase tracking-wider text-xs">Potensi Laba Kotor</p>
                <PieChart className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatIDR(stockValuation?.potential_gross_profit ?? 0)}
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Cash Flow Statement */}
        {activeTab === "cash_flow" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Kas Masuk (Inflow)</span>
                <ArrowDownRight className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-600 mt-2">{formatIDR(cashFlow?.cash_in || 0)}</h3>
              <p className="text-xs text-muted-foreground mt-2">Penerimaan dari kasir, transfer & pelunasan kasbon</p>
            </div>

            <div className="p-6 border border-rose-500/20 bg-rose-500/5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Total Kas Keluar (Outflow)</span>
                <ArrowUpRight className="h-5 w-5 text-rose-500" />
              </div>
              <h3 className="text-2xl font-bold text-rose-500 mt-2">{formatIDR(cashFlow?.cash_out || 0)}</h3>
              <p className="text-xs text-muted-foreground mt-2">Pengeluaran belanja inventori & biaya operasional</p>
            </div>

            <div className="p-6 border border-primary/20 bg-primary/5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Arus Kas Bersih (Net Flow)</span>
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mt-2">{formatIDR(cashFlow?.net_cash_flow || 0)}</h3>
              <p className="text-xs text-muted-foreground mt-2">Selisih likuiditas kas operasional toko</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
