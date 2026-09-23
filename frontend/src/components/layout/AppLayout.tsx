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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { stores, activeStore, setActiveStore, refreshStores } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [createStoreModalOpen, setCreateStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);
  const [storeError, setStoreError] = useState("");

  const navigation = [
    { name: "Ringkasan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Kasir POS", href: "/pos", icon: ShoppingCart },
    { name: "Stok & Katalog", href: "/inventory", icon: Package },
    { name: "Buku Kasbon", href: "/debts", icon: BookOpen },
    { name: "Pengeluaran", href: "/expenses", icon: Receipt },
    { name: "Pelanggan", href: "/customers", icon: Users },
    { name: "Laporan Keuangan", href: "/reports", icon: BarChart3 },
    { name: "WhatsApp Hub", href: "/whatsapp", icon: MessageSquare },
    { name: "AI Copilot", href: "/copilot", icon: Sparkles, badge: "AI" },
  ];

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      setStoreError("Nama toko tidak boleh kosong");
      return;
    }
    setStoreError("");
    setIsSubmittingStore(true);
    try {
      const res = await api.stores.create(newStoreName.trim(), newStoreAddress.trim());
      await refreshStores();
      if (res.store) {
        setActiveStore(res.store);
      }
      setNewStoreName("");
      setNewStoreAddress("");
      setCreateStoreModalOpen(false);
    } catch (err: unknown) {
      setStoreError(err instanceof Error ? err.message : "Gagal membuat toko");
    } finally {
      setIsSubmittingStore(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary-dark text-white font-serif italic text-base flex items-center justify-center shadow-glow">
            A
          </div>
          <div>
            <span className="font-medium text-sm tracking-tight block text-white">ArthaOS</span>
            <span className="text-[11px] text-slate-400 block truncate max-w-35 font-medium">
              {activeStore?.name || "Pilih Toko"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop Sidebar (Floating Glass) */}
      <aside className="hidden md:flex flex-col w-72 bg-black/20 backdrop-blur-2xl border-r border-white/5 shrink-0 h-screen sticky top-0 z-30">
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-white/5 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-3 w-full group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-serif italic text-base flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              A
            </div>
            <span className="font-medium text-lg tracking-tight text-white">
              ArthaOS.
            </span>
          </Link>
        </div>

        {/* Tenant Store Selector */}
        <div className="p-4 border-b border-white/5 relative">
          <button
            type="button"
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-left transition-all group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <StoreIcon className="w-4 h-4 text-primary shrink-0" />
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate">
                  {activeStore ? activeStore.name : "Pilih Toko"}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Store Dropdown Menu */}
          <AnimatePresence>
            {storeDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-4 right-4 mt-2 bg-slate-900 shadow-glass border border-white/10 py-2 z-50 rounded-xl overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveStore(s);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        activeStore?.id === s.id
                          ? "bg-white/10 text-white font-medium"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Building2 className={`w-4 h-4 shrink-0 ${activeStore?.id === s.id ? "text-primary" : "text-slate-500"}`} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 mt-1 pt-1 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreDropdownOpen(false);
                      setCreateStoreModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Toko Baru</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative group ${
                  isActive
                    ? "text-white font-medium bg-white/10 border border-white/5 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-glow"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {"badge" in item && item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/10 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="truncate mr-2">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || "Pengguna"}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-4/5 max-w-sm bg-slate-950 border-r border-white/10 h-full shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-serif italic text-sm flex items-center justify-center">
                    A
                  </div>
                  <span className="font-medium text-base text-white">ArthaOS.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 border-b border-white/5">
                <div className="text-xs font-medium text-slate-500 mb-1">Toko Aktif:</div>
                <div className="font-medium text-white text-base mb-4">
                  {activeStore?.name || "Belum ada toko"}
                </div>
                <button
                  className="w-full flex items-center justify-center gap-2 text-sm min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCreateStoreModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Buat Toko Baru
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-colors ${
                        isActive
                          ? "text-white font-medium bg-white/10"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-slate-500"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-white/5 flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-rose-400 rounded-lg bg-white/5 border border-white/10"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col p-4 md:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Create Store Modal */}
      <Modal
        isOpen={createStoreModalOpen}
        onClose={() => setCreateStoreModalOpen(false)}
        title="Buka Toko Baru"
        description="Daftarkan cabang atau outlet bisnis baru untuk mengelola transaksi & stok terpisah."
      >
        {/* We will style Modal later or assume it uses a dark theme inside */}
        <form onSubmit={handleCreateStore} className="space-y-4 pt-2">
          {storeError && (
            <div className="p-3 text-xs text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              {storeError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Toko / Outlet</label>
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              placeholder="Contoh: Toko Berkah Jaya"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Alamat / Lokasi (Opsional)</label>
            <input
              type="text"
              value={newStoreAddress}
              onChange={(e) => setNewStoreAddress(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              placeholder="Contoh: Jl. Sudirman No. 42"
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={() => setCreateStoreModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSubmittingStore}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isSubmittingStore ? "Menyimpan..." : "Simpan & Buka Toko"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

