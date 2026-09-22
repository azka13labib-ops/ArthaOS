"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Store,
  Sparkles,
  Layers,
  Receipt,
  RotateCcw,
  Clock,
  ChevronRight,
  Calculator,
  Check,
  Smartphone,
  BarChart2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function HomePage() {
  const { token } = useAuth();
  const { activeStore } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<"pos" | "kasbon" | "whatsapp" | "copilot">("pos");

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Banner for Authenticated Store Owners */}
      {token && (
        <div className="bg-[#0f0f0f] text-slate-200 text-xs py-2 px-4 border-b border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-normal text-slate-300">
                Sesi aktif pemilik toko: <strong className="font-semibold text-white">{activeStore?.name || "Toko Utama"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <Link
                href="/dashboard"
                className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-1"
              >
                Buka Dashboard <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Link>
              <span className="text-slate-700">|</span>
              <Link
                href="/pos"
                className="text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-1"
              >
                Layar Kasir POS
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-semibold text-base flex items-center justify-center shadow-xs">
              A
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-slate-950 block leading-none">
                ArthaOS
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-[0.08em] uppercase block mt-0.5">
                Sistem Operasi Ritel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection("fitur-pos")}
              className="hover:text-slate-950 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              Kasir POS
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("fitur-stok")}
              className="hover:text-slate-950 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              Inventori FIFO
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("fitur-kasbon")}
              className="hover:text-slate-950 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              Buku Kasbon
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("fitur-whatsapp")}
              className="hover:text-slate-950 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              WhatsApp Hub
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("copilot")}
              className="hover:text-slate-950 transition-colors py-1 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
              AI Copilot
            </button>
          </nav>

          {/* Desktop Auth CTAs (Max 1 primary accent CTA on header) */}
          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <Link href="/dashboard">
                <Button variant="primary" size="sm" className="bg-emerald-700 hover:bg-emerald-800 font-semibold text-xs h-9 px-4">
                  Buka Dashboard Toko
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="text-xs h-9 font-medium text-slate-700 border-slate-300 hover:bg-slate-50">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm" className="bg-emerald-700 hover:bg-emerald-800 font-semibold text-xs h-9 px-4">
                    Daftar Toko
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button (Touch target ≥44px) */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-11 min-h-11 flex items-center justify-center p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" strokeWidth={1.75} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-3 shadow-sm animate-in slide-in-from-top-1">
            <div className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
              <button
                type="button"
                onClick={() => scrollToSection("fitur-pos")}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 min-h-11 flex items-center"
              >
                1. Kasir POS Kilat
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("fitur-stok")}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 min-h-11 flex items-center"
              >
                2. Manajemen Inventori & FIFO
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("fitur-kasbon")}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 min-h-11 flex items-center"
              >
                3. Buku Kasbon Pelanggan
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("fitur-whatsapp")}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 min-h-11 flex items-center"
              >
                4. WhatsApp Hub & Otomasi Order
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("copilot")}
                className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 min-h-11 flex items-center gap-1.5 text-emerald-800"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" strokeWidth={1.75} /> 5. Artha AI Copilot
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {token ? (
                <Link href="/dashboard" className="w-full">
                  <Button variant="primary" className="w-full justify-center min-h-11 font-semibold text-sm bg-emerald-700 hover:bg-emerald-800">
                    Masuk ke Dashboard Toko
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full justify-center min-h-11 font-medium text-sm border-slate-300">
                      Masuk ke Akun
                    </Button>
                  </Link>
                  <Link href="/register" className="w-full">
                    <Button variant="primary" className="w-full justify-center min-h-11 font-semibold text-sm bg-emerald-700 hover:bg-emerald-800">
                      Daftar Akun Baru
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Content (7 Columns) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Category Kicker with 0.08em tracking */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-medium text-emerald-800 tracking-[0.08em] uppercase">
                <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" strokeWidth={1.75} />
                <span>Sistem Operasi Bisnis Ritel</span>
              </div>

              {/* Display H1 with tight tracking and line-height */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-950 tracking-tight leading-[1.15]">
                Kelola Kasir, Inventori Stok, dan Kasbon Toko Secara Terintegrasi.
              </h1>

              {/* Body Copy with max-w-[65ch] line length */}
              <p className="text-base text-slate-600 leading-relaxed max-w-[65ch] font-normal">
                ArthaOS mencatat transaksi penjualan kilat, mengontrol pergerakan stok barang FIFO, mengelola buku piutang kasbon pelanggan, serta mengekstrak pesanan belanja langsung dari percakapan WhatsApp.
              </p>

              {/* CTA Group: Max 1 Primary Accent CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {token ? (
                  <Link href="/pos" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto min-h-12 px-6 bg-emerald-700 hover:bg-emerald-800 font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" strokeWidth={1.75} /> Buka Layar Kasir POS
                    </Button>
                  </Link>
                ) : (
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto min-h-12 px-6 bg-emerald-700 hover:bg-emerald-800 font-semibold text-sm shadow-xs flex items-center justify-center gap-2"
                    >
                      Daftar Toko Gratis <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                    </Button>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => scrollToSection("perbandingan")}
                  className="min-h-12 px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  Bandingkan dengan Cara Manual
                </button>
              </div>

              {/* Functional Highlights List */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-700">Multi-Metode (Tunai, QRIS, Kasbon)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-700">Audit Stok FIFO & Peringatan Habis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-700">Ekstraksi Pesanan WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Right Live POS Interface Simulator (5 Columns) */}
            <div className="lg:col-span-5">
              <div className="border border-slate-200/90 bg-white shadow-sm overflow-hidden rounded-2xl">
                {/* Header Mockup */}
                <div className="px-4 py-3 bg-[#0f0f0f] text-white flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span className="text-[11px] font-mono text-slate-400 ml-1">
                      pos.artha-os.id
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Kasir Siap
                  </span>
                </div>

                {/* Body Mockup */}
                <div className="p-4 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900">Retail Nusantara (Outlet Utama)</p>
                      <p className="text-[11px] text-slate-500 font-normal">Struk #TRX-9482 • Shift Pagi</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      [F2] Cari Item
                    </span>
                  </div>

                  {/* Sample Items in Cart */}
                  <div className="space-y-2">
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200/70">
                      <div>
                        <p className="font-medium text-slate-900">Kopi Susu Gula Aren 250ml</p>
                        <p className="text-[11px] text-slate-500">2 pcs x Rp 18.000 (Stok: 42)</p>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">Rp 36.000</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200/70">
                      <div>
                        <p className="font-medium text-slate-900">Beras Pandan Wangi 5kg</p>
                        <p className="text-[11px] text-slate-500">1 sak x Rp 75.000 (FIFO Batch A)</p>
                      </div>
                      <span className="font-mono font-semibold text-slate-900">Rp 75.000</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-1">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.08em] block mb-1.5">
                      Pilihan Metode Pembayaran:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] text-center font-medium">
                      <div className="py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-md">
                        Tunai
                      </div>
                      <div className="py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
                        QRIS Instan
                      </div>
                      <div className="py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
                        Kasbon Toko
                      </div>
                    </div>
                  </div>

                  {/* Subtotal and Settle Bar */}
                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-[0.08em]">Total Belanja</span>
                      <span className="text-base font-semibold text-slate-950 font-mono">Rp 111.000</span>
                    </div>
                    <Link href="/pos">
                      <Button size="sm" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 font-semibold text-xs h-8 px-3.5">
                        [F8] Selesaikan Transaksi
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: COMPARISON AGAINST STATUS QUO (Soul / Unconventional Section) */}
      <section id="perbandingan" className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-[0.08em]">
              Efisiensi Nyata
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight leading-[1.15]">
              Perbandingan: Pembukuan Manual Kertas vs ArthaOS
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-normal max-w-[65ch]">
              Mengapa beralih ke sistem digital terintegrasi memberikan dampak langsung pada pengurangan selisih kas dan piutang tak tertagih.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Quo Card */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-semibold text-sm text-slate-800">Cara Lama: Buku Nota & Kertas</h3>
                <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Rentan Bocor & Lambat
                </span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span><strong>Stok Sering Selisih:</strong> Barang keluar tidak tercatat rapi, baru sadar habis ketika pembeli sudah di depan meja kasir.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span><strong>Kasbon Tercecer:</strong> Hutang pelanggan dicatat pada secarik kertas nota yang mudah robek atau terselip.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span><strong>Pesanan WhatsApp Terlewat:</strong> Pesanan menumpuk di chat pribadi, kasir lupa mengemas atau salah memberi total harga.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span><strong>Rekap Tutup Toko Makan Waktu:</strong> Menghitung ulang uang fisik dan mencocokkan nota bon hingga larut malam.</span>
                </li>
              </ul>
            </div>

            {/* ArthaOS Card */}
            <div className="p-6 bg-emerald-50/40 border border-emerald-200/90 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
                <h3 className="font-semibold text-sm text-emerald-950">Standar ArthaOS Terintegrasi</h3>
                <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  Akurat & Otomatis
                </span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} />
                  <span><strong>Stok FIFO Otomatis:</strong> Setiap checkout langsung memotong inventori dan menghitung modal HPP batch secara presisi.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} />
                  <span><strong>Buku Kasbon Digital:</strong> Saldo piutang tercatat per nama pelanggan dengan tautan tagihan WhatsApp otomatis.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} />
                  <span><strong>Ekstraksi Pesanan WhatsApp:</strong> Teks chat belanja dikonversi otomatis menjadi transaksi kasir siap bungkus.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} />
                  <span><strong>Laporan Shift Real-Time:</strong> Rekap penjualan harian, laba kotor, dan rincian metode pembayaran dalam 1 klik.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 4 PILAR OPERASIONAL DETAIL */}
      <section className="py-14 sm:py-20 bg-[#fafafa] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-[0.08em]">
              Modul Operasional
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight leading-[1.15]">
              Empat Pilar Utama Operasional Toko
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-[65ch] font-normal">
              Setiap modul dirancang dari kebutuhan faktual ritel: kecepatan antrean kasir, akurasi mutasi barang, tertib kasbon, dan otomasi pesanan digital.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Kasir POS */}
            <div id="fitur-pos" className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-base text-slate-950">1. Kasir POS Cepat</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pencarian barcode cepat, katalog visual, kalkulasi kembalian otomatis, serta cetak struk fisik thermal 80mm atau struk digital WhatsApp.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Tunai, QRIS, & Kasbon</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Shortcut keyboard kasir cepat</span>
                </div>
              </div>
            </div>

            {/* 2. Inventori FIFO */}
            <div id="fitur-stok" className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Package className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-base text-slate-950">2. Inventori & FIFO</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pantau stok berjalan, lacak modal HPP per batch pembelian supplier (FIFO), serta terima notifikasi otomatis saat stok mendekati batas kritis.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Perhitungan HPP akurat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Multi-outlet per cabang toko</span>
                </div>
              </div>
            </div>

            {/* 3. Buku Kasbon */}
            <div id="fitur-kasbon" className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-base text-slate-950">3. Buku Kasbon</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Solusi digital untuk pencatatan hutang belanja pelanggan warung atau toko. Catat nominal kasbon, riwayat cicilan, dan status pelunasan.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Pelacakan saldo per kontak</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Tautan pengingat WhatsApp santun</span>
                </div>
              </div>
            </div>

            {/* 4. WhatsApp Hub */}
            <div id="fitur-whatsapp" className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-base text-slate-950">4. WhatsApp Hub</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Terima chat belanja pelanggan, ekstrak daftar barang secara otomatis menjadi transaksi draft, dan kirim struk digital tanpa biaya kertas.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Ekstraksi chat jadi transaksi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Broadcast promo tertarget</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: INTERACTIVE WORKFLOW DEMO (Tabbed Explorer) */}
      <section className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-[0.08em]">
              Alur Kerja Nyata
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight leading-[1.15]">
              Sederhana, Cepat, dan Siap Digunakan
            </h2>
            <p className="text-sm text-slate-600 max-w-[65ch] mx-auto font-normal">
              Pilih alur di bawah untuk melihat bagaimana sistem menangani transaksi harian toko secara sistematis.
            </p>
          </div>

          {/* Workflow Tab Selector */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setActiveWorkflowTab("pos")}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors min-h-11 ${
                activeWorkflowTab === "pos"
                  ? "bg-[#0f0f0f] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1. Alur Kasir POS
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkflowTab("kasbon")}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors min-h-11 ${
                activeWorkflowTab === "kasbon"
                  ? "bg-[#0f0f0f] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              2. Alur Buku Kasbon
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkflowTab("whatsapp")}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors min-h-11 ${
                activeWorkflowTab === "whatsapp"
                  ? "bg-[#0f0f0f] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              3. Alur Order WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkflowTab("copilot")}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors min-h-11 ${
                activeWorkflowTab === "copilot"
                  ? "bg-[#0f0f0f] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              4. Alur Konsultasi AI
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="max-w-4xl mx-auto p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-2xl">
            {activeWorkflowTab === "pos" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Pilih Barang & Qty</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Ketik nama item atau scan barcode. Keranjang otomatis mengakumulasi subtotal dan memeriksa ketersediaan stok berjalan.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Pilih Cara Bayar</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Pilih Tunai (kalkulasi kembalian otomatis), scan QRIS, atau catat sebagai kasbon dengan memilih nama kontak pelanggan.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Struk & Potong Stok</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Sistem mencetak struk kasir, memotong stok inventori secara real-time, dan membukukan laba kotor transaksi.
                  </p>
                </div>
              </div>
            )}

            {activeWorkflowTab === "kasbon" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Catat Piutang Pelanggan</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Pilih nama pelanggan terdaftar pada saat checkout POS. Tagihan otomatis masuk ke buku kasbon digital toko.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Pantau & Tagih via WA</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Lihat saldo tertahan per pelanggan dan kirim rincian nota tagihan santun langsung ke nomor WhatsApp pelanggan.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Catat Cicilan / Pelunasan</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Input pembayaran cicilan bertahap. Sistem mencatat riwayat pelunasan hingga status tagihan lunas secara otomatis.
                  </p>
                </div>
              </div>
            )}

            {activeWorkflowTab === "whatsapp" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Terima Chat Belanja</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Pelanggan mengirim daftar barang belanjaan sehari-hari melalui pesan WhatsApp ke nomor resmi toko Anda.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Ekstraksi Otomatis AI</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    ArthaOS membedah teks chat, mencocokkan nama barang dan kuantitas ke database katalog produk toko Anda.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Konfirmasi Kasir 1-Klik</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Kasir meninjau ringkasan item dalam satu klik, barang siap dikemas, dan total tagihan dikirim balik ke pembeli.
                  </p>
                </div>
              </div>
            )}

            {activeWorkflowTab === "copilot" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Tanya Kinerja Toko</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Ajukan pertanyaan seputar estimasi laba kotor, produk lambat terjual, atau evaluasi resiko kasbon pelanggan.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Analisis Data Riil</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    AI membaca database transaksi riil toko Anda dan menyusun langkah rekomendasi bernomor yang dapat dieksekusi.
                  </p>
                </div>
                <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 font-semibold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">Eksekusi Keputusan</h3>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    Ambil tindakan cepat: tambah stok barang laris, sesuaikan margin harga jual, atau siarkan promo WhatsApp.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5: ARTHA AI COPILOT SPOTLIGHT (`#copilot`) */}
      <section id="copilot" className="py-14 sm:py-20 bg-[#0f0f0f] text-slate-100 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Description (6 Columns) */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-mono uppercase tracking-[0.08em] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full inline-block">
                Konsultan Finansial Ritel
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.15]">
                Artha AI Copilot: Analisis Operasional dan Keuangan Toko
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed font-normal max-w-[65ch]">
                Membaca data riil transaksi, perputaran inventori, dan buku kasbon untuk memberikan estimasi laba bersih, evaluasi risiko piutang, serta saran promosi tertarget tanpa emotikon yang tidak perlu.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl space-y-1">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> Batasan Domain Bisnis Ketat
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    AI difokuskan secara disiplin pada operasional toko ritel dan menolak perintah pembuatan kode pemrograman atau topik di luar manajemen toko.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl space-y-1">
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" strokeWidth={1.75} /> Sistem Memory Percakapan Multi-Turn
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    AI mengingat konteks pertanyaan Anda sebelumnya sehingga dapat melakukan konsultasi finansial bertahap secara akurat.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link href={token ? "/copilot" : "/login"}>
                  <Button variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-5">
                    Buka Workspace AI Copilot <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.75} />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Chat Demo Box (6 Columns) */}
            <div className="lg:col-span-6">
              <div className="p-4 sm:p-5 bg-black/60 border border-white/10 rounded-2xl space-y-3.5 shadow-xl text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-semibold text-xs">
                      <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Konsultasi Finansial Toko</p>
                      <p className="text-[10px] text-slate-400">Memory Aktif • Data Toko Real-Time</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                    Llama 3.3 Engine
                  </span>
                </div>

                {/* Turn 1 User */}
                <div className="flex justify-end">
                  <div className="bg-emerald-800 text-white rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%] text-xs font-normal">
                    Berapa total omset dan kasbon toko saat ini?
                  </div>
                </div>

                {/* Turn 1 AI */}
                <div className="flex justify-start">
                  <div className="bg-[#18181b] border border-white/10 text-slate-200 rounded-2xl rounded-tl-none p-3.5 max-w-[90%] text-xs space-y-1.5 leading-relaxed font-normal">
                    <p className="font-semibold text-emerald-400">Laporan Keuangan Toko:</p>
                    <p>• Total Omset Berjalan: Rp 1.475.000 (18 transaksi)</p>
                    <p>• Kasbon Tertahan: Rp 454.500 (3 pelanggan)</p>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Rekomendasi: Lakukan penagihan kasbon yang mendekati jatuh tempo untuk menjaga likuiditas stok barang.
                    </p>
                  </div>
                </div>

                {/* Turn 2 User (Context Memory) */}
                <div className="flex justify-end">
                  <div className="bg-emerald-800 text-white rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%] text-xs font-normal">
                    Dari kasbon itu, berikan saran tindakan penagihannya
                  </div>
                </div>

                {/* Turn 2 AI */}
                <div className="flex justify-start">
                  <div className="bg-[#18181b] border border-white/10 text-slate-200 rounded-2xl rounded-tl-none p-3.5 max-w-[90%] text-xs space-y-1.5 leading-relaxed font-normal">
                    <p className="font-semibold text-emerald-400">Langkah Penagihan Kasbon (Rp 454.500):</p>
                    <p>1. Kirim rincian nota via WhatsApp Hub kepada pelanggan bersangkutan.</p>
                    <p>2. Tawarkan opsi pembayaran parsial (cicilan) mulai Rp 50.000.</p>
                    <p>3. Batasi transaksi kasbon baru sampai tagihan lama diselesaikan.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: CONVERSION / CTA */}
      <section className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-[0.08em] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block">
            Mulai Penggunaan
          </span>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-950 max-w-2xl mx-auto leading-[1.15]">
            Mulai Rapikan Transaksi Kasir dan Inventori Toko Anda Hari Ini
          </h2>

          <p className="text-sm text-slate-600 max-w-[60ch] mx-auto leading-relaxed font-normal">
            Daftarkan toko Anda, input katalog produk, dan nikmati kemudahan mencatat transaksi kasir secara terintegrasi tanpa biaya langganan tersembunyi.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            {token ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto min-h-12 px-7 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm">
                  Buka Dashboard Toko Sekarang
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto min-h-12 px-7 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm">
                    Daftar Akun Toko Baru
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto min-h-12 px-6 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-medium text-sm">
                    Masuk ke Akun
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-[#0f0f0f] text-slate-400 text-xs py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Col */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center">
                  A
                </div>
                <span className="font-semibold text-white text-sm tracking-tight">ArthaOS</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Sistem operasi terpadu: Point of Sale, manajemen inventori FIFO, buku kasbon pelanggan, dan otomasi WhatsApp untuk ritel modern.
              </p>
            </div>

            {/* Nav Col 1: Modul Aplikasi */}
            <div className="space-y-2.5">
              <p className="font-semibold text-slate-200 text-xs uppercase tracking-[0.08em]">Modul Aplikasi</p>
              <ul className="space-y-2 text-xs font-normal">
                <li>
                  <Link href="/pos" className="hover:text-white transition-colors">
                    Kasir POS Kilat
                  </Link>
                </li>
                <li>
                  <Link href="/inventory" className="hover:text-white transition-colors">
                    Manajemen Stok FIFO
                  </Link>
                </li>
                <li>
                  <Link href="/debts" className="hover:text-white transition-colors">
                    Buku Kasbon Pelanggan
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="hover:text-white transition-colors">
                    Laporan Laba Rugi Shift
                  </Link>
                </li>
              </ul>
            </div>

            {/* Nav Col 2: Otomasi */}
            <div className="space-y-2.5">
              <p className="font-semibold text-slate-200 text-xs uppercase tracking-[0.08em]">Otomasi & AI</p>
              <ul className="space-y-2 text-xs font-normal">
                <li>
                  <Link href="/whatsapp" className="hover:text-white transition-colors">
                    WhatsApp Hub Toko
                  </Link>
                </li>
                <li>
                  <Link href="/copilot" className="hover:text-white transition-colors">
                    Artha AI Copilot
                  </Link>
                </li>
                <li>
                  <Link href="/customers" className="hover:text-white transition-colors">
                    Daftar Kontak Pelanggan
                  </Link>
                </li>
                <li>
                  <Link href="/expenses" className="hover:text-white transition-colors">
                    Catatan Beban Operasional
                  </Link>
                </li>
              </ul>
            </div>

            {/* Nav Col 3: Akses Akun */}
            <div className="space-y-2.5">
              <p className="font-semibold text-slate-200 text-xs uppercase tracking-[0.08em]">Akses & Bantuan</p>
              <ul className="space-y-2 text-xs font-normal">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Masuk Akun Toko
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white transition-colors">
                    Pendaftaran Toko Baru
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    Panel Kontrol Utama
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 font-normal">
            <p>&copy; {new Date().getFullYear()} ArthaOS. Hak cipta dilindungi undang-undang.</p>
            <p>Dibangun khusus untuk operasional ritel & UMKM Indonesia.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
