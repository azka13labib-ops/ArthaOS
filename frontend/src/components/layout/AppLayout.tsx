"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Receipt,
  Users,
  BarChart3,
  MessageSquare,
  Store as StoreIcon,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronDown,
  Building2,
  Sparkles,
  ChevronsUpDown,
  Check,
  Wheat,
  ChefHat,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";

// Navigation items — every href must have a real destination (R-24)
const navigation = [
  { name: "Ringkasan", href: "/dashboard", icon: LayoutDashboard, group: "Utama" },
  { name: "Kasir POS", href: "/pos", icon: ShoppingCart, group: "Utama" },
  { name: "Stok Produk", href: "/inventory", icon: Package, group: "Operasional" },
  { name: "Bahan Baku", href: "/raw-materials", icon: Wheat, group: "Operasional" },
  { name: "Resep (BOM)", href: "/recipes", icon: ChefHat, group: "Operasional" },
  { name: "Buku Kasbon", href: "/debts", icon: BookOpen, group: "Operasional" },
  { name: "Pengeluaran", href: "/expenses", icon: Receipt, group: "Operasional" },
  { name: "Pelanggan", href: "/customers", icon: Users, group: "Operasional" },
  { name: "Laporan", href: "/reports", icon: BarChart3, group: "Analitik" },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare, group: "Analitik" },
  {
    name: "AI Copilot",
    href: "/copilot",
    icon: Sparkles,
    group: "Analitik",
    badge: "Baru",
  },
];

const navGroups = ["Utama", "Operasional", "Analitik"];

function AppSidebarInner({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { stores, activeStore, setActiveStore, refreshStores } = useStore();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeError, setStoreError] = useState("");

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      setStoreError("Nama toko tidak boleh kosong");
      return;
    }
    setStoreError("");
    setIsSubmitting(true);
    try {
      const res = await api.stores.create(newStoreName.trim(), newStoreAddress.trim());
      await refreshStores();
      if (res.store) setActiveStore(res.store);
      setNewStoreName("");
      setNewStoreAddress("");
      setCreateStoreOpen(false);
    } catch (err: unknown) {
      setStoreError(err instanceof Error ? err.message : "Gagal membuat toko");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const userInitial = user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        {/* Brand */}
        <SidebarHeader className="h-14 border-b border-sidebar-border px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 h-full"
            aria-label="ArthaOS beranda"
          >
            {/* Logo mark — product name as text, no generated asset (R-23) */}
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 text-primary-foreground font-bold text-sm">
              A
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-sm text-foreground tracking-tight">
                ArthaOS
              </span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent className="py-2">
          {/* Store Selector */}
          <div className="px-2 mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-label="Ganti toko aktif">
                  <StoreIcon className="w-4 h-4 text-primary shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate text-xs font-medium">
                        {activeStore?.name ?? "Pilih toko"}
                      </span>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </>
                  )}
                </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Toko Anda
                </div>
                <DropdownMenuSeparator />
                {stores.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => setActiveStore(s)}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 truncate">{s.name}</span>
                    {activeStore?.id === s.id && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setCreateStoreOpen(true)}
                  className="text-primary focus:text-primary"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Toko baru
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nav Groups */}
          {navGroups.map((group) => {
            const items = navigation.filter((n) => n.group === group);
            return (
              <SidebarGroup key={group} className="px-2 py-1">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1">
                    {group}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname?.startsWith(`${item.href}/`);
                      return (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton isActive={isActive} tooltip={item.name} render={<Link href={item.href} className="relative" />}>
                              <item.icon className="w-4 h-4 shrink-0" />
                              {!isCollapsed && (
                                <>
                                  <span className="flex-1">{item.name}</span>
                                  {"badge" in item && item.badge && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4 px-1.5 font-semibold"
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {isActive && (
                                <motion.div
                                  layoutId="sidebarActiveIndicator"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
                                  transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30,
                                  }}
                                />
                              )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        {/* User footer */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-xs font-medium text-foreground truncate leading-tight">
                        {user?.name ?? "Pengguna"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </>
                )}
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Create Store Dialog */}
      <Dialog open={createStoreOpen} onOpenChange={setCreateStoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Toko Baru</DialogTitle>
            <DialogDescription>
              Daftarkan cabang atau outlet bisnis untuk stok dan transaksi terpisah.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStore} className="space-y-4 pt-2">
            {storeError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {storeError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="store-name">Nama Toko</Label>
              <Input
                id="store-name"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Contoh: Toko Berkah Jaya"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-address">Alamat (Opsional)</Label>
              <Input
                id="store-address"
                value={newStoreAddress}
                onChange={(e) => setNewStoreAddress(e.target.value)}
                placeholder="Contoh: Jl. Sudirman No. 42"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateStoreOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Toko"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mobile top bar — shown only on small screens
function MobileHeader({
  onMenuOpen,
}: {
  onMenuOpen: () => void;
}) {
  const { activeStore } = useStore();
  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
          A
        </div>
        <span className="font-semibold text-sm text-foreground">ArthaOS</span>
        {activeStore && (
          <span className="text-xs text-muted-foreground truncate max-w-32">
            / {activeStore.name}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onMenuOpen}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Buka menu navigasi"
      >
        <Menu className="w-5 h-5" />
      </button>
    </header>
  );
}

// Mobile drawer overlay
function MobileDrawer({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const { user, logout } = useAuth();
  const { activeStore, stores, setActiveStore } = useStore();
  const router = useRouter();
  const [createStoreOpen, setCreateStoreOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.nav
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                  A
                </div>
                <span className="font-semibold text-sm text-foreground">ArthaOS</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active store */}
            <div className="px-4 py-3 border-b border-sidebar-border shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Toko Aktif
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                    <StoreIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="flex-1 text-left truncate font-medium">
                      {activeStore?.name ?? "Pilih toko"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60">
                  {stores.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onSelect={() => setActiveStore(s)}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="flex-1 truncate">{s.name}</span>
                      {activeStore?.id === s.id && (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setCreateStoreOpen(true)}
                    className="text-primary"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Toko baru
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {navGroups.map((group) => {
                const items = navigation.filter((n) => n.group === group);
                return (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      {group}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const isActive =
                          pathname === item.href ||
                          pathname?.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px] ${
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            <item.icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? "text-primary" : ""
                              }`}
                            />
                            <span className="flex-1">{item.name}</span>
                            {"badge" in item && item.badge && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-sidebar-border shrink-0 flex items-center gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name ?? "Pengguna"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Keluar dari akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground w-full">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <AppSidebarInner pathname={pathname ?? ""} />
        </div>

        {/* Right: header + main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile drawer */}
        <MobileDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          pathname={pathname ?? ""}
        />
      </div>
    </SidebarProvider>
  );
}
