"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/Button";

// Antislop-compliant smooth, subtle motion (MOTION 2)
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }, // Apple-like smooth spring
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export default function HomePage() {
  const { token } = useAuth();
  const { activeStore } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-900 selection:text-white">
      {/* Top Banner - Utility */}
      {token && (
        <div className="bg-slate-950 text-slate-300 text-xs py-2.5 px-4 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>
              Sesi aktif: <strong className="text-white font-medium">{activeStore?.name || "Toko Utama"}</strong>
            </span>
          </div>
          <Link href="/pos" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded">
            Masuk Kasir &rarr;
          </Link>
        </div>
      )}

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded group"
          >
            <div className="w-7 h-7 bg-emerald-900 text-white font-serif italic text-sm flex items-center justify-center rounded-sm">
              A
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-950 group-hover:text-emerald-800 transition-colors">
              ArthaOS.
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollToSection("pos")} className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1">Kasir</button>
            <button onClick={() => scrollToSection("inventory")} className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1">Inventori</button>
            <button onClick={() => scrollToSection("kasbon")} className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1">Kasbon</button>
            <button onClick={() => scrollToSection("whatsapp")} className="hover:text-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1">WhatsApp</button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {token ? (
              <Link href="/dashboard">
                <Button variant="primary" className="bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm rounded-none px-6 py-2">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors">Masuk</Link>
                <Link href="/register">
                  <Button variant="primary" className="bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm rounded-none px-6 py-2 shadow-none">
                    Daftar
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-b border-slate-100 px-4 pt-2 pb-6 space-y-4 overflow-hidden"
            >
              <div className="flex flex-col space-y-2 text-base font-medium text-slate-800">
                <button onClick={() => scrollToSection("pos")} className="text-left px-2 py-3">Kasir</button>
                <button onClick={() => scrollToSection("inventory")} className="text-left px-2 py-3">Inventori</button>
                <button onClick={() => scrollToSection("kasbon")} className="text-left px-2 py-3">Kasbon</button>
                <button onClick={() => scrollToSection("whatsapp")} className="text-left px-2 py-3">WhatsApp</button>
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                {token ? (
                  <Link href="/dashboard" className="w-full">
                    <Button variant="primary" className="w-full min-h-[44px] bg-slate-950 text-white rounded-none">Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="w-full">
                      <Button variant="outline" className="w-full min-h-[44px] border-slate-300 rounded-none">Masuk</Button>
                    </Link>
                    <Link href="/register" className="w-full">
                      <Button variant="primary" className="w-full min-h-[44px] bg-slate-950 text-white rounded-none">Daftar</Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero: Editorial, Asymmetric, Heavy Typography */}
      <section className="pt-20 pb-24 md:pt-32 md:pb-40 px-4 md:px-8 max-w-screen-2xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end"
        >
          <div className="lg:col-span-8 space-y-8">
            <motion.h1 
              variants={fadeUp}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-medium text-slate-950 tracking-[-0.03em] leading-[1.05]"
            >
              Kendalikan<br/>
              operasional ritel<br/>
              <span className="text-emerald-800 italic font-serif">tanpa kompromi.</span>
            </motion.h1>
          </div>
          <div className="lg:col-span-4 space-y-8 lg:pb-3">
            <motion.p 
              variants={fadeUp}
              className="text-lg md:text-xl text-slate-600 leading-relaxed font-normal"
            >
              ArthaOS mendefinisikan ulang cara toko dikelola. Integrasi mulus antara kasir cepat, inventori FIFO absolut, dan buku piutang.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
              <Link href={token ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white min-h-[52px] px-8 rounded-none text-base font-medium transition-colors">
                  Mulai Gunakan ArthaOS
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Core Feature 1: POS - Full Width Editorial */}
      <section id="pos" className="py-24 md:py-32 bg-slate-50">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeUp} className="space-y-6 order-2 lg:order-1">
              <span className="text-emerald-800 font-serif italic text-xl">01 / Kasir</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-950 leading-[1.1]">
                Kecepatan di meja transaksi.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Tidak ada layar tunggu. Pencarian instan, kalkulasi otomatis, dan dukungan multi-metode pembayaran (Tunai, QRIS, Kasbon) dalam satu antarmuka bersih.
              </p>
              <ul className="space-y-4 pt-4">
                {['Shortcut keyboard (F2, F8)', 'Pencetakan struk thermal instan', 'Dukungan scan barcode'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700">
                    <span className="text-emerald-700 mt-1">&rarr;</span>
                    <span className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} className="order-1 lg:order-2">
              <div className="aspect-[4/3] bg-slate-200 w-full overflow-hidden relative">
                {/* Minimalist POS Mockup Abstract */}
                <div className="absolute inset-0 bg-white p-6 md:p-10 flex flex-col">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-6">
                    <div className="text-3xl font-medium tracking-tight">Rp 114.500</div>
                    <div className="text-emerald-800 text-sm font-medium">Kasir Siap</div>
                  </div>
                  <div className="space-y-4 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex justify-between items-center opacity-60">
                        <div className="h-4 w-32 bg-slate-200 rounded-sm"></div>
                        <div className="h-4 w-16 bg-slate-200 rounded-sm"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-12 bg-emerald-800 w-full flex items-center justify-center text-white text-sm font-medium">
                    Selesaikan Transaksi (F8)
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Core Feature 2 & 3: Asymmetric Split */}
      <section id="inventory" className="py-24 md:py-32 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8"
          >
            {/* Inventory */}
            <motion.div variants={fadeUp} className="md:col-span-7 space-y-6 md:pr-12">
              <span className="text-emerald-800 font-serif italic text-xl">02 / Inventori</span>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-950">
                Akurasi FIFO mutlak.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Tinggalkan pencatatan stok manual yang memusingkan. ArthaOS melacak setiap pergerakan barang dengan metode First In First Out. Modal (HPP) dihitung presisi, laba bersih dipastikan akurat.
              </p>
            </motion.div>

            {/* Kasbon */}
            <motion.div variants={fadeUp} className="md:col-span-5 space-y-6 md:pl-8 md:border-l border-slate-200" id="kasbon">
              <span className="text-emerald-800 font-serif italic text-xl">03 / Piutang</span>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-950">
                Buku kasbon terkendali.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Ubah nota kertas yang mudah hilang menjadi buku digital. Lacak riwayat cicilan, pantau total piutang, dan kirim pengingat tagihan via WhatsApp secara elegan.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature 4: WhatsApp Hub - Massive Type */}
      <section id="whatsapp" className="py-24 md:py-32 bg-slate-950 text-white">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="max-w-4xl space-y-12"
          >
            <span className="text-emerald-400 font-serif italic text-xl">04 / Otomasi</span>
            <motion.h2 
              variants={fadeUp}
              className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.1]"
            >
              Pesanan WhatsApp, langsung jadi transaksi kasir.
            </motion.h2>
            <motion.p 
              variants={fadeUp}
              className="text-xl text-slate-400 leading-relaxed max-w-2xl"
            >
              Ekstrak teks pesanan dari pelanggan di WhatsApp menjadi draf transaksi di sistem POS Anda secara otomatis. Hilangkan human error saat memindahkan pesanan manual.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* CTA / Final Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 text-center space-y-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl font-medium tracking-tight text-slate-950"
          >
            Siap merapikan operasional Anda?
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            {token ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-slate-950 hover:bg-slate-800 text-white min-h-[56px] px-10 rounded-none text-base font-medium">
                  Buka Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white min-h-[56px] px-10 rounded-none text-base font-medium">
                    Daftar Sekarang
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto text-slate-600 hover:text-slate-950 font-medium">
                  Atau masuk ke akun
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 text-sm text-slate-500">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-950">ArthaOS.</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/pos" className="hover:text-slate-950 transition-colors">POS</Link>
            <Link href="/inventory" className="hover:text-slate-950 transition-colors">Inventori</Link>
            <Link href="/debts" className="hover:text-slate-950 transition-colors">Kasbon</Link>
            <Link href="/reports" className="hover:text-slate-950 transition-colors">Laporan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
