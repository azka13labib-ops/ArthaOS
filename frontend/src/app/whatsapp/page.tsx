"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Bot,
  Clock,
  Zap,
  Play,
  Users,
  DollarSign,
  Package,
  Send,
  X,
  RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { Customer, Debt, Product, Transaction } from "@/lib/types";

export default function WhatsAppHubPage() {
  const { activeStore } = useStore();

  const [phone, setPhone] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Automation toggles
  const [autoKasbonActive, setAutoKasbonActive] = useState(true);
  const [autoClosingActive, setAutoClosingActive] = useState(true);
  const [autoStockActive, setAutoStockActive] = useState(false);

  // Modal states for interactive automation previews
  const [activeModal, setActiveModal] = useState<"kasbon" | "closing" | "stock" | null>(null);
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);

  // Data for automation
  const [unpaidDebts, setUnpaidDebts] = useState<(Debt & { customer?: Customer })[]>([]);
  const [todaySales, setTodaySales] = useState<Transaction[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<Transaction[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // Templates
  const templates = [
    {
      title: "Struk Digital Pembelian",
      desc: "Kirim bukti transaksi kasir instan via pesan WhatsApp",
      text: `*STRUK DIGITAL - ${activeStore?.name || "TOKO KAMI"}*\n\nTerima kasih telah berbelanja di outlet kami!\nTotal Pembayaran: Rp 50.000\nStatus: LUNAS (TUNAI)\n\nSimpan pesan ini sebagai bukti pembayaran yang sah.`,
    },
    {
      title: "Pengingat Jatuh Tempo Kasbon",
      desc: "Pemberitahuan tagihan kasbon yang akan / sudah jatuh tempo",
      text: `Halo Kak, kami dari *${activeStore?.name || "Toko"}* menginfokan tagihan kasbon Anda sebesar *Rp 75.000* memiliki tanggal jatuh tempo pada akhir pekan ini. Pembayaran dapat ditransfer atau tunai di toko. Terima kasih!`,
    },
    {
      title: "Info Stok Barang Masuk (Restock)",
      desc: "Siarkan info barang baru kepada pelanggan",
      text: `Kabar gembira! Stok produk favorit Anda telah tersedia kembali di *${activeStore?.name || "Toko"}*. Kunjungi toko kami hari ini untuk penawaran terbaik!`,
    },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !phone.trim()) return;

    setError("");
    setIsLinking(true);

    try {
      await api.whatsapp.link(activeStore.id, phone.trim());
      setLinkSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menghubungkan nomor WhatsApp"
      );
    } finally {
      setIsLinking(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const openKasbonAutomation = async () => {
    if (!activeStore) return;
    setIsLoadingModalData(true);
    setActiveModal("kasbon");
    try {
      const [allDebts, allCustomers] = await Promise.all([
        api.debts.list(activeStore.id),
        api.customers.list(activeStore.id),
      ]);

      const customerMap = new Map<number, Customer>();
      (allCustomers || []).forEach((c) => customerMap.set(c.id, c));

      const activeUnpaid = (allDebts || [])
        .filter((d) => d.status !== "paid" && (d.remaining_amount > 0 || d.original_amount > 0))
        .map((d) => ({
          ...d,
          customer: d.customer_id ? customerMap.get(d.customer_id) : undefined,
        }));

      setUnpaidDebts(activeUnpaid);
    } catch (err) {
      console.error("Gagal memuat data kasbon:", err);
    } finally {
      setIsLoadingModalData(false);
    }
  };

  const openClosingAutomation = async () => {
    if (!activeStore) return;
    setIsLoadingModalData(true);
    setActiveModal("closing");
    try {
      const [sales, expenses] = await Promise.all([
        api.sales.list(activeStore.id),
        api.expenses.list(activeStore.id),
      ]);
      setTodaySales(sales || []);
      setTodayExpenses(expenses || []);
    } catch (err) {
      console.error("Gagal memuat data closing:", err);
    } finally {
      setIsLoadingModalData(false);
    }
  };

  const openStockAutomation = async () => {
    if (!activeStore) return;
    setIsLoadingModalData(true);
    setActiveModal("stock");
    try {
      const products = await api.products.list(activeStore.id);
      const low = (products || []).filter((p) => p.current_stock <= 5);
      setLowStockProducts(low);
    } catch (err) {
      console.error("Gagal memuat data stok:", err);
    } finally {
      setIsLoadingModalData(false);
    }
  };

  const createWhatsAppLink = (phoneNumber: string, message: string) => {
    let clean = phoneNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  };

  const totalOmset = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalBiaya = todayExpenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const estimasiLaba = totalOmset - totalBiaya;

  const closingMessage = `*REKAP TUTUP TOKO HARIAN*\n*${activeStore?.name || "Toko"}*\nTanggal: ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}\n\n*Ringkasan Keuangan:*\n- Total Omset: *${formatCurrency(totalOmset)}*\n- Total Transaksi: *${todaySales.length} transaksi*\n- Total Pengeluaran: *${formatCurrency(totalBiaya)}*\n- Estimasi Laba Bersih: *${formatCurrency(estimasiLaba)}*\n\nStatus Operasional Toko: *TUTUP (REKAP SELESAI)*\n_Dicatat otomatis oleh ArthaOS_`;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="pb-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white mb-1">
              WhatsApp Engine
            </h1>
            <p className="text-sm text-slate-400">
              Jadwalkan pesan otomatis harian, tagihan kasbon, dan rekap tutup toko.
            </p>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-400 text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Engine Aktif
            </span>
          </div>
        </div>

        {/* SECTION 1: Scheduled Automations (Otomasi Terjadwal) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-white" />
            <h2 className="text-lg font-medium text-white tracking-tight">Otomasi Terjadwal</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kasbon Reminder */}
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex flex-col justify-between hover:border-white/20 transition-colors">
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white/5 border border-white/10 text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                      {autoKasbonActive ? "On" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoKasbonActive(!autoKasbonActive)}
                      className={`w-12 h-6 flex items-center rounded-none p-1 transition-colors ${
                        autoKasbonActive ? "bg-white/10 hover:bg-white/20" : "bg-slate-200"
                      }`}
                      title="Ubah status otomasi kasbon"
                    >
                      <div
                        className={`bg-white/5 backdrop-blur-xl border-white/10 text-white w-4 h-4 rounded-none transform transition-transform ${
                          autoKasbonActive ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Setiap Senin 09:00</span>
                  </div>
                  <h4 className="text-base font-medium text-white">
                    Pengingat Kasbon
                  </h4>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Memindai pelanggan yang memiliki kasbon aktif dan menyiapkan tagihan ramah beserta rincian nota.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-white/20 text-xs px-4 h-9 bg-white/5 backdrop-blur-xl border-white/10 text-white"
                  onClick={openKasbonAutomation}
                >
                  <Play className="w-3 h-3 mr-2" /> Uji Coba
                </Button>
              </div>
            </div>

            {/* Daily Closing Report */}
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex flex-col justify-between hover:border-white/20 transition-colors">
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white/5 border border-white/10 text-white">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                      {autoClosingActive ? "On" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoClosingActive(!autoClosingActive)}
                      className={`w-12 h-6 flex items-center rounded-none p-1 transition-colors ${
                        autoClosingActive ? "bg-white/10 hover:bg-white/20" : "bg-slate-200"
                      }`}
                      title="Ubah status otomasi laporan harian"
                    >
                      <div
                        className={`bg-white/5 backdrop-blur-xl border-white/10 text-white w-4 h-4 rounded-none transform transition-transform ${
                          autoClosingActive ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Setiap Hari 21:00</span>
                  </div>
                  <h4 className="text-base font-medium text-white">
                    Rekap Tutup Toko
                  </h4>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Kirim ringkasan total omset, transaksi, pengeluaran, dan laba kotor hari ini langsung ke owner.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-white/20 text-xs px-4 h-9 bg-white/5 backdrop-blur-xl border-white/10 text-white"
                  onClick={openClosingAutomation}
                >
                  <Play className="w-3 h-3 mr-2" /> Pratinjau
                </Button>
              </div>
            </div>

            {/* Low Stock Warning */}
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex flex-col justify-between hover:border-white/20 transition-colors">
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white/5 border border-white/10 text-white">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                      {autoStockActive ? "On" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoStockActive(!autoStockActive)}
                      className={`w-12 h-6 flex items-center rounded-none p-1 transition-colors ${
                        autoStockActive ? "bg-white/10 hover:bg-white/20" : "bg-slate-200"
                      }`}
                      title="Ubah status otomasi stok"
                    >
                      <div
                        className={`bg-white/5 backdrop-blur-xl border-white/10 text-white w-4 h-4 rounded-none transform transition-transform ${
                          autoStockActive ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Harian 12:00 & 18:00</span>
                  </div>
                  <h4 className="text-base font-medium text-white">
                    Peringatan Restock
                  </h4>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Notifikasi daftar barang yang stoknya di bawah batas aman agar pengadaan barang tidak terlambat.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-white/20 text-xs px-4 h-9 bg-white/5 backdrop-blur-xl border-white/10 text-white"
                  onClick={openStockAutomation}
                >
                  <Play className="w-3 h-3 mr-2" /> Cek Stok
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 2 Column Layout (Device Connection & Templates) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 pt-4">
          {/* Left Column: Device Link & Webhook Status */}
          <div className="space-y-6">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white">
              <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-white" />
                <h3 className="text-lg font-medium text-white tracking-tight">Hubungkan WhatsApp</h3>
              </div>
              <div className="p-6 space-y-6">
                {linkSuccess ? (
                  <div className="p-5 border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-3">
                    <div className="flex items-center gap-3 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Terkoneksi</span>
                    </div>
                    <p className="text-sm text-emerald-300/80">
                      Nomor <span className="font-mono font-bold">{phone}</span> telah terhubung dengan webhook AI engine ArthaOS.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLinkAccount} className="space-y-5">
                    {error && (
                      <div className="p-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20">
                        {error}
                      </div>
                    )}

                    <Input
                      label="Nomor WhatsApp Outlet"
                      placeholder="Contoh: 08123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full rounded-none bg-white/10 hover:bg-white/20 text-white hover:bg-slate-800 h-11"
                      isLoading={isLinking}
                    >
                      Hubungkan Perangkat
                    </Button>
                  </form>
                )}

                <div className="pt-6 border-t border-slate-100 space-y-4 text-sm text-slate-400">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Keamanan data terisolasi per-toko (multi-tenant isolation).</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Pesan menggunakan format formal dan standar sistem.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Copy-Paste WhatsApp Templates */}
          <div className="space-y-6">
            <div className="border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white">
              <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-white" />
                <h3 className="text-lg font-medium text-white tracking-tight">Template Pesan Cepat</h3>
              </div>
              <div className="p-6 space-y-4">
                {templates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{tmpl.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{tmpl.desc}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none border-white/10 text-xs px-3 h-8"
                        onClick={() => handleCopy(tmpl.text, idx)}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 mr-1.5 text-white" /> Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1.5" /> Salin
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 bg-white/5 border border-slate-100 text-xs text-slate-500 font-mono whitespace-pre-wrap leading-relaxed">
                      {tmpl.text}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL 1: Batch Kasbon Reminder Preview */}
        {activeModal === "kasbon" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white max-w-2xl w-full max-h-[85vh] flex flex-col border border-white/10 shadow-2xl">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-medium text-white tracking-tight">
                    Pratinjau Otomasi Kasbon
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white/5 backdrop-blur-xl border-white/10 text-white">
                {isLoadingModalData ? (
                  <div className="py-12 flex justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : unpaidDebts.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-slate-500 mx-auto" />
                    <p className="text-base font-medium text-white">
                      Buku Kasbon Bersih!
                    </p>
                    <p className="text-sm text-slate-400">
                      Tidak ada tagihan kasbon yang belum lunas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border border-white/10 bg-white/5 text-sm text-slate-500">
                      Ditemukan <strong className="text-white">{unpaidDebts.length} pelanggan</strong> dengan kasbon aktif.
                    </div>

                    {unpaidDebts.map((debt) => {
                      const customerName = debt.customer?.name || "Pelanggan";
                      const customerPhone = debt.customer?.phone_number || debt.customer?.phone || "";
                      const remaining = debt.remaining_amount || debt.original_amount || 0;
                      const msg = `Halo Kak *${customerName}*,\n\nKami dari *${activeStore?.name || "Toko Kami"}* menginfokan catatan kasbon Anda sebesar *${formatCurrency(remaining)}*.\n\nPembayaran dapat dilakukan secara tunai di toko atau transfer. Terima kasih banyak atas kerjasamanya! 🙏`;

                      return (
                        <div
                          key={debt.id}
                          className="p-5 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-white">
                                {customerName}
                              </span>
                              <span className="px-2 py-0.5 bg-white/10 text-slate-500 text-[10px] font-bold tracking-widest uppercase">
                                {formatCurrency(remaining)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">
                              {customerPhone ? customerPhone : "Tanpa Nomor HP"}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {customerPhone ? (
                              <a
                                href={createWhatsAppLink(customerPhone, msg)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 hover:bg-slate-800 transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" /> Kirim Pesan
                              </a>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-none border-white/10 text-xs px-4"
                                onClick={() => handleCopy(msg, debt.id)}
                              >
                                <Copy className="w-3.5 h-3.5 mr-2" /> Salin Pesan
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Daily Closing Report Preview */}
        {activeModal === "closing" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white max-w-lg w-full border border-white/10 shadow-2xl">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-medium text-white tracking-tight">
                    Pratinjau Tutup Toko
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Omset</p>
                    <p className="text-xl font-medium text-white mt-1 tracking-tight">
                      {formatCurrency(totalOmset)}
                    </p>
                  </div>
                  <div className="p-4 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Transaksi</p>
                    <p className="text-xl font-medium text-white mt-1 tracking-tight">
                      {todaySales.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider">
                    Format Pesan WhatsApp:
                  </label>
                  <pre className="p-5 border border-white/10 bg-white/5 text-xs text-slate-500 font-mono whitespace-pre-wrap leading-relaxed">
                    {closingMessage}
                  </pre>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-white/10 text-xs px-4 h-10"
                  onClick={() => {
                    navigator.clipboard.writeText(closingMessage);
                    alert("Disalin!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-2" /> Salin Teks
                </Button>
                {phone && (
                  <a
                    href={createWhatsAppLink(phone, closingMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 h-10 text-xs font-bold text-white bg-white/10 hover:bg-white/20 hover:bg-slate-800 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Kirim
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Low Stock Warning Preview */}
        {activeModal === "stock" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white/5 backdrop-blur-xl border-white/10 text-white max-w-lg w-full max-h-[85vh] flex flex-col border border-white/10 shadow-2xl">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-medium text-white tracking-tight">
                    Peringatan Stok Menipis
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-white/5 backdrop-blur-xl border-white/10 text-white">
                {isLoadingModalData ? (
                  <div className="py-12 flex justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-slate-500 mx-auto" />
                    <p className="text-base font-medium text-white">
                      Stok Aman!
                    </p>
                    <p className="text-sm text-slate-400">
                      Tidak ada barang di bawah batas minimum (5 pcs).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockProducts.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 border border-white/10 bg-white/5 backdrop-blur-xl border-white/10 text-white flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">SKU: {p.sku}</p>
                        </div>
                        <span className="px-2 py-1 bg-rose-500/10 text-rose-700 text-[11px] font-bold tracking-widest uppercase">
                          Sisa: {p.current_stock}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
