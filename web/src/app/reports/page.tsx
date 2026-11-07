"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Package,
  Calendar,
  Printer,
  RefreshCw,
  PieChart,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertCircle,
  Receipt,
  ShoppingBag,
  HelpCircle,
  CheckCircle2,
  SlidersHorizontal,
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

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [activeTab, setActiveTab] = useState<"profit_loss" | "stock" | "cash_flow">("profit_loss");

  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [stockValuation, setStockValuation] = useState<StockValuationReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Filters (Local Timezone)
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const firstDayOfMonth = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));

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
    setError(null);

    try {
      const [plData, stockData, cfData] = await Promise.all([
        api.reports.profitLoss(activeStore.id, startDate, endDate),
        api.reports.stockValuation(activeStore.id),
        api.reports.cashFlow(activeStore.id, startDate, endDate),
      ]);
      setProfitLoss(plData);
      setStockValuation(stockData);
      setCashFlow(cfData);
    } catch (err: unknown) {
      console.error("Failed to load reports:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data laporan dari server.");
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

  // Financial Calculations
  const grossSales = profitLoss?.gross_sales ?? 0;
  const cogs = profitLoss?.cogs ?? 0;
  const grossProfit = profitLoss?.gross_profit ?? 0;
  const expenses = profitLoss?.expenses ?? 0;
  const stockPurchases = cashFlow?.stock_purchases ?? 0;
  const netProfit = profitLoss?.net_profit ?? 0;

  const grossMarginPercent = grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0;
  const cogsRatioPercent = grossSales > 0 ? Math.round((cogs / grossSales) * 100) : 0;
  const expenseRatioPercent = grossSales > 0 ? Math.round((expenses / grossSales) * 100) : 0;
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

  // Quick Preset Handlers (Local Timezone)
  const handlePreset = (preset: "today" | "7days" | "month" | "last_month") => {
    const current = new Date();
    const today = formatLocalDate(current);

    if (preset === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "7days") {
      const d = new Date(current);
      d.setDate(d.getDate() - 6);
      setStartDate(formatLocalDate(d));
      setEndDate(today);
    } else if (preset === "month") {
      const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
      setStartDate(formatLocalDate(firstDay));
      setEndDate(today);
    } else if (preset === "last_month") {
      const firstDayLastMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(current.getFullYear(), current.getMonth(), 0);
      setStartDate(formatLocalDate(firstDayLastMonth));
      setEndDate(formatLocalDate(lastDayLastMonth));
    }
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!activeStore) return;

    if (activeTab === "profit_loss") {
      const data = [
        { komponen: "1. Penjualan Kotor (Gross Sales)", tipe: "Pendapatan", nilai: grossSales, rasio: "100%", catatan: "Total omzet transaksi penjualan kasir" },
        { komponen: "2. Harga Pokok Penjualan (HPP / COGS)", tipe: "Biaya Modal", nilai: -cogs, rasio: `${cogsRatioPercent}%`, catatan: "Modal beli barang/bahan baku yang terjual" },
        { komponen: "3. Laba Kotor (Gross Profit)", tipe: "Subtotal", nilai: grossProfit, rasio: `${grossMarginPercent}%`, catatan: "Keuntungan kotor sebelum beban operasional" },
        { komponen: "4. Beban Operasional Toko (Expenses)", tipe: "Pengeluaran Rutin", nilai: -expenses, rasio: `${expenseRatioPercent}%`, catatan: "Listrik, sewa, gaji, dan biaya operasional" },
        { komponen: "5. Realisasi Belanja Stok (Stock Purchases)", tipe: "Arus Kas Masuk Aset", nilai: -stockPurchases, rasio: "Info", catatan: "Pengeluaran belanja inventori baru ke supplier" },
        { komponen: "6. Laba Bersih Usaha (Net Profit)", tipe: "Hasil Akhir", nilai: netProfit, rasio: `${netMarginPercent}%`, catatan: "Keuntungan bersih murni siap ditarik/diinvestasikan" },
      ];
      exportToCSV(`Laporan_Laba_Rugi_${activeStore.name}_${startDate}_${endDate}`, data, [
        { key: "komponen", label: "Komponen Akuntansi" },
        { key: "tipe", label: "Kategori" },
        { key: "nilai", label: "Nominal (IDR)" },
        { key: "rasio", label: "Rasio Omzet" },
        { key: "catatan", label: "Keterangan UMKM" },
      ]);
    } else if (activeTab === "stock") {
      const data = [
        { indikator: "Total Unit Fisik Produk", nilai: stockValuation?.total_inventory_items || 0, satuan: "Unit", catatan: "Total akumulasi stok barang di toko" },
        { indikator: "Nilai Aset Modal Produk Jadi (Finished Goods)", nilai: stockValuation?.product_asset_cost ?? stockValuation?.total_asset_cost ?? 0, satuan: "IDR", catatan: "Modal tertanam di barang siap jual" },
        { indikator: "Nilai Aset Modal Bahan Baku (Raw Materials)", nilai: stockValuation?.raw_material_asset_cost || 0, satuan: "IDR", catatan: "Modal tertanam di bahan baku dapur/olahan" },
        { indikator: "Total Nilai Aset Modal (HPP Keseluruhan)", nilai: stockValuation?.total_asset_cost || 0, satuan: "IDR", catatan: "Total modal aset persediaan" },
        { indikator: "Nilai Aset Retail (Harga Jual Total)", nilai: stockValuation?.total_asset_retail || 0, satuan: "IDR", catatan: "Estimasi pendapatan kotor jika stok terjual" },
        { indikator: "Potensi Laba Kotor Inventori", nilai: stockValuation?.potential_gross_profit || 0, satuan: "IDR", catatan: "Selisih nilai jual retail dikurangi nilai modal HPP" },
      ];
      exportToCSV(`Laporan_Valuasi_Stok_${activeStore.name}_${todayStr}`, data, [
        { key: "indikator", label: "Indikator Inventori" },
        { key: "nilai", label: "Nilai / Jumlah" },
        { key: "satuan", label: "Satuan" },
        { key: "catatan", label: "Keterangan" },
      ]);
    } else if (activeTab === "cash_flow") {
      const data = [
        { arus: "1. Kas Masuk Penjualan & Kasbon (Cash In)", kategori: "Pemasukan", jumlah: cashFlow?.cash_in || 0, catatan: "Penerimaan tunai, transfer, dan QRIS" },
        { arus: "2a. Beban Operasional Toko (Operating Expenses)", kategori: "Pengeluaran", jumlah: -(cashFlow?.operating_expenses || 0), catatan: "Beban pengeluaran operasional toko" },
        { arus: "2b. Belanja Stok Inventori (Stock Purchases)", kategori: "Pengeluaran", jumlah: -(cashFlow?.stock_purchases || 0), catatan: "Pembelian stok ke supplier (lunas)" },
        { arus: "2. Total Kas Keluar (Total Cash Out)", kategori: "Subtotal", jumlah: -(cashFlow?.cash_out || 0), catatan: "Beban operasional ditambah belanja stok" },
        { arus: "3. Arus Kas Bersih Usaha (Net Cash Flow)", kategori: "Hasil Akhir", jumlah: cashFlow?.net_cash_flow || 0, catatan: "Surplus / defisit kas likuid periode berjalan" },
      ];
      exportToCSV(`Laporan_Arus_Kas_${activeStore.name}_${startDate}_${endDate}`, data, [
        { key: "arus", label: "Komponen Arus Kas" },
        { key: "kategori", label: "Kategori" },
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
            <span class="summary-label">Total Omzet Penjualan</span>
            <span class="summary-val">${formatIDR(grossSales)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Laba Kotor (Gross Margin)</span>
            <span class="summary-val">${formatIDR(grossProfit)} (${grossMarginPercent}%)</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Laba Bersih (Net Margin)</span>
            <span class="summary-val" style="color: ${netProfit >= 0 ? "#059669" : "#dc2626"};">
              ${formatIDR(netProfit)} (${netMarginPercent}%)
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Komponen Akuntansi</th>
              <th class="text-right">Nominal (IDR)</th>
              <th>Rasio / Penjelasan UMKM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Total Penjualan Kotor (Gross Sales)</strong></td>
              <td class="text-right font-bold">${formatIDR(grossSales)}</td>
              <td>100% (Volume omzet seluruh transaksi kasir)</td>
            </tr>
            <tr>
              <td>2. Harga Pokok Penjualan (HPP / COGS)</td>
              <td class="text-right" style="color: #dc2626;">-${formatIDR(cogs)}</td>
              <td>${cogsRatioPercent}% (Modal beli produk terjual)</td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td>3. Laba Kotor Usaha (Gross Profit)</td>
              <td class="text-right" style="color: #0f172a;">${formatIDR(grossProfit)}</td>
              <td>Margin Kotor: ${grossMarginPercent}%</td>
            </tr>
            <tr>
              <td>4. Beban Operasional Toko (Expenses)</td>
              <td class="text-right" style="color: #dc2626;">-${formatIDR(expenses)}</td>
              <td>${expenseRatioPercent}% (Listrik, sewa, gaji, dan biaya harian)</td>
            </tr>
            <tr style="color: #64748b;">
              <td>5. Belanja Pengadaan Stok Baru (Stock Purchases)</td>
              <td class="text-right">-${formatIDR(stockPurchases)}</td>
              <td>Kas belanja inventori supplier periode ini</td>
            </tr>
            <tr style="background-color: ${netProfit >= 0 ? "#ecfdf5" : "#fef2f2"}; font-weight: bold;">
              <td>6. LABA BERSIH USAHA (NET PROFIT)</td>
              <td class="text-right" style="font-size: 15px; color: ${netProfit >= 0 ? "#059669" : "#dc2626"};">
                ${formatIDR(netProfit)}
              </td>
              <td style="color: ${netProfit >= 0 ? "#059669" : "#dc2626"};">
                Margin Bersih: ${netMarginPercent}%
              </td>
            </tr>
          </tbody>
        </table>
      `;
      printFormattedReport("Laporan Laba Rugi Akuntansi UMKM", activeStore.name, periodText, html);
    } else if (activeTab === "stock") {
      const html = `
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Total Fisik Barang</span>
            <span class="summary-val">${stockValuation?.total_inventory_items || 0} Unit</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Modal HPP</span>
            <span class="summary-val">${formatIDR(stockValuation?.total_asset_cost || 0)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Nilai Retail</span>
            <span class="summary-val">${formatIDR(stockValuation?.total_asset_retail || 0)}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Indikator Inventori</th>
              <th class="text-right">Nilai / Jumlah</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Fisik Unit di Toko & Gudang</td>
              <td class="text-right font-bold">${stockValuation?.total_inventory_items || 0} Unit</td>
              <td>Akumulasi seluruh kuantitas stok</td>
            </tr>
            <tr>
              <td>Nilai Modal Produk Jadi (Finished Goods)</td>
              <td class="text-right font-bold">${formatIDR(stockValuation?.product_asset_cost ?? stockValuation?.total_asset_cost ?? 0)}</td>
              <td>Modal tertanam pada produk siap jual</td>
            </tr>
            <tr>
              <td>Nilai Modal Bahan Baku (Raw Materials)</td>
              <td class="text-right font-bold">${formatIDR(stockValuation?.raw_material_asset_cost || 0)}</td>
              <td>Modal tertanam pada persediaan bahan olahan</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td><strong>Total Nilai Modal Inventori (HPP Total)</strong></td>
              <td class="text-right font-bold">${formatIDR(stockValuation?.total_asset_cost || 0)}</td>
              <td>Total modal aset persediaan toko</td>
            </tr>
            <tr>
              <td>Nilai Retail (Estimasi Harga Jual Total)</td>
              <td class="text-right font-bold">${formatIDR(stockValuation?.total_asset_retail || 0)}</td>
              <td>Estimasi kotor jika seluruh stok terjual</td>
            </tr>
            <tr style="background-color: #f0fdf4;">
              <td><strong>Proyeksi Potensi Laba Kotor Stok</strong></td>
              <td class="text-right font-bold" style="color: #059669;">
                ${formatIDR(stockValuation?.potential_gross_profit || 0)}
              </td>
              <td>Selisih nilai jual retail dikurangi nilai modal</td>
            </tr>
          </tbody>
        </table>
      `;
      printFormattedReport("Laporan Valuasi & Audit Stok", activeStore.name, todayStr, html);
    } else if (activeTab === "cash_flow") {
      const html = `
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Kas Masuk (Inflow)</span>
            <span class="summary-val" style="color: #059669;">${formatIDR(cashFlow?.cash_in || 0)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Kas Keluar (Outflow)</span>
            <span class="summary-val" style="color: #dc2626;">${formatIDR(cashFlow?.cash_out || 0)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Arus Kas Bersih</span>
            <span class="summary-val" style="color: ${(cashFlow?.net_cash_flow || 0) >= 0 ? "#059669" : "#dc2626"};">
              ${formatIDR(cashFlow?.net_cash_flow || 0)}
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Kategori Arus Kas</th>
              <th class="text-right">Nominal (IDR)</th>
              <th>Rincian Pembukuan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Penerimaan Kas Masuk (Cash In)</strong></td>
              <td class="text-right font-bold" style="color: #059669;">+${formatIDR(cashFlow?.cash_in || 0)}</td>
              <td>Penerimaan kasir tunai, transfer, QRIS & pelunasan kasbon</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">2a. Beban Operasional Toko</td>
              <td class="text-right" style="color: #dc2626;">-${formatIDR(cashFlow?.operating_expenses || 0)}</td>
              <td>Biaya rutin listrik, air, sewa, gaji</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;">2b. Belanja Pengadaan Stok</td>
              <td class="text-right" style="color: #dc2626;">-${formatIDR(cashFlow?.stock_purchases || 0)}</td>
              <td>Pembayaran belanja produk & bahan baku supplier</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td><strong>2. Total Kas Keluar (Total Outflow)</strong></td>
              <td class="text-right font-bold" style="color: #dc2626;">-${formatIDR(cashFlow?.cash_out || 0)}</td>
              <td>Total beban operasional dan belanja stok</td>
            </tr>
            <tr style="background-color: ${(cashFlow?.net_cash_flow || 0) >= 0 ? "#ecfdf5" : "#fef2f2"};">
              <td><strong>3. ARUS KAS BERSIH (NET CASH FLOW)</strong></td>
              <td class="text-right font-bold" style="font-size: 15px; color: ${(cashFlow?.net_cash_flow || 0) >= 0 ? "#059669" : "#dc2626"};">
                ${formatIDR(cashFlow?.net_cash_flow || 0)}
              </td>
              <td>Likuiditas kas operasional usaha</td>
            </tr>
          </tbody>
        </table>
      `;
      printFormattedReport("Laporan Arus Kas Operasional", activeStore.name, periodText, html);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Laporan Keuangan & Analitik
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Audit laba rugi, valuasi stok, dan pergerakan kas toko {activeStore?.name ? `(${activeStore.name})` : ""}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 font-medium text-xs h-9 bg-card hover:bg-muted"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPDF}
              className="gap-2 font-medium text-xs h-9 bg-card hover:bg-muted"
            >
              <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cetak Laporan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              disabled={isLoading}
              className="h-9 px-3 bg-card hover:bg-muted"
              title="Perbarui data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-foreground ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filter Bar: Presets, Custom Date Range & Report Tabs */}
        <div className="bg-card border border-border rounded-xl shadow-xs p-4 space-y-4">
          {/* Top Row: Report Tabs & Presets */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-lg overflow-x-auto w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("profit_loss")}
                className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[38px] ${
                  activeTab === "profit_loss"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                Laba Rugi (Income)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stock")}
                className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[38px] ${
                  activeTab === "stock"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                Valuasi Stok
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cash_flow")}
                className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[38px] ${
                  activeTab === "cash_flow"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                Arus Kas (Cash Flow)
              </button>
            </div>

            {/* Date Preset Buttons (Quick Filters) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline mr-1">
                Pilihan Cepat:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("today")}
                className="text-xs h-8 px-2.5 bg-background hover:bg-accent"
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("7days")}
                className="text-xs h-8 px-2.5 bg-background hover:bg-accent"
              >
                7 Hari
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("month")}
                className="text-xs h-8 px-2.5 bg-background hover:bg-accent"
              >
                Bulan Ini
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("last_month")}
                className="text-xs h-8 px-2.5 bg-background hover:bg-accent"
              >
                Bulan Lalu
              </Button>
            </div>
          </div>

          {/* Bottom Row: Explicit Date Pickers and Apply Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-12 sm:w-auto">Dari:</span>
                <div className="relative flex-1 sm:w-44">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-12 sm:w-auto">Sampai:</span>
                <div className="relative flex-1 sm:w-44">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={loadReports}
                disabled={isLoading}
                className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-2 shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Terapkan Filter</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Gagal Memuat Laporan</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={loadReports} className="self-end sm:self-auto text-xs">
              Coba Lagi
            </Button>
          </div>
        )}

        {/* TAB 1: LABA RUGI (INCOME STATEMENT) */}
        {activeTab === "profit_loss" && (
          <div className="space-y-6">
            {/* KPI Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                  Omzet Penjualan
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatIDR(grossSales)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-2">
                  <ArrowUpRight className="h-3.5 w-3.5" /> 100% Basis Omzet
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                  Beban Modal (HPP)
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatIDR(cogs)}</p>
                <p className="text-xs text-muted-foreground font-medium mt-2">
                  {cogsRatioPercent}% dari omzet untuk modal produk
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                  Laba Kotor Usaha
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatIDR(grossProfit)}</p>
                <p className="text-xs text-primary font-medium mt-2">
                  Margin Kotor: {grossMarginPercent}%
                </p>
              </div>

              <div className={`rounded-xl border p-4 sm:p-5 shadow-xs ${
                netProfit >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}>
                <span className={`text-xs font-medium uppercase tracking-wider block mb-1 ${
                  netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                }`}>
                  Laba Bersih Murni
                </span>
                <p className={`text-2xl font-bold tabular-nums ${
                  netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                }`}>
                  {formatIDR(netProfit)}
                </p>
                <p className={`text-xs font-medium mt-2 ${
                  netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                }`}>
                  Margin Bersih: {netMarginPercent}%
                </p>
              </div>
            </div>

            {/* Main Accounting Breakdown Card */}
            <div className="border border-border bg-card rounded-xl shadow-xs overflow-hidden">
              <div className="bg-muted/40 px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    Kartu Rincian Laba Rugi Usaha (Income Statement)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Periode: {periodText}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                    Margin Kotor: {grossMarginPercent}%
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 text-primary border-primary/40">
                    Margin Bersih: {netMarginPercent}%
                  </Badge>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3">
                    <Spinner size="md" />
                    <p className="text-xs text-muted-foreground">Memproses kalkulasi laba rugi...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Item 1: Pendapatan Kotor (Gross Sales) */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                              1
                            </span>
                            <h3 className="font-bold text-sm text-foreground">
                              Pendapatan Penjualan Kotor (Gross Sales)
                            </h3>
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              (+) Penerimaan
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Akumulasi total transaksi dari kasir POS, transfer bank, dan QRIS yang berhasil.
                          </p>
                        </div>
                        <div className="text-right sm:pl-4 pl-7">
                          <p className="font-bold text-base sm:text-lg text-foreground tabular-nums">
                            {formatIDR(grossSales)}
                          </p>
                          <span className="text-[11px] text-muted-foreground">100% Basis Omzet</span>
                        </div>
                      </div>
                    </div>

                    {/* Item 2: HPP (COGS) */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center shrink-0">
                              2
                            </span>
                            <h3 className="font-bold text-sm text-foreground">
                              Harga Pokok Penjualan (HPP / COGS)
                            </h3>
                            <Badge variant="outline" className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800">
                              (-) Modal Terjual
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Total harga beli modal barang dagangan dan bahan baku yang laku terjual pada periode ini.
                          </p>
                        </div>
                        <div className="text-right sm:pl-4 pl-7">
                          <p className="font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                            -{formatIDR(cogs)}
                          </p>
                          <span className="text-[11px] text-muted-foreground">{cogsRatioPercent}% dari omzet</span>
                        </div>
                      </div>
                    </div>

                    {/* Subtotal Item 3: Laba Kotor */}
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                              3
                            </span>
                            <h3 className="font-bold text-base text-foreground">
                              Laba Kotor Usaha (Gross Profit)
                            </h3>
                            <Badge className="text-[10px] font-semibold bg-primary text-primary-foreground">
                              (=) Omzet dikurangi HPP
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Sisa dana operasional sebelum dipotong tagihan listrik, sewa, gaji, dan biaya rutin.
                          </p>
                        </div>
                        <div className="text-right sm:pl-4 pl-7">
                          <p className="font-extrabold text-xl sm:text-2xl text-primary tabular-nums">
                            {formatIDR(grossProfit)}
                          </p>
                          <span className="text-[11px] text-primary font-semibold">Margin Kotor: {grossMarginPercent}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Item 4: Beban Operasional */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center shrink-0">
                              4
                            </span>
                            <h3 className="font-bold text-sm text-foreground">
                              Biaya Operasional Usaha (Operating Expenses)
                            </h3>
                            <Badge variant="outline" className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800">
                              (-) Beban Rutin
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Pengeluaran operasional toko seperti tagihan listrik, air, sewa bangunan, gaji, dan perlengkapan harian.
                          </p>
                        </div>
                        <div className="text-right sm:pl-4 pl-7">
                          <p className="font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                            -{formatIDR(expenses)}
                          </p>
                          <span className="text-[11px] text-muted-foreground">{expenseRatioPercent}% dari omzet</span>
                        </div>
                      </div>
                    </div>

                    {/* Item 5: Belanja Stok Baru (Informative Cash Outlay) */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                              5
                            </span>
                            <h3 className="font-bold text-sm text-foreground">
                              Pembelian Stok Inventori (Stock Purchases)
                            </h3>
                            <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800">
                              (i) Arus Kas Aset
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Realisasi uang kas yang dikeluarkan untuk belanja persediaan barang baru ke supplier periode ini.
                          </p>
                        </div>
                        <div className="text-right sm:pl-4 pl-7">
                          <p className="font-bold text-base sm:text-lg text-foreground tabular-nums">
                            {formatIDR(stockPurchases)}
                          </p>
                          <span className="text-[11px] text-muted-foreground">Menambah aset stok</span>
                        </div>
                      </div>
                    </div>

                    {/* Final Item 6: Laba Bersih Usaha (Net Profit) */}
                    <div
                      className={`p-5 rounded-xl border transition-colors ${
                        netProfit >= 0
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                              netProfit >= 0
                                ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900"
                                : "bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-900"
                            }`}>
                              6
                            </span>
                            <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                              LABA BERSIH USAHA (NET PROFIT)
                            </h3>
                          </div>
                          <p className="text-xs opacity-90 pl-8">
                            Keuntungan bersih final setelah laba kotor dikurangi seluruh beban operasional harian.
                          </p>
                        </div>
                        <div className="text-right sm:pl-4 pl-8">
                          <p className={`font-extrabold text-2xl sm:text-3xl tracking-tight tabular-nums ${
                            netProfit >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }`}>
                            {formatIDR(netProfit)}
                          </p>
                          <span className={`text-xs font-bold ${
                            netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                          }`}>
                            Margin Bersih: {netMarginPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Practical SME Financial Health Tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Kesehatan Margin
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {netMarginPercent >= 20
                    ? "Margin bersih di atas 20% menunjukkan tingkat efisiensi bisnis yang sangat prima dan sehat."
                    : netMarginPercent >= 10
                    ? "Margin bersih 10% s/d 20% merupakan standar ideal bagi usaha ritel dan kuliner UMKM."
                    : netMarginPercent > 0
                    ? "Bisnis menghasilkan keuntungan, namun evaluasi beban operasional agar margin bersih meningkat."
                    : "Usaha sedang mengalami defisit periode ini. Tinjau kembali harga modal (HPP) dan efisiensi pengeluaran."}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-2">
                  <Package className="w-4 h-4" />
                  Rasio Beban Modal (HPP)
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Modal HPP menghabiskan {cogsRatioPercent}% dari omzet Anda. Upayakan negosiasi harga beli ke supplier atau kurangi pemborosan bahan baku untuk menaikkan laba kotor.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-2">
                  <Wallet className="w-4 h-4" />
                  Perbandingan Belanja Stok
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Belanja stok baru tercatat sebesar {formatIDR(stockPurchases)}. Pastikan perputaran barang terjual (HPP {formatIDR(cogs)}) seimbang agar modal tidak menumpuk di gudang.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VALUASI STOK (STOCK VALUATION) */}
        {activeTab === "stock" && (
          <div className="space-y-6">
            {/* Primary Stock Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 border border-border rounded-xl bg-card shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">
                    Total Fisik Barang
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mt-3 tabular-nums">
                  {stockValuation?.total_inventory_items ?? 0}{" "}
                  <span className="text-sm font-normal text-muted-foreground">Unit</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Akumulasi seluruh kuantitas SKU</p>
              </div>

              <div className="p-5 border border-border rounded-xl bg-card shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">
                    Total Modal Tertanam
                  </span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mt-3 tabular-nums">
                  {formatIDR(stockValuation?.total_asset_cost ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total modal beli HPP inventori</p>
              </div>

              <div className="p-5 border border-border rounded-xl bg-card shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">
                    Valuasi Retail (Jual)
                  </span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mt-3 tabular-nums">
                  {formatIDR(stockValuation?.total_asset_retail ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Estimasi pendapatan kotor stok</p>
              </div>

              <div className="p-5 border border-primary/30 rounded-xl bg-primary/5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-primary font-semibold uppercase tracking-wider text-xs">
                    Potensi Laba Kotor
                  </span>
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <PieChart className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary mt-3 tabular-nums">
                  {formatIDR(stockValuation?.potential_gross_profit ?? 0)}
                </p>
                <p className="text-xs text-primary/80 mt-1">Selisih nilai retail vs nilai modal</p>
              </div>
            </div>

            {/* Asset Breakdown: Finished Goods vs Raw Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 border border-border rounded-xl bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nilai Produk Jadi (Finished Goods)
                  </span>
                  <Badge variant="secondary" className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10">
                    Siap Jual
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {formatIDR(stockValuation?.product_asset_cost ?? stockValuation?.total_asset_cost ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Modal tertanam dalam barang dagangan siap jual di display rak atau etalase kasir.
                </p>
              </div>

              <div className="p-5 border border-border rounded-xl bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nilai Bahan Baku (Raw Materials)
                  </span>
                  <Badge variant="secondary" className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    Bahan Olahan Resep
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {formatIDR(stockValuation?.raw_material_asset_cost ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Modal persediaan bahan baku dan komponen resep olahan di dapur atau gudang penyimpanan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ARUS KAS (CASH FLOW STATEMENT) */}
        {activeTab === "cash_flow" && (
          <div className="space-y-6">
            {/* Cash Flow Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 border border-emerald-500/30 bg-emerald-500/5 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Total Kas Masuk (Inflow)
                  </span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-3 tabular-nums">
                  +{formatIDR(cashFlow?.cash_in || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Penerimaan kasir tunai, transfer, QRIS & pelunasan kasbon
                </p>
              </div>

              <div className="p-5 border border-rose-500/30 bg-rose-500/5 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Total Kas Keluar (Outflow)
                  </span>
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-3 tabular-nums">
                  -{formatIDR(cashFlow?.cash_out || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Beban operasional toko dan belanja pengadaan stok
                </p>
              </div>

              <div className={`p-5 border rounded-xl shadow-xs ${
                (cashFlow?.net_cash_flow || 0) >= 0
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-rose-500/30 bg-rose-500/5"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    (cashFlow?.net_cash_flow || 0) >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}>
                    Arus Kas Bersih (Net Flow)
                  </span>
                  <div className={`p-2 rounded-lg ${
                    (cashFlow?.net_cash_flow || 0) >= 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  }`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <p className={`text-2xl font-bold mt-3 tabular-nums ${
                  (cashFlow?.net_cash_flow || 0) >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}>
                  {formatIDR(cashFlow?.net_cash_flow || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Surplus / defisit dana tunai usaha periode berjalan
                </p>
              </div>
            </div>

            {/* Detailed Cash Flow Ledger */}
            <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border">
                <h3 className="font-bold text-base text-foreground">
                  Rincian Mutasi Arus Kas (Cash Flow Breakdown)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Periode: {periodText}</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* 1. Penerimaan Kas Masuk */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div>
                    <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      1. Penerimaan Kas Masuk (Cash Inflow)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Penerimaan transaksi kasir, pembayaran pesanan, dan setoran pelunasan kasbon.
                    </p>
                  </div>
                  <span className="font-bold text-base sm:text-lg text-emerald-700 dark:text-emerald-300 tabular-nums">
                    +{formatIDR(cashFlow?.cash_in || 0)}
                  </span>
                </div>

                {/* 2a. Beban Operasional */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-muted/20 border border-border">
                  <div className="pl-1">
                    <p className="font-semibold text-sm text-foreground">
                      2a. Beban Operasional Toko (Operating Expenses)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pengeluaran listrik, sewa ruko, gaji karyawan, dan kebutuhan harian.
                    </p>
                  </div>
                  <span className="font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatIDR(cashFlow?.operating_expenses || 0)}
                  </span>
                </div>

                {/* 2b. Belanja Stok */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-muted/20 border border-border">
                  <div className="pl-1">
                    <p className="font-semibold text-sm text-foreground">
                      2b. Belanja Stok Inventori & Bahan Baku (Stock Purchases)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pengadaan persediaan barang siap jual dan bahan baku supplier (pembayaran tunai/transfer).
                    </p>
                  </div>
                  <span className="font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatIDR(cashFlow?.stock_purchases || 0)}
                  </span>
                </div>

                {/* 2c. Total Kas Keluar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      2. Total Kas Keluar (Total Cash Outflow)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Akumulasi seluruh biaya operasional ditambah belanja stok inventori.
                    </p>
                  </div>
                  <span className="font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatIDR(cashFlow?.cash_out || 0)}
                  </span>
                </div>

                {/* 3. Arus Kas Bersih */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl border ${
                    (cashFlow?.net_cash_flow || 0) >= 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100"
                  }`}
                >
                  <div>
                    <h3 className="font-extrabold text-base uppercase tracking-wider">
                      3. ARUS KAS BERSIH FINAL (NET CASH FLOW)
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      Selisih penerimaan kas masuk dikurangi seluruh kas keluar pada periode ini.
                    </p>
                  </div>
                  <span className={`font-extrabold text-2xl sm:text-3xl tabular-nums ${
                    (cashFlow?.net_cash_flow || 0) >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}>
                    {formatIDR(cashFlow?.net_cash_flow || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Methods Breakdown if available */}
            {cashFlow?.payment_methods && cashFlow.payment_methods.length > 0 && (
              <div className="bg-card border border-border rounded-xl shadow-xs p-5">
                <h3 className="font-bold text-sm text-foreground mb-3">
                  Rincian Penerimaan Kas Berdasarkan Metode Pembayaran
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cashFlow.payment_methods.map((pm) => (
                    <div key={pm.method} className="p-3.5 rounded-lg border border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Metode: {pm.method === "cash" ? "Tunai" : pm.method === "qris" ? "QRIS" : pm.method}
                      </span>
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        {formatIDR(pm.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
