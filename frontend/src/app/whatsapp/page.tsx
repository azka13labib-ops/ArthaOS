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
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
      desc: "Kirim bukti transaksi kasir instan via pesan WhatsApp pelanggan",
      text: `*STRUK DIGITAL - ${activeStore?.name || "TOKO KAMI"}*\n\nTerima kasih telah berbelanja di outlet kami!\nTotal Pembayaran: Rp 50.000\nStatus: LUNAS (TUNAI)\n\nSimpan pesan ini sebagai bukti pembayaran yang sah.`,
    },
    {
      title: "Pengingat Kasbon / Jatuh Tempo",
      desc: "Pemberitahuan ramah tagihan kasbon yang akan / sudah jatuh tempo",
      text: `Halo Kak, kami dari *${activeStore?.name || "Toko"}* menginfokan tagihan kasbon Anda sebesar *Rp 75.000* memiliki tanggal jatuh tempo pada akhir pekan ini. Pembayaran dapat ditransfer atau tunai di toko. Terima kasih!`,
    },
    {
      title: "Info Stok Barang Masuk (Restock)",
      desc: "Siarkan info barang baru kepada pelanggan setia",
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

  // Helper to generate sanitized WhatsApp direct link
  const createWhatsAppLink = (phoneNumber: string, message: string) => {
    let clean = phoneNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  };

  // Closing summary calculations
  const totalOmset = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalBiaya = todayExpenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const estimasiLaba = totalOmset - totalBiaya;

  const closingMessage = `*REKAP TUTUP TOKO HARIAN*\n*${activeStore?.name || "Toko"}*\nTanggal: ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}\n\n*Ringkasan Keuangan:*\n- Total Omset: *${formatCurrency(totalOmset)}*\n- Total Transaksi: *${todaySales.length} transaksi*\n- Total Pengeluaran: *${formatCurrency(totalBiaya)}*\n- Estimasi Laba Bersih: *${formatCurrency(estimasiLaba)}*\n\nStatus Operasional Toko: *TUTUP (REKAP SELESAI)*\n_Dicatat otomatis oleh ArthaOS_`;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                WhatsApp Commerce & Otomasi Toko
              </h2>
              <Badge variant="success" size="sm">
                Engine Otomasi Siap
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Jadwalkan pesan otomatis harian, tagihan kasbon ramah, dan rekap tutup toko ke nomor WhatsApp.
            </p>
          </div>
        </div>

        {/* SECTION 1: Scheduled Automations (Otomasi Terjadwal) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Otomasi & Pengingat Terjadwal (Scheduled Automation)
                </h3>
                <p className="text-xs text-slate-500">
                  Kirim pesan WhatsApp otomatis tanpa perlu klik manual satu per satu setiap hari
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Automation Card 1: Kasbon Reminder */}
            <Card className="border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {autoKasbonActive ? "Aktif" : "Mati"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoKasbonActive(!autoKasbonActive)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        autoKasbonActive ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title="Ubah status otomasi kasbon"
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          autoKasbonActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Setiap Senin Pukul 09:00 WIB</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Pengingat Kasbon Otomatis
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Memindai pelanggan yang memiliki kasbon aktif dan menyiapkan tagihan ramah beserta rincian nota.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Trigger Mandiri:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 font-semibold"
                    onClick={openKasbonAutomation}
                  >
                    <Play className="w-3 h-3 mr-1" /> Uji Coba Kirim
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Automation Card 2: Daily Closing Report */}
            <Card className="border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {autoClosingActive ? "Aktif" : "Mati"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoClosingActive(!autoClosingActive)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        autoClosingActive ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title="Ubah status otomasi laporan harian"
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          autoClosingActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Setiap Hari Pukul 21:00 WIB</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Rekap Tutup Toko ke Owner
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Kirim ringkasan total omset, transaksi, pengeluaran, dan laba kotor hari ini langsung ke nomor Owner.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Trigger Mandiri:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 h-8 font-semibold"
                    onClick={openClosingAutomation}
                  >
                    <Play className="w-3 h-3 mr-1" /> Rekap Hari Ini
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Automation Card 3: Low Stock Warning */}
            <Card className="border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {autoStockActive ? "Aktif" : "Mati"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoStockActive(!autoStockActive)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        autoStockActive ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title="Ubah status otomasi stok"
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          autoStockActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-rose-700 text-xs font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Harian Pukul 12:00 & 18:00 WIB</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Peringatan Stok Kritis (Restock)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Notifikasi daftar barang yang stoknya di bawah batas aman agar pengadaan barang tidak terlambat.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Trigger Mandiri:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 h-8 font-semibold"
                    onClick={openStockAutomation}
                  >
                    <Play className="w-3 h-3 mr-1" /> Cek Stok Kritis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: 2 Column Layout (Device Connection & Templates) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Device Link & Webhook Status */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <CardTitle>Hubungkan WhatsApp Toko</CardTitle>
                </div>
                <p className="text-xs text-slate-500">
                  Daftarkan nomor WhatsApp resmi untuk outlet {activeStore?.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Nomor WhatsApp Terverifikasi</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Nomor <span className="font-mono font-bold">{phone}</span> telah terhubung dengan webhook AI engine ArthaOS.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLinkAccount} className="space-y-4">
                    {error && (
                      <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                        {error}
                      </div>
                    )}

                    <Input
                      label="Nomor WhatsApp Outlet"
                      placeholder="Contoh: 08123456789 / 628123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full text-xs font-bold"
                      isLoading={isLinking}
                    >
                      Hubungkan & Pasangkan Perangkat
                    </Button>
                  </form>
                )}

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Keamanan data pelanggan terisolasi per-toko (multi-tenant isolation).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Bot className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Format pesan formal dan sopan untuk menjaga hubungan baik dengan pelanggan.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Copy-Paste WhatsApp Templates */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <CardTitle>Template Format Pesan Cepat</CardTitle>
                </div>
                <p className="text-xs text-slate-500">
                  Salin pesan format WhatsApp siap kirim ke pelanggan Anda
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{tmpl.title}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => handleCopy(tmpl.text, idx)}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-emerald-600" /> Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" /> Salin Teks
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">{tmpl.desc}</p>
                    <pre className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 whitespace-pre-wrap font-sans">
                      {tmpl.text}
                    </pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* MODAL 1: Batch Kasbon Reminder Preview */}
        {activeModal === "kasbon" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Pratinjau Otomasi Pengingat Kasbon
                    </h3>
                    <p className="text-xs text-slate-500">
                      Daftar pelanggan dengan tagihan kasbon aktif yang siap dikirimkan pengingat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {isLoadingModalData ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Memindai buku kasbon toko...
                  </div>
                ) : unpaidDebts.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      Buku Kasbon Bersih!
                    </p>
                    <p className="text-xs text-slate-500">
                      Tidak ada tagihan kasbon yang belum lunas di outlet ini saat ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      Ditemukan <strong>{unpaidDebts.length} pelanggan</strong> dengan kasbon aktif. Klik &quot;Kirim WhatsApp&quot; untuk langsung membuka chat WhatsApp dengan pesan tagihan yang sudah terisi otomatis.
                    </div>

                    {unpaidDebts.map((debt) => {
                      const customerName = debt.customer?.name || "Pelanggan";
                      const customerPhone = debt.customer?.phone_number || debt.customer?.phone || "";
                      const remaining = debt.remaining_amount || debt.original_amount || 0;
                      const msg = `Halo Kak *${customerName}*,\n\nKami dari *${activeStore?.name || "Toko Kami"}* menginfokan catatan kasbon Anda sebesar *${formatCurrency(remaining)}*.\n\nPembayaran dapat dilakukan secara tunai di toko atau transfer. Terima kasih banyak atas kerjasamanya! 🙏`;

                      return (
                        <div
                          key={debt.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {customerName}
                              </span>
                              <Badge variant="warning" size="sm">
                                {formatCurrency(remaining)}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-mono">
                              {customerPhone ? customerPhone : "Nomor HP belum tercatat"}
                            </p>
                            {debt.due_date && (
                              <p className="text-[11px] text-amber-700">
                                Jatuh Tempo: {new Date(debt.due_date).toLocaleDateString("id-ID")}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {customerPhone ? (
                              <a
                                href={createWhatsAppLink(customerPhone, msg)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" /> Kirim WhatsApp
                              </a>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleCopy(msg, debt.id)}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Salin Pesan
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
                <span className="text-xs text-slate-500">
                  Otomasi mingguan berjalan setiap Senin pukul 09:00 WIB
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                >
                  Tutup Pratinjau
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Daily Closing Report Preview */}
        {activeModal === "closing" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Rekap Tutup Toko Harian
                    </h3>
                    <p className="text-xs text-slate-500">
                      Format ringkasan penjualan otomatis yang dikirimkan ke nomor Owner
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[11px] text-emerald-700 font-semibold">Total Omset</p>
                    <p className="text-base font-bold text-emerald-900 mt-0.5">
                      {formatCurrency(totalOmset)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-[11px] text-blue-700 font-semibold">Total Transaksi</p>
                    <p className="text-base font-bold text-blue-900 mt-0.5">
                      {todaySales.length} Nota
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Pratinjau Pesan WhatsApp ke Owner:
                  </label>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
                    {closingMessage}
                  </pre>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(closingMessage);
                    alert("Format rekap tutup toko telah disalin ke clipboard!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Salin Rekap
                </Button>
                {phone && (
                  <a
                    href={createWhatsAppLink(phone, closingMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Kirim ke WA Owner
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Low Stock Warning Preview */}
        {activeModal === "stock" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Peringatan Stok Menipis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Daftar barang yang perlu dipesan ulang (restock) ke distributor
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {isLoadingModalData ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Memeriksa stok barang...
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      Semua Stok Aman!
                    </p>
                    <p className="text-xs text-slate-500">
                      Tidak ada barang dengan stok di bawah batas minimum (5 pcs) saat ini.
                    </p>
                  </div>
                ) : (
                  lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">SKU: {p.sku}</p>
                      </div>
                      <Badge variant="danger" size="sm">
                        Sisa: {p.current_stock} pcs
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end rounded-b-2xl">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
