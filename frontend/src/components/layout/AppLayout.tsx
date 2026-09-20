"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    { name: "AI Copilot & Advisor", href: "/copilot", icon: Sparkles, badge: "AI" },
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-base shadow-xs">
            A
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">ArthaOS</span>
            <span className="text-[11px] text-slate-400 block truncate max-w-35">
              {activeStore?.name || "Pilih Toko"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 select-none shrink-0 h-screen sticky top-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-base shadow-xs">
              A
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-none">
                ArthaOS
              </h1>
              <span className="text-[11px] text-slate-400 tracking-wide uppercase font-medium">
                Business Engine
              </span>
            </div>
          </div>
        </div>

        {/* Tenant Store Selector */}
        <div className="p-3 border-b border-slate-800 relative">
          <button
            type="button"
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <StoreIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {activeStore ? activeStore.name : "Pilih Toko"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {stores.length} toko terdaftar
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Store Dropdown Menu */}
          {storeDropdownOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1.5 z-50">
              <div className="max-h-48 overflow-y-auto">
                {stores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveStore(s);
                      setStoreDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                      activeStore?.id === s.id
                        ? "bg-emerald-600/20 text-emerald-400 font-semibold"
                        : "text-slate-300 hover:bg-slate-700/60"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-700 mt-1 pt-1 px-2">
                <button
                  type="button"
                  onClick={() => {
                    setStoreDropdownOpen(false);
                    setCreateStoreModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-emerald-400 font-medium hover:bg-slate-700/50 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Toko Baru</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {"badge" in item && item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || "Pengguna"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
                A
              </div>
              <span className="font-bold text-sm">ArthaOS Navigation</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 bg-slate-900 border-b border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Toko Aktif:</div>
            <div className="font-semibold text-white text-sm">
              {activeStore?.name || "Belum ada toko"}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700"
              onClick={() => {
                setMobileMenuOpen(false);
                setCreateStoreModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Buat Toko Baru
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-900">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-emerald-600 text-white font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-white">
            <div className="truncate">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Keluar
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>

      {/* Create Store Modal */}
      <Modal
        isOpen={createStoreModalOpen}
        onClose={() => setCreateStoreModalOpen(false)}
        title="Buka Toko Baru"
        description="Daftarkan cabang atau outlet bisnis baru untuk mengelola transaksi & stok terpisah."
      >
        <form onSubmit={handleCreateStore} className="space-y-4">
          {storeError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateStoreModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingStore}>
              Simpan & Buka Toko
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
