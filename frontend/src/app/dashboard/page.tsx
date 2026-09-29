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
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR, formatDate } from "@/lib/utils";
import {
  Transaction,
  Product,
  ProfitLossReport,
  StockValuationReport,
  Debt,
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
import type { Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 24 } },
};

// KPI card data — maps to a single KPI block
interface KpiCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent: string;
  iconColor: string;
}

function KpiCard({ title, value, sub, icon: Icon, accent, iconColor }: KpiCardProps) {
  return (
    <Card className={`relative overflow-hidden border-l-2 ${accent}`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{title}</p>
            <p className="text-2xl font-semibold text-foreground tracking-tight truncate">
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-32 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore, isLoadingStores } = useStore();

  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [stockValuation, setStockValuation] = useState<StockValuationReport | null>(null);
  const [recentSales, setRecentSales] = useState<Transaction[]>([]);
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
    } else {
      setIsLoadingData(false);
    }
    return () => { mounted = false; };
  }, [activeStore, loadDashboardData]);

  // Loading state (R-27)
  if (authLoading || isLoadingStores) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Empty state — no store selected (R-27)
  if (!activeStore) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto mt-20 text-center">
          <div className="w-12 h-12 rounded-none bg-muted flex items-center justify-center mx-auto mb-4">
            <StoreIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Belum ada toko terpilih
          </h2>
          <p className="text-sm text-muted-foreground">
            Pilih toko dari sidebar, atau buat toko pertama Anda untuk mulai.
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

  const kpis: KpiCardProps[] = [
    {
      title: "Omzet Kotor",
      value: formatIDR(profitLoss?.gross_sales ?? 0),
      sub: `HPP: ${formatIDR(profitLoss?.cogs ?? 0)}`,
      icon: TrendingUp,
      accent: "border-l-foreground/20",
      iconColor: "bg-muted text-muted-foreground",
    },
    {
      title: "Laba Bersih",
      value: formatIDR(profitLoss?.net_profit ?? 0),
      sub: `Beban: ${formatIDR(profitLoss?.expenses ?? 0)}`,
      icon: TrendingUp,
      accent: "border-l-primary",
      iconColor: "bg-primary/10 text-primary",
    },
    {
      title: "Nilai Stok",
      value: formatIDR(stockValuation?.total_asset_retail ?? 0),
      sub: `${products.length} SKU terdaftar`,
      icon: Package,
      accent: "border-l-blue-500/50",
      iconColor: "bg-blue-500/10 text-blue-400",
    },
    {
      title: "Kasbon Tertunda",
      value: formatIDR(totalUnpaidDebt),
      sub: `${unpaidCount} tagihan aktif`,
      icon: TrendingDown,
      accent: unpaidCount > 0 ? "border-l-destructive" : "border-l-foreground/10",
      iconColor: unpaidCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
    },
  ];

  return (
    <AppLayout>
      <motion.div
        className="space-y-6 max-w-screen-xl"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Page header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Ringkasan
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeStore.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDashboardData(activeStore.id)}
              disabled={isLoadingData}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
              Perbarui
            </Button>
            <Button size="sm" render={<Link href="/pos" />}><ShoppingCart className="w-3.5 h-3.5 mr-2" />
                Buka Kasir
              </Button>
          </div>
        </motion.div>

        {/* Error state (R-27) */}
        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                {error}
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
          </motion.div>
        )}

        {/* KPI Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoadingData
            ? [...Array(4)].map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/pos", label: "Kasir Baru", desc: "Scan & checkout", icon: ShoppingCart },
            { href: "/inventory", label: "Kelola Stok", desc: "Mutasi & opname", icon: Package },
            { href: "/expenses", label: "Catat Beban", desc: "Pengeluaran harian", icon: Receipt },
            { href: "/debts", label: "Tagih Kasbon", desc: "Kirim via WhatsApp", icon: BookOpen },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Data sections */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent transactions */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Transaksi Terkini</CardTitle>
                <CardDescription className="text-xs mt-0.5">8 transaksi terakhir</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" render={<Link href="/pos" />}>
                  Lihat semua
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingData ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : recentSales.length === 0 ? (
                // Empty state (R-27)
                <div className="py-10 text-center text-sm text-muted-foreground border border-solid border-border rounded-lg">
                  Belum ada transaksi hari ini
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">ID Transaksi</TableHead>
                      <TableHead className="text-xs">Metode</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((trx) => {
                      const method = trx.payments?.[0]?.payment_method || "cash";
                      return (
                        <TableRow key={trx.id}>
                          <TableCell>
                            <span className="font-medium text-xs text-foreground">
                              TRX-{trx.id.toString().padStart(5, "0")}
                            </span>
                            <br />
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(trx.occurred_at)}
                            </span>
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
                              {method === "debt" ? "Kasbon" : method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatIDR(trx.total_amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Low stock alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Stok Menipis</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Produk dengan stok &le; 5
                </CardDescription>
              </div>
              {lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {lowStockProducts.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingData ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                </div>
              ) : lowStockProducts.length === 0 ? (
                // Empty / good state (R-27)
                <div className="py-10 text-center text-sm text-muted-foreground border border-solid border-border rounded-lg">
                  Semua stok aman
                </div>
              ) : (
                <div className="space-y-1.5">
                  {lowStockProducts.slice(0, 7).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-md bg-card hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.sku}</p>
                      </div>
                      <Badge
                        variant={p.current_stock === 0 ? "destructive" : "secondary"}
                        className="shrink-0 text-[11px] font-bold"
                      >
                        {p.current_stock === 0 ? "Habis" : `Sisa ${p.current_stock}`}
                      </Badge>
                    </div>
                  ))}
                  {lowStockProducts.length > 7 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-1" render={<Link href="/inventory" />}>
                        +{lowStockProducts.length - 7} produk lainnya
                      </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
