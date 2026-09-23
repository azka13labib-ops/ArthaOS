"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  Send,
  Bot,
  Zap,
  ShieldCheck,
  RefreshCw,
  ShoppingCart,
  MessageSquare,
  Megaphone,
  Sliders,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { Product, Transaction, Debt, Customer } from "@/lib/types";
import { MarkdownRenderer, stripAllEmojis } from "@/components/ui/MarkdownRenderer";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  model?: string;
  request_id?: string;
  total_tokens?: number;
  latency_ms?: number;
}

interface ParsedOrderResult {
  customer_name: string;
  matched_customer_id?: number | null;
  items: {
    product_name: string;
    matched_product_id?: number | null;
    quantity: number;
    estimated_unit_price: number;
    subtotal: number;
  }[];
  total_estimated_amount: number;
  payment_method: string;
  delivery_notes?: string;
  confidence_score: number;
}

export default function AICopilotPage() {
  const { activeStore } = useStore();

  const [activeTab, setActiveTab] = useState<"advisor" | "order_extractor" | "cs_bot" | "promo" | "settings">("promo");

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Transaction[]>([]);
  const [, setExpenses] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Halo, saya Artha AI Copilot. Saya siap membantu audit margin laba, analisis perputaran stok, dan perancangan strategi ritel berbasis data riil toko Anda. Silakan ketik pertanyaan Anda.",
      timestamp: "Baru saja",
    },
  ]);

  // Tab 2: Order Extractor State
  const [rawOrderText, setRawOrderText] = useState(
    "Siang kak mau pesan kopi susu gula aren 2 botol sama croissant 1 pcs tolong catat buat bu siti rahma ya bayar via qris"
  );
  const [isExtractingOrder, setIsExtractingOrder] = useState(false);
  const [extractedOrder, setExtractedOrder] = useState<ParsedOrderResult | null>(null);

  // Tab 3: CS Bot State
  const [inquiryText, setInquiryText] = useState("Halo min, ada croissant butter ga? Harganya berapaan ya?");
  const [isGeneratingInquiry, setIsGeneratingInquiry] = useState(false);
  const [botReply, setBotReply] = useState<string | null>(null);

  // Tab 4: Promo Generator & WhatsApp Hub State
  const [promoPrompt, setPromoPrompt] = useState("Buatkan promo paket ngopi hemat: Kopi Susu Gula Aren + Croissant diskon 15% untuk akhir pekan");
  const [storeWhatsAppPhone, setStoreWhatsAppPhone] = useState("081234567890");
  const [includeStorePhone, setIncludeStorePhone] = useState(true);
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [generatedPromo, setGeneratedPromo] = useState<string | null>(null);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "has_phone" | "has_debt">("all");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const [pList, sList, eList, dList, cList] = await Promise.all([
        api.products.list(activeStore.id),
        api.sales.list(activeStore.id),
        api.expenses.list(activeStore.id),
        api.debts.list(activeStore.id),
        api.customers.list(activeStore.id),
      ]);
      setProducts(pList || []);
      setSales(sList || []);
      setExpenses(eList || []);
      setDebts(dList || []);
      setCustomers(cList || []);
    } catch (err) {
      console.error("Gagal memuat data analitik AI:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const createWhatsAppLink = (phone: string, text: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(stripAllEmojis(text))}`;
  };

  const insights = useMemo(() => {
    const totalOmset = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalCost = sales.reduce((sum, s) => sum + (s.total_cost || 0), 0);
    const grossProfit = totalOmset - totalCost;
    const grossMarginPct = totalOmset > 0 ? (grossProfit / totalOmset) * 100 : 0;

    const unpaid = debts.filter((d) => d.status !== "paid");
    const totalUnpaid = unpaid.reduce((sum, d) => sum + (d.remaining_amount || d.original_amount || 0), 0);
    const lowStock = products.filter((p) => p.current_stock <= 5);

    return {
      totalOmset,
      grossProfit,
      grossMarginPct,
      totalUnpaid,
      unpaidCount: unpaid.length,
      lowStockCount: lowStock.length,
    };
  }, [products, sales, debts]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isThinking || !activeStore) return;

    const currentMsgId = Math.random().toString(36).substring(2, 9);
    const userMsg: ChatMessage = {
      id: currentMsgId,
      sender: "user",
      text: stripAllEmojis(textToSend),
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setIsThinking(true);

    try {
      const historyPayload = messages
        .filter((m) => m.text && (m.sender === "user" || m.sender === "ai"))
        .map((m) => ({
          role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

      const res = await api.ai.chat(activeStore.id, textToSend, historyPayload);
      const replyMsgId = Math.random().toString(36).substring(2, 9);
      setMessages((prev) => [
        ...prev,
        {
          id: replyMsgId,
          sender: "ai",
          text: stripAllEmojis(res.response),
          timestamp: res.timestamp || "Baru saja",
          model: res.model,
          request_id: res.request_id,
          total_tokens: res.total_tokens,
          latency_ms: res.latency_ms,
        },
      ]);
    } catch (err: unknown) {
      const replyMsgId = Math.random().toString(36).substring(2, 9);
      setMessages((prev) => [
        ...prev,
        {
          id: replyMsgId,
          sender: "ai",
          text: `Maaf, terjadi kendala saat menghubungi AI: ${err instanceof Error ? err.message : "Koneksi bermasalah"}`,
          timestamp: "Baru saja",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleExtractOrder = async () => {
    if (!activeStore || !rawOrderText.trim() || isExtractingOrder) return;
    setIsExtractingOrder(true);
    try {
      const result = await api.ai.parseOrder(activeStore.id, rawOrderText);
      setExtractedOrder(result);
    } catch (err) {
      console.error("Gagal mengekstrak order:", err);
    } finally {
      setIsExtractingOrder(false);
    }
  };

  const handleInquiry = async () => {
    if (!activeStore || !inquiryText.trim() || isGeneratingInquiry) return;
    setIsGeneratingInquiry(true);
    try {
      const result = await api.ai.inquiry(activeStore.id, inquiryText);
      setBotReply(stripAllEmojis(result.reply));
    } catch (err) {
      console.error("Gagal menghasilkan jawaban CS:", err);
    } finally {
      setIsGeneratingInquiry(false);
    }
  };

  const handleGeneratePromo = async () => {
    if (!activeStore || !promoPrompt.trim() || isGeneratingPromo) return;
    setIsGeneratingPromo(true);
    try {
      const phoneParam = includeStorePhone ? storeWhatsAppPhone : "";
      const result = await api.ai.generatePromo(activeStore.id, promoPrompt, phoneParam);
      setGeneratedPromo(stripAllEmojis(result.promo_text));
    } catch (err) {
      console.error("Gagal membuat teks promo:", err);
    } finally {
      setIsGeneratingPromo(false);
    }
  };

  const handleCopyPromo = () => {
    if (!generatedPromo) return;
    navigator.clipboard.writeText(generatedPromo);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  const handleSimulateBroadcast = () => {
    if (!generatedPromo) return;
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastDone(true);
      setTimeout(() => setBroadcastDone(false), 4000);
    }, 1200);
  };

  const quickPrompts = [
    "Analisis margin produk dan buatkan tabel potensi laba toko",
    "Berapa estimasi laba bersih toko bulan ini?",
    "Bagaimana evaluasi risiko kasbon pelanggan saat ini?",
    "Produk apa yang stoknya perlu ditambah menjelang akhir pekan?",
  ];

  const customerDebtMap = useMemo(() => {
    const map = new Map<number, number>();
    debts.forEach((d) => {
      if (d.customer_id && d.status !== "paid") {
        const current = map.get(d.customer_id) || 0;
        map.set(d.customer_id, current + (d.remaining_amount || d.original_amount || 0));
      }
    });
    return map;
  }, [debts]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const phone = c.phone_number || c.phone || "";
      const matchSearch =
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        phone.includes(customerSearch);
      if (!matchSearch) return false;

      if (customerFilter === "has_phone") {
        return !!phone.trim();
      }
      if (customerFilter === "has_debt") {
        return (customerDebtMap.get(c.id) || 0) > 0;
      }
      return true;
    });
  }, [customers, customerSearch, customerFilter, customerDebtMap]);

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-10 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-950 mb-1 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-slate-950" />
              Artha AI Copilot
            </h1>
            <p className="text-sm text-slate-500">
              Kecerdasan buatan terintegrasi untuk konsultasi bisnis, ekstraksi order WhatsApp, dan CS cerdas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
              LPU Active
            </span>
            <Button
              variant="outline"
              className="rounded-none border-slate-200 hover:bg-slate-50 h-10 px-4"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan Data
            </Button>
          </div>
        </div>

        {/* SECTION 1: 4 Diagnostic KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-200 bg-white">
          <div className="p-6 border-b sm:border-b-0 sm:border-r border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kesehatan Bisnis</span>
              <ShieldCheck className="w-4 h-4 text-slate-950" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-medium text-slate-950">95</span>
              <span className="text-sm text-slate-500">/ 100</span>
            </div>
            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-widest uppercase">
              Prima
            </span>
          </div>

          <div className="p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rata-Rata Margin</span>
              <TrendingUp className="w-4 h-4 text-slate-950" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-medium text-slate-950">
                {insights.grossMarginPct.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Laba: {formatCurrency(insights.grossProfit)}
            </p>
          </div>

          <div className="p-6 border-b sm:border-b-0 sm:border-r border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kasbon Tertahan</span>
              <Users className="w-4 h-4 text-slate-950" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-medium text-rose-600 tracking-tight">
                {formatCurrency(insights.totalUnpaid)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {insights.unpaidCount} tagihan aktif
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Peringatan Restock</span>
              <AlertTriangle className="w-4 h-4 text-slate-950" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-medium text-slate-950">
                {insights.lowStockCount} SKU
              </span>
            </div>
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${insights.lowStockCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
              {insights.lowStockCount > 0 ? 'Perlu Restock' : 'Aman'}
            </span>
          </div>
        </div>

        {/* SECTION 2: Interactive AI Workspace Tabs */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {[
              { id: "promo", icon: Megaphone, label: "Generator Promosi" },
              { id: "advisor", icon: Bot, label: "Konsultasi Bisnis AI" },
              { id: "order_extractor", icon: ShoppingCart, label: "Ekstraktor Pesanan" },
              { id: "cs_bot", icon: MessageSquare, label: "Bot CS 24/7" },
              { id: "settings", icon: Sliders, label: "Status Engine" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-slate-950 text-slate-950"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Promo Generator */}
          {activeTab === "promo" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form */}
              <div className="border border-slate-200 bg-white p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-medium text-slate-950">Pengaturan Promosi</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-950 uppercase tracking-wide block mb-2">
                      Nomor WhatsApp Toko
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={storeWhatsAppPhone}
                        onChange={(e) => setStoreWhatsAppPhone(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:border-slate-950 font-mono"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeStorePhone}
                          onChange={(e) => setIncludeStorePhone(e.target.checked)}
                          className="w-4 h-4 text-slate-950 border-slate-300 rounded-none focus:ring-slate-950"
                        />
                        Sertakan link
                      </label>
                    </div>
                  </div>

                  {products.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-950 uppercase tracking-wide">
                        Pilih Produk:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {products.slice(0, 6).map((prod) => (
                          <button
                            key={prod.id}
                            onClick={() => {
                              setPromoPrompt(
                                `Buatkan promo spesial untuk produk ${prod.name} (Harga: ${formatCurrency(
                                  prod.sell_price
                                )}) dengan diskon hemat untuk pelanggan setia.`
                              );
                            }}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs transition-colors"
                          >
                            + {prod.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-950 uppercase tracking-wide">
                      Instruksi AI:
                    </label>
                    <textarea
                      rows={4}
                      value={promoPrompt}
                      onChange={(e) => setPromoPrompt(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-950 resize-none font-sans"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    className="w-full rounded-none h-12 bg-slate-950 text-white hover:bg-slate-800"
                    isLoading={isGeneratingPromo}
                    onClick={handleGeneratePromo}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Hasilkan Teks Promosi
                  </Button>
                </div>

                {/* Generated Result */}
                {generatedPromo && (
                  <div className="p-6 border border-slate-200 bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-950 text-sm">
                        Hasil Generate
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none border-slate-300 text-xs h-8 px-3 bg-white"
                        onClick={handleCopyPromo}
                      >
                        {copiedPromo ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-2 text-slate-950" /> Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-2" /> Salin Pesan
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 bg-white border border-slate-200 text-sm text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                      {generatedPromo}
                    </pre>

                    <div className="flex gap-3">
                      {storeWhatsAppPhone && (
                        <a
                          href={createWhatsAppLink(storeWhatsAppPhone, generatedPromo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-slate-200"
                        >
                          <Phone className="w-4 h-4" /> Uji Kirim
                        </a>
                      )}
                      <button
                        onClick={handleSimulateBroadcast}
                        disabled={isBroadcasting}
                        className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {isBroadcasting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Memproses...
                          </>
                        ) : broadcastDone ? (
                          <>
                            <Check className="w-4 h-4" /> Terkirim!
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" /> Siarkan Massal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Customer Targets */}
              <div className="border border-slate-200 bg-white flex flex-col h-full">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h2 className="text-lg font-medium text-slate-950">Target Broadcast</h2>
                  <span className="px-3 py-1 bg-slate-200 text-slate-800 text-xs font-bold tracking-widest uppercase">
                    {customers.length} Kontak
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col space-y-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari pelanggan..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 text-sm focus:outline-none focus:border-slate-950"
                      />
                    </div>
                    <select
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value as any)}
                      className="bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none"
                    >
                      <option value="all">Semua</option>
                      <option value="has_phone">Ada WA</option>
                      <option value="has_debt">Kasbon</option>
                    </select>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px]">
                    {filteredCustomers.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        Tidak ada pelanggan yang cocok.
                      </div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const phoneNum = c.phone_number || c.phone || "";
                        const debtAmount = customerDebtMap.get(c.id) || 0;
                        const promoMsg = generatedPromo || `Halo Kak ${c.name}! Ada promo spesial untukmu.`;

                        return (
                          <div
                            key={c.id}
                            className="p-4 border border-slate-200 bg-slate-50 flex items-center justify-between group hover:border-slate-300 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold text-slate-950 text-sm">{c.name}</p>
                                {debtAmount > 0 && (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold tracking-widest uppercase">
                                    Kasbon
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-mono mt-1">
                                {phoneNum || "Tanpa Nomor"}
                              </p>
                            </div>
                            {phoneNum && (
                              <a
                                href={createWhatsAppLink(phoneNum, promoMsg)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                              >
                                Kirim
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Advisor */}
          {activeTab === "advisor" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
              <div className="lg:col-span-8 flex flex-col h-[70vh] border border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-slate-950" />
                    <div>
                      <h3 className="font-semibold text-slate-950 text-sm">Asisten Analisis Bisnis</h3>
                      <p className="text-[11px] text-slate-500">Tanya performa, margin, dan stok.</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div
                        className={`p-4 text-sm leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-slate-950 text-white"
                            : "bg-slate-50 border border-slate-200 text-slate-900"
                        }`}
                      >
                        {msg.sender === "user" ? (
                          msg.text
                        ) : (
                          <div className="prose prose-sm prose-slate prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-strong:text-slate-900">
                            <MarkdownRenderer content={msg.text} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                        <span>{msg.timestamp}</span>
                        {msg.model && <span>• Model: {msg.model}</span>}
                        {msg.latency_ms && <span>• {msg.latency_ms}ms</span>}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex flex-col max-w-[85%] mr-auto items-start">
                      <div className="p-4 bg-slate-50 border border-slate-200">
                        <div className="flex gap-2">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Tanya soal laba bulan ini atau stok produk..."
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 bg-white border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-950 font-sans"
                      disabled={isThinking}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputQuery.trim() || isThinking}
                      className="p-3 bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="border border-slate-200 bg-white p-6">
                  <h4 className="font-semibold text-slate-950 text-sm mb-4">Prompt Saran</h4>
                  <div className="space-y-3">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full p-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left text-xs text-slate-700 transition-colors flex items-center justify-between group"
                      >
                        <span className="pr-4">{prompt}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-950 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Order Extractor */}
          {activeTab === "order_extractor" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
              <div className="border border-slate-200 bg-white p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-medium text-slate-950 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Teks Pesanan Kasar
                  </h2>
                </div>
                <div className="space-y-4">
                  <textarea
                    rows={6}
                    value={rawOrderText}
                    onChange={(e) => setRawOrderText(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-slate-950 resize-none font-sans leading-relaxed"
                    placeholder="Paste pesan WhatsApp pelanggan di sini..."
                  />
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full rounded-none h-12 bg-slate-950 text-white hover:bg-slate-800"
                    isLoading={isExtractingOrder}
                    onClick={handleExtractOrder}
                  >
                    <Layers className="w-4 h-4 mr-2" /> Proses Pesanan
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 p-6 flex flex-col justify-center">
                {!extractedOrder ? (
                  <div className="text-center text-slate-400 space-y-3">
                    <CheckCircle2 className="w-12 h-12 mx-auto opacity-30" />
                    <p className="text-sm">Menunggu ekstraksi data pesanan.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-950">Draft Transaksi</h3>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold tracking-widest uppercase">
                        Skor: {(extractedOrder.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Pelanggan</p>
                          <p className="font-medium text-slate-950">{extractedOrder.customer_name || "Guest"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Metode Bayar</p>
                          <p className="font-medium text-slate-950 uppercase">{extractedOrder.payment_method}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Item Dipesan</p>
                        <div className="border border-slate-200 divide-y divide-slate-100">
                          {extractedOrder.items.map((item, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center bg-slate-50">
                              <div>
                                <p className="font-medium text-slate-950">{item.product_name}</p>
                                <p className="text-xs text-slate-500 font-mono">
                                  {item.quantity} x {formatCurrency(item.estimated_unit_price)}
                                </p>
                              </div>
                              <p className="font-semibold text-slate-950 font-mono">
                                {formatCurrency(item.subtotal)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <span className="font-bold text-slate-950">Total Estimasi</span>
                        <span className="font-bold text-lg text-rose-600">
                          {formatCurrency(extractedOrder.total_estimated_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button className="flex-1 rounded-none bg-slate-950 text-white hover:bg-slate-800">
                        Lanjut ke Kasir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CS Bot */}
          {activeTab === "cs_bot" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
              <div className="border border-slate-200 bg-white p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-medium text-slate-950 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Simulasi Pertanyaan Pelanggan
                  </h2>
                </div>
                <div className="space-y-4">
                  <textarea
                    rows={4}
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-slate-950 resize-none font-sans leading-relaxed"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full rounded-none h-12 bg-slate-950 text-white hover:bg-slate-800"
                    isLoading={isGeneratingInquiry}
                    onClick={handleInquiry}
                  >
                    <Bot className="w-4 h-4 mr-2" /> Hasilkan Balasan CS
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 p-6 flex flex-col justify-center">
                {!botReply ? (
                  <div className="text-center text-slate-400 space-y-3">
                    <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
                    <p className="text-sm">Menunggu balasan AI.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 p-6 space-y-4">
                    <h3 className="font-semibold text-slate-950 border-b border-slate-100 pb-3">Saran Balasan:</h3>
                    <div className="prose prose-sm prose-slate prose-p:leading-relaxed">
                      <MarkdownRenderer content={botReply} />
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <Button
                        variant="outline"
                        className="rounded-none border-slate-300 text-xs px-4"
                        onClick={() => navigator.clipboard.writeText(botReply)}
                      >
                        <Copy className="w-3 h-3 mr-2" /> Salin Balasan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Settings */}
          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="border border-slate-200 bg-white p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-medium text-slate-950 flex items-center gap-2">
                    <Sliders className="w-5 h-5" /> Status Engine & Model
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Model LLM Utama</p>
                    <p className="font-bold text-slate-950">llama3-70b-8192 (Groq)</p>
                  </div>
                  <div className="p-4 border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Hardware LPU</p>
                    <p className="font-bold text-emerald-700 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Active (Ultra-low latency)
                    </p>
                  </div>
                  <div className="p-4 border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Konteks Data Toko</p>
                    <p className="font-bold text-slate-950">Tersinkronisasi ({activeStore?.name})</p>
                  </div>
                  <div className="p-4 border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Koneksi API</p>
                    <p className="font-bold text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Online
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
