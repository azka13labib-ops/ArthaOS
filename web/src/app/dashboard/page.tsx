"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  TrendingDown,
  AlertTriangle,
  Calendar,
  BarChart3,
  Truck,
  ChevronRight,
  Award,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import {
  Transaction,
  Product,
  StockValuationReport,
  Debt,
  DashboardMetrics,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KpiCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accentClass: string;
  iconBgClass: string;
}

function KpiCard({ title, value, sub, icon: Icon, accentClass, iconBgClass }: KpiCardProps) {
  return (
    <Card className={`relative overflow-hidden border transition-shadow shadow-xs hover:shadow-sm ${accentClass}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {title}
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate tabular-nums">
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {sub}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card className="shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-32 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// Custom Tooltip for Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string; count: number; date: string } }>;
}

function ChartCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-md text-xs space-y-1">
        <p className="font-semibold text-foreground">{data.payload.label}</p>
        <p className="text-primary font-bold text-sm tabular-nums">
          {formatIDR(data.value)}
        </p>
        <p className="text-muted-foreground">
          {data.payload.count} transaksi penjualan
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore, isLoadingStores } = useStore();

  const [stockValuation, setStockValuation] = useState<StockValuationReport | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<Transaction[]>([]);
  const [allSales, setAllSales] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) router.push("/login");
  }, [token, authLoading, router]);

  const loadDashboardData = useCallback(async (storeId: number) => {
    setIsLoadingData(true);
    setError("");
    try {
      const [stockData, metricsData, salesData, prodData, debtsData] = await Promise.all([
        api.reports.stockValuation(storeId).catch(() => null),
        api.reports.dashboardMetrics(storeId).catch(() => null),
        api.sales.list(storeId).catch(() => []),
        api.products.list(storeId).catch(() => []),
        api.debts.list(storeId).catch(() => []),
      ]);
      setStockValuation(stockData);
      setDashboardMetrics(metricsData);
      const safeSales = Array.isArray(salesData) ? salesData : [];
      setAllSales(safeSales);
      setRecentSales(safeSales.slice(0, 8));
      setProducts(Array.isArray(prodData) ? prodData : []);
      setDebts(Array.isArray(debtsData) ? debtsData : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data ringkasan dashboard");
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
    } else {
      setIsLoadingData(false);
    }
    return () => {
      mounted = false;
    };
  }, [activeStore, loadDashboardData]);

  // Real Sales Trend aggregated for the last 7 calendar days
  const chartData = useMemo(() => {
    const days = 7;
    const now = new Date();
    const result: Array<{ date: string; label: string; omzet: number; count: number }> = [];

    // Prepopulate last 7 days keys
    const dayMap = new Map<string, { label: string; omzet: number; count: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      dayMap.set(dateKey, { label, omzet: 0, count: 0 });
    }

    // Aggregate real sales by date
    allSales.forEach((trx) => {
      if (trx.type === "sale" && trx.occurred_at) {
        const dateKey = trx.occurred_at.split("T")[0];
        const existing = dayMap.get(dateKey);
        if (existing) {
          existing.omzet += Number(trx.total_amount) || 0;
          existing.count += 1;
        }
      }
    });

    dayMap.forEach((val, date) => {
      result.push({
        date,
        label: val.label,
        omzet: val.omzet,
        count: val.count,
      });
    });

    return result;
  }, [allSales]);

  const totalChartOmzet = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.omzet, 0);
  }, [chartData]);

  const totalChartTrx = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  // Loading state
  if (authLoading || isLoadingStores) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Empty state: no store selected
  if (!activeStore) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto mt-20 text-center p-6 bg-card border border-border rounded-xl shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <StoreIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            Belum Ada Toko Terpilih
          </h2>
          <p className="text-sm text-muted-foreground">
            Silakan pilih toko aktif dari sidebar atau buat toko pertama Anda untuk mengelola transaksi.
          </p>
        </div>
      </AppLayout>
    );
  }

  const lowStockProducts = products.filter((p) => p.current_stock <= 5);
  const totalUnpaidDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const unpaidCount = debts.filter((d) => d.status !== "paid").length;

  const topProducts = dashboardMetrics?.top_products || [];
  const maxTopQty = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.quantity), 1) : 1;

  const kpis: KpiCardProps[] = [
    {
      title: "Penjualan Hari Ini",
      value: formatIDR(dashboardMetrics?.today_sales ?? 0),
      sub: `${dashboardMetrics?.today_transactions ?? 0} transaksi berhasil`,
      icon: TrendingUp,
      accentClass: "border-primary/30 bg-primary/5",
      iconBgClass: "bg-primary/20 text-primary",
    },
    {
      title: "Beban Hari Ini",
      value: formatIDR(dashboardMetrics?.today_expenses ?? 0),
      sub: "Beban operasional harian",
      icon: TrendingDown,
      accentClass: "border-orange-500/30 bg-card",
      iconBgClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      title: "Valuasi Stok Toko",
      value: formatIDR(stockValuation?.total_asset_retail ?? 0),
      sub: `${products.length} SKU terdaftar (HPP: ${formatIDR(stockValuation?.total_asset_cost ?? 0)})`,
      icon: Package,
      accentClass: "border-blue-500/30 bg-card",
      iconBgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Tagihan Kasbon",
      value: formatIDR(totalUnpaidDebt),
      sub: `${unpaidCount} pelanggan belum lunas`,
      icon: AlertTriangle,
      accentClass: unpaidCount > 0 ? "border-rose-500/40 bg-rose-500/5" : "border-border bg-card",
      iconBgClass: unpaidCount > 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Ringkasan Kinerja Usaha
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pantau arus penjualan, inventori, dan catatan keuangan toko {activeStore.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-medium shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{formatDate(new Date().toISOString())}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDashboardData(activeStore.id)}
              disabled={isLoadingData}
              className="bg-card hover:bg-muted text-xs h-9 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 text-foreground ${isLoadingData ? "animate-spin" : ""}`} />
              <span>Perbarui Data</span>
            </Button>

            <Link href="/pos">
              <Button size="sm" className="h-9 text-xs font-semibold shadow-xs gap-2">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Buka Kasir POS</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Action Center (Pusat Perhatian) */}
        {!isLoadingData && (lowStockProducts.length > 0 || totalUnpaidDebt > 0) && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pusat Perhatian Operasional
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lowStockProducts.length > 0 && (
                <Link
                  href="/inventory"
                  className="block rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors p-4 shadow-xs group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
                          Peringatan Stok Menipis
                        </p>
                        <Badge variant="outline" className="text-[10px] font-semibold text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800">
                          {lowStockProducts.length} Produk
                        </Badge>
                      </div>
                      <p className="text-xs text-orange-700 dark:text-orange-300/90 mt-0.5">
                        Terdapat produk dengan sisa stok 5 unit atau habis. Klik untuk kelola mutasi stok.
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </Link>
              )}

              {totalUnpaidDebt > 0 && (
                <Link
                  href="/debts"
                  className="block rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors p-4 shadow-xs group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                          Buku Kasbon Belum Lunas
                        </p>
                        <Badge variant="outline" className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800">
                          {unpaidCount} Tagihan
                        </Badge>
                      </div>
                      <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5">
                        Total piutang kasbon tertunda sebesar {formatIDR(totalUnpaidDebt)}. Klik untuk cetak/kirim invoice tagihan.
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 h-7 text-xs"
                onClick={() => loadDashboardData(activeStore.id)}
              >
                Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingData
            ? [...Array(4)].map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
        </div>

        {/* Quick Action Shortcuts */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Aksi Cepat Operasional
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                href: "/pos",
                label: "Kasir POS",
                desc: "Scan barcode & checkout",
                icon: ShoppingCart,
                highlight: true,
              },
              {
                href: "/inventory",
                label: "Kelola Stok",
                desc: "Mutasi & audit opname",
                icon: Package,
              },
              {
                href: "/purchases",
                label: "Belanja Supplier",
                desc: "Pengadaan persediaan",
                icon: Truck,
              },
              {
                href: "/expenses",
                label: "Catat Beban",
                desc: "Pengeluaran harian toko",
                icon: Receipt,
              },
              {
                href: "/debts",
                label: "Buku Kasbon",
                desc: "Kirim tagihan pelanggan",
                icon: BookOpen,
              },
              {
                href: "/reports",
                label: "Laporan Keuangan",
                desc: "Laba rugi & arus kas",
                icon: BarChart3,
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group p-3.5 rounded-xl border transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  item.highlight
                    ? "bg-primary/10 border-primary/40 hover:bg-primary/15 text-primary"
                    : "bg-card border-border hover:border-border/80 hover:bg-muted/40"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                  item.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary"
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-foreground truncate">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {item.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Analytics: Revenue Trend Chart & Top Selling Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Chart */}
          <Card className="lg:col-span-2 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Tren Omzet Penjualan (7 Hari Terakhir)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Grafik omzet harian berdasarkan transaksi kasir riil yang tercatat di toko.
                </CardDescription>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Total Omzet 7 Hari
                </span>
                <span className="text-base font-bold text-foreground tabular-nums">
                  {formatIDR(totalChartOmzet)}
                </span>
                <span className="text-[11px] text-muted-foreground ml-1">
                  ({totalChartTrx} transaksi)
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {isLoadingData ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              ) : allSales.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    Belum Ada Data Penjualan
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                    Transaksi yang berhasil diselesaikan di kasir POS akan otomatis membentuk grafik tren omzet harian.
                  </p>
                  <Link href="/pos">
                    <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Mulai Transaksi Pertama
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border/50"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-muted-foreground"
                        tickFormatter={(val: number) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                          if (val >= 1000) return `${Math.round(val / 1000)}rb`;
                          return String(val);
                        }}
                      />
                      <Tooltip content={<ChartCustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="omzet"
                        stroke="#9333ea"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#omzetGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Products List */}
          <Card className="shadow-xs flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Produk Terlaris Hari Ini
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Berdasarkan kuantitas unit produk terjual
                    </CardDescription>
                  </div>
                  <Award className="w-5 h-5 text-amber-500 shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingData ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Belum ada produk terjual hari ini</p>
                    <p className="mt-0.5">Penjualan kasir hari ini akan muncul otomatis di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((p, index) => {
                      const percentage = Math.round((p.quantity / maxTopQty) * 100);
                      return (
                        <div key={p.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                index === 0
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                #{index + 1}
                              </span>
                              <span className="font-medium text-foreground truncate">{p.name}</span>
                            </div>
                            <span className="font-bold text-foreground tabular-nums shrink-0">
                              {p.quantity} terjual
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </div>

            <div className="p-4 border-t border-border mt-auto">
              <Link
                href="/inventory"
                className="text-xs font-semibold text-primary hover:underline flex items-center justify-between w-full"
              >
                <span>Lihat seluruh katalog inventori</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Data Sections: Recent Transactions & Low Stock SKU */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions Table */}
          <Card className="lg:col-span-2 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Transaksi Kasir Terkini
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Daftar transaksi penjualan terakhir yang tercatat
                </CardDescription>
              </div>
              <Link href="/pos">
                <Button variant="ghost" size="sm" className="text-xs h-8">
                  <span>Kasir POS</span>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingData ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : recentSales.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-border rounded-xl">
                  Belum ada transaksi penjualan tercatat di toko ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold">ID Transaksi</TableHead>
                        <TableHead className="text-xs font-bold">Waktu</TableHead>
                        <TableHead className="text-xs font-bold">Metode Bayar</TableHead>
                        <TableHead className="text-xs font-bold text-right">Total Transaksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSales.map((trx) => {
                        const method = trx.payments?.[0]?.payment_method || "cash";
                        return (
                          <TableRow key={trx.id} className="hover:bg-muted/40">
                            <TableCell>
                              <span className="font-semibold text-xs text-foreground">
                                TRX-{trx.id.toString().padStart(5, "0")}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(trx.occurred_at)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  method === "cash"
                                    ? "default"
                                    : method === "debt"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px] font-semibold uppercase tracking-wide"
                              >
                                {method === "debt" ? "Kasbon" : method === "qris" ? "QRIS" : method}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-xs sm:text-sm text-foreground tabular-nums">
                              {formatIDR(trx.total_amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Stok Menipis
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Produk dengan sisa stok 5 unit atau kurang
                </CardDescription>
              </div>
              {lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="text-[10px] font-bold">
                  {lowStockProducts.length} SKU
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingData ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-border rounded-xl">
                  Seluruh stok produk berada pada batas aman.
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.sku}</p>
                      </div>
                      <Badge
                        variant={p.current_stock === 0 ? "destructive" : "secondary"}
                        className="shrink-0 text-[11px] font-bold tabular-nums"
                      >
                        {p.current_stock === 0 ? "Habis" : `Sisa ${p.current_stock}`}
                      </Badge>
                    </div>
                  ))}
                  {lowStockProducts.length > 6 && (
                    <Link href="/inventory" className="block pt-1">
                      <Button variant="ghost" size="sm" className="w-full text-xs h-8">
                        +{lowStockProducts.length - 6} produk menipis lainnya
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
