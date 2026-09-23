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
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-slate-900 font-sans selection:bg-emerald-900 selection:text-white">
      {/* Mobile Top Header (Pure Light) */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-950 text-white font-serif italic text-base flex items-center justify-center">
            A
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight block text-slate-950">ArthaOS.</span>
            <span className="text-[11px] text-slate-500 block truncate max-w-35 font-medium">
              {activeStore?.name || "Pilih Toko"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none rounded"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop Sidebar (Pure Light, 1px borders) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-50 border-r border-slate-200 shrink-0 h-screen sticky top-0">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded group w-full">
            <div className="w-7 h-7 bg-slate-950 text-white font-serif italic text-sm flex items-center justify-center group-hover:bg-emerald-900 transition-colors">
              A
            </div>
            <span className="font-semibold text-base tracking-tight text-slate-950">
              ArthaOS.
            </span>
          </Link>
        </div>

        {/* Tenant Store Selector */}
        <div className="p-3 border-b border-slate-200 relative">
          <button
            type="button"
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-white border border-slate-200 hover:border-slate-300 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <StoreIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0 transition-colors" />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">
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
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-3 right-3 mt-1.5 bg-white shadow-lg border border-slate-200 py-1.5 z-50 rounded"
              >
                <div className="max-h-48 overflow-y-auto">
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveStore(s);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                        activeStore?.id === s.id
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${activeStore?.id === s.id ? "text-emerald-700" : "text-slate-400"}`} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 mt-1 pt-1 px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreDropdownOpen(false);
                      setCreateStoreModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-900 font-medium hover:bg-slate-50 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Toko Baru</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded text-[13px] transition-colors relative ${
                  isActive
                    ? "text-slate-950 font-semibold bg-white border border-slate-200 shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-950 border border-transparent"
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-700 rounded-r-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-emerald-700" : "text-slate-400"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {"badge" in item && item.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between group">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-slate-950 truncate">
                {user?.name || "Pengguna"}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Pure Light) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm flex flex-col"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-slate-950 text-white font-serif italic text-sm flex items-center justify-center">
                    A
                  </div>
                  <span className="font-semibold text-sm text-slate-950">ArthaOS.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-slate-500 hover:text-slate-950"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="text-[11px] font-medium text-slate-500 mb-1">Toko Aktif:</div>
                <div className="font-semibold text-slate-950 text-sm mb-3">
                  {activeStore?.name || "Belum ada toko"}
                </div>
                <Button
                  variant="outline"
                  className="w-full text-xs min-h-[40px] rounded-sm bg-white border-slate-200"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCreateStoreModalOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Buat Toko Baru
                </Button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded text-sm transition-colors ${
                        isActive
                          ? "text-slate-950 font-semibold bg-slate-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="text-sm font-semibold text-slate-950 truncate">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded bg-white border border-slate-200 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-1 flex flex-col"
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
        <form onSubmit={handleCreateStore} className="space-y-4 pt-2">
          {storeError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded">
              {storeError}
            </div>
          )}
          <Input
            label="Nama Toko / Outlet"
            placeholder="Contoh: Toko Berkah Jaya"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Alamat / Lokasi (Opsional)"
            placeholder="Contoh: Jl. Sudirman No. 42, Jakarta Pusat"
            value={newStoreAddress}
            onChange={(e) => setNewStoreAddress(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateStoreModalOpen(false)}
              className="rounded"
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" className="rounded bg-slate-950 text-white hover:bg-slate-800" isLoading={isSubmittingStore}>
              Simpan & Buka Toko
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
