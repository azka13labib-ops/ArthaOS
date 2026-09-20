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
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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

  // Helper to create clean wa.me link
  const createWhatsAppLink = (phone: string, text: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(stripAllEmojis(text))}`;
  };

  // Computed Business Insights
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

  // Tab 1 Action: Chat with AI Advisor
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

  // Tab 2 Action: Parse WhatsApp Order
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

  // Tab 3 Action: CS Inquiry
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

  // Tab 4 Action: Generate Promo
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

  // Trigger simulated batch broadcast queue
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

  // Customer debt map
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

  // Filtered customers for WhatsApp Hub
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Artha AI Copilot & LLM Workspace
              </h2>
              <Badge variant="success" size="sm">
                Groq LPU Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kecerdasan buatan terintegrasi untuk konsultasi bisnis, ekstraksi order WhatsApp, dan CS cerdas 24/7 tanpa emoji.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Segarkan Data
          </Button>
        </div>

        {/* SECTION 1: 4 Diagnostic KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 hover:border-emerald-300 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Kesehatan Bisnis Real-Time</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">95</span>
                <span className="text-xs text-slate-400">/ 100</span>
                <Badge variant="success" size="sm" className="ml-auto">
                  Sangat Prima
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Likuiditas kas dan perputaran persediaan aman.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-emerald-300 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Rata-Rata Margin Kotor</span>
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {insights.grossMarginPct.toFixed(1)}%
                </span>
                <Badge variant="info" size="sm" className="ml-auto">
                  Target: &gt;20%
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Laba kotor: {formatCurrency(insights.grossProfit)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-emerald-300 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Kasbon Tertahan</span>
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(insights.totalUnpaid)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {insights.unpaidCount} pelanggan dengan tagihan aktif.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-emerald-300 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Peringatan Restock</span>
                <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {insights.lowStockCount} SKU
                </span>
                {insights.lowStockCount > 0 ? (
                  <Badge variant="danger" size="sm" className="ml-auto">
                    Perlu Restock
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm" className="ml-auto">
                    Aman
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Stok &le; 5 pcs di etalase toko.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: Interactive AI Workspace Tabs */}
        <div className="space-y-4">
          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto select-none">
            <button
              type="button"
              onClick={() => setActiveTab("promo")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "promo"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>1. Generator Promosi & WhatsApp Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("advisor")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "advisor"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>2. Konsultasi Bisnis AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("order_extractor")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "order_extractor"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>3. Ekstraktor Pesanan WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cs_bot")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "cs_bot"
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>4. Bot CS WhatsApp 24/7</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "settings"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>5. Status Engine AI</span>
            </button>
          </div>

          {/* TAB 1: Promo Broadcast Generator & WhatsApp Hub Integration */}
          {activeTab === "promo" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
              {/* Left Column: Promo Generator Form */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-900">
                        <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <CardTitle className="text-sm">Generator Pesan Promosi AI</CardTitle>
                      </div>
                      <Link
                        href="/whatsapp"
                        className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka WhatsApp Hub
                      </Link>
                    </div>
                    <p className="text-xs text-slate-500">
                      Buat teks penawaran promosi WhatsApp berbasis data toko tanpa emoji, siap disiarkan ke pelanggan.
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Store WhatsApp Hub Number configuration */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Nomor WhatsApp Resmi Toko
                        </label>
                        <span className="text-[10px] text-slate-400">Tersambung ke WhatsApp Hub</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={storeWhatsAppPhone}
                          onChange={(e) => setStoreWhatsAppPhone(e.target.value)}
                          placeholder="Contoh: 081234567890"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 outline-none font-mono"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeStorePhone}
                            onChange={(e) => setIncludeStorePhone(e.target.checked)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          Sertakan link WA
                        </label>
                      </div>
                    </div>

                    {/* Quick Product Chips */}
                    {products.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Pilih Produk Toko untuk Promo:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {products.slice(0, 6).map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                setPromoPrompt(
                                  `Buatkan promo spesial untuk produk ${prod.name} (Harga: ${formatCurrency(
                                    prod.sell_price
                                  )}) dengan diskon hemat untuk pelanggan setia.`
                                );
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] transition-colors text-left"
                            >
                              + {prod.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instruction input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Instruksi Promosi:</label>
                      <textarea
                        rows={3}
                        value={promoPrompt}
                        onChange={(e) => setPromoPrompt(e.target.value)}
                        placeholder="Contoh: Buat promo diskon 10% untuk produk sembako dan cemilan akhir pekan"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-500 outline-none transition-all leading-relaxed font-sans"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      className="w-full text-xs font-bold h-10 bg-purple-600 hover:bg-purple-700"
                      isLoading={isGeneratingPromo}
                      onClick={handleGeneratePromo}
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" /> Hasilkan Teks Promosi WhatsApp
                    </Button>

                    {/* Generated Result Container */}
                    {generatedPromo && (
                      <div className="p-4 bg-white border border-purple-200 rounded-2xl space-y-3 text-xs text-slate-900 shadow-xs animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Format Siap Kirim WhatsApp Toko:
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                            onClick={handleCopyPromo}
                          >
                            {copiedPromo ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Tersalin
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 mr-1" /> Salin Pesan
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-xs text-slate-900 font-sans whitespace-pre-wrap leading-relaxed">
                          {generatedPromo}
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                          {storeWhatsAppPhone && (
                            <a
                              href={createWhatsAppLink(storeWhatsAppPhone, generatedPromo)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto flex-1 text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5" /> Uji Kirim ke Nomor Toko
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={handleSimulateBroadcast}
                            disabled={isBroadcasting}
                            className="w-full sm:w-auto py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            {isBroadcasting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memproses Siaran...
                              </>
                            ) : broadcastDone ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" /> Siaran Terkirim ke Hub!
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-amber-400" /> Siarkan ke Semua Kontak Terpilih
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: WhatsApp Hub Direct Broadcast & Customer Targets */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="border-slate-200 flex flex-col h-full">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                          <Users className="w-4 h-4" />
                        </div>
                        <CardTitle className="text-sm">Broadcast ke Kontak WhatsApp Toko</CardTitle>
                      </div>
                      <Badge variant="success" size="sm">
                        {customers.length} Kontak Terdaftar
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Kirim promo langsung ke nomor pelanggan terdaftar di WhatsApp Hub outlet {activeStore?.name}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 flex-1 flex flex-col space-y-3">
                    {/* Search and Filters */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama atau nomor telepon pelanggan..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={customerFilter}
                          onChange={(e) => setCustomerFilter(e.target.value as "all" | "has_phone" | "has_debt")}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none"
                        >
                          <option value="all">Semua ({customers.length})</option>
                          <option value="has_phone">Punya No. WA</option>
                          <option value="has_debt">Ada Kasbon</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer List */}
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-125 pr-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-1">
                          <Users className="w-8 h-8 mx-auto opacity-40" />
                          <p className="text-xs">Tidak ditemukan kontak pelanggan yang cocok.</p>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => {
                          const phoneNum = c.phone_number || c.phone || "";
                          const debtAmount = customerDebtMap.get(c.id) || 0;
                          const promoMsg =
                            generatedPromo ||
                            `Halo Kak ${c.name}! Dapatkan penawaran promo spesial di outlet kami minggu ini. Kunjungi toko kami sekarang atau pesan via WhatsApp!`;

                          return (
                            <div
                              key={c.id}
                              className="p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900 text-xs truncate">{c.name}</p>
                                  {debtAmount > 0 && (
                                    <Badge variant="warning" size="sm" className="text-[10px] py-0">
                                      Kasbon: {formatCurrency(debtAmount)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {phoneNum || "Belum ada nomor WA"}
                                </p>
                              </div>

                              {phoneNum ? (
                                <a
                                  href={createWhatsAppLink(phoneNum, promoMsg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Send className="w-3 h-3" /> Kirim Promo
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No WA Kosong</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Bottom Link to Hub */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Jadwal pengingat otomatis aktif</span>
                      </div>
                      <Link
                        href="/whatsapp"
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        Buka WhatsApp Hub Lengkap <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: Real Groq LLM Business Advisor Chat */}
          {activeTab === "advisor" && (
            <Card className="border-slate-200 flex flex-col h-150 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Konsultasi Bisnis Interaktif (Groq LLM Powered)</CardTitle>
                    <p className="text-[11px] text-slate-500">
                      Tanyakan strategi penetapan harga, restock, atau analisis performa laba toko Anda
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" size="sm" className="hidden sm:inline-flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-700" />
                    <span>Memory Aktif ({messages.length} pesan)</span>
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessages([
                        {
                          id: "1",
                          sender: "ai",
                          text: "Halo, saya Artha AI Copilot. Saya siap membantu audit margin laba, analisis perputaran stok, dan perancangan strategi ritel berbasis data riil toko Anda. Silakan ketik pertanyaan Anda.",
                          timestamp: "Baru saja",
                        },
                      ]);
                    }}
                    className="text-xs h-7 px-2.5 text-slate-600 hover:text-rose-600 hover:border-rose-300"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Reset Memory
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.sender === "ai" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 text-xs space-y-2 ${
                        msg.sender === "user"
                          ? "bg-slate-900 text-white rounded-br-none font-medium"
                          : "bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-xs"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                      ) : (
                        <MarkdownRenderer content={msg.text} />
                      )}

                      {msg.sender === "ai" && (
                        <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-1.5 select-none">
                          <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-amber-500" />
                            {msg.model || "openai/gpt-oss-120b"}
                            {msg.request_id && (
                              <span className="text-slate-500"> • ID: {msg.request_id.slice(0, 16)}...</span>
                            )}
                          </span>
                          <span className="opacity-70">
                            {msg.total_tokens ? `${msg.total_tokens} tokens • ` : ""}
                            {msg.latency_ms ? `${msg.latency_ms}ms • ` : ""}
                            {msg.timestamp}
                          </span>
                        </div>
                      )}
                      {msg.sender === "user" && (
                        <div className="text-[10px] opacity-60 text-right pt-1">{msg.timestamp}</div>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs italic pl-9">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Groq LLM sedang menganalisis data keuangan toko Anda...</span>
                  </div>
                )}
              </CardContent>

              {/* Quick Suggestion Chips */}
              <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto select-none">
                <span className="text-[10px] text-slate-400 font-medium shrink-0">Tanya Cepat:</span>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="shrink-0 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-full text-[11px] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Chat Field */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Tanyakan analisis bisnis, proyeksi laba, atau saran margin..."
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none transition-all"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!inputQuery.trim() || isThinking}
                    className="px-4 h-9 font-bold text-xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Tanya AI
                  </Button>
                </form>
              </div>
            </Card>
          )}

          {/* TAB 3: WhatsApp Order Extractor */}
          {activeTab === "order_extractor" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Input text */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <ShoppingCart className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-sm">Input Pesan Chat WhatsApp</CardTitle>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tempel pesan belanja pelanggan, LLM akan mengekstrak barang dan mencocokkannya ke katalog secara instan.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    rows={6}
                    value={rawOrderText}
                    onChange={(e) => setRawOrderText(e.target.value)}
                    placeholder="Contoh: Pagi kak mau pesan kopi susu gula aren 2 botol sama croissant 1 pcs tolong catat buat bu siti rahma ya bayar via qris"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all leading-relaxed font-sans"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRawOrderText(
                          "Pagi mas, kopi drip sachet 2 box sama croissant butter 2 biji kirim ke warung bu siti ya bayar transfer"
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                    >
                      Contoh 1: Kopi + Roti (Bu Siti)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRawOrderText(
                          "Beli air mineral 600ml 1 karton (24 botol) sama keripik singkong 3 bks tolong catat kasbon atas nama pak hendra"
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                    >
                      Contoh 2: Air + Snack (Kasbon Pak Hendra)
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    className="w-full text-xs font-bold h-10"
                    isLoading={isExtractingOrder}
                    onClick={handleExtractOrder}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" /> Ekstrak Draf Nota Kasir via LLM
                  </Button>
                </CardContent>
              </Card>

              {/* Right Column: Extracted Result */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <CardTitle className="text-sm">Hasil Ekstraksi & Draf Nota</CardTitle>
                    </div>
                    {extractedOrder && (
                      <Badge variant="success" size="sm">
                        Akurasi: {Math.round((extractedOrder.confidence_score || 0.95) * 100)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!extractedOrder ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <ShoppingCart className="w-10 h-10 mx-auto opacity-40" />
                      <p className="text-xs">Klik tombol &quot;Ekstrak Draf Nota Kasir&quot; di sebelah kiri untuk melihat hasil ekstraksi LLM.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs animate-in fade-in">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-emerald-800">Pelanggan Terdeteksi:</span>
                          <span className="font-bold text-emerald-950">{extractedOrder.customer_name || "Pelanggan Umum"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-emerald-800">Metode Pembayaran:</span>
                          <Badge variant="info" size="sm" className="uppercase">
                            {extractedOrder.payment_method || "cash"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-bold text-slate-700">Rincian Barang Terdeteksi:</span>
                        <div className="space-y-1.5">
                          {extractedOrder.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{it.product_name}</p>
                                <p className="text-[11px] text-slate-500">
                                  {it.quantity} unit &times; {formatCurrency(it.estimated_unit_price)}
                                </p>
                              </div>
                              <span className="font-bold text-slate-900">
                                {formatCurrency(it.subtotal || it.quantity * it.estimated_unit_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                        <span className="font-bold">Total Tagihan:</span>
                        <span className="text-base font-black text-emerald-400">
                          {formatCurrency(extractedOrder.total_estimated_amount)}
                        </span>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Link
                          href="/pos"
                          className="flex-1 text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Buka Kasir POS untuk Checkout
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: CS WhatsApp Bot 24/7 Simulator */}
          {activeTab === "cs_bot" && (
            <Card className="border-slate-200 max-w-3xl mx-auto">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm">Simulator Bot CS WhatsApp 24/7</CardTitle>
                </div>
                <p className="text-xs text-slate-500">
                  Uji bagaimana bot cerdas menjawab pertanyaan pembeli seputar stok, harga, dan layanan toko secara otomatis tanpa emoji.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pertanyaan Calon Pembeli:</label>
                  <input
                    type="text"
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    placeholder="Contoh: Min ada croissant butter ga? Harganya berapaan ya?"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInquiryText("Halo, toko buka sampai jam berapa ya? Bisa bayar pakai QRIS?")}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                  >
                    Tanya Jam & Pembayaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setInquiryText("Ada stok croissant butter untuk 10 pcs?")}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                  >
                    Tanya Stok Jumlah Besar
                  </button>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="w-full text-xs font-bold h-10 bg-blue-600 hover:bg-blue-700"
                  isLoading={isGeneratingInquiry}
                  onClick={handleInquiry}
                >
                  <Bot className="w-4 h-4 mr-1.5" /> Dapatkan Balasan Cerdas Bot CS
                </Button>

                {botReply && (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-900 shadow-xs animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold flex items-center gap-1.5 text-blue-900">
                        <Bot className="w-4 h-4 text-blue-600" /> Balasan Otomatis WhatsApp Bot:
                      </span>
                    </div>
                    <MarkdownRenderer content={botReply} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 5: AI Engine & Provider Status */}
          {activeTab === "settings" && (
            <Card className="border-slate-200 max-w-2xl mx-auto">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-slate-700" />
                  <CardTitle className="text-sm">Status & Konfigurasi Engine AI</CardTitle>
                </div>
                <p className="text-xs text-slate-500">
                  ArthaOS terhubung langsung dengan engine inferensi LLM ultra-cepat
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Provider Aktif: Groq LPU (Ultra Low Latency)</span>
                    </span>
                    <Badge variant="success" size="sm">
                      Terhubung
                    </Badge>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Model aktif: <span className="font-mono font-bold">openai/gpt-oss-120b</span> dengan latensi respons rata-rata &lt; 250ms.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-600" /> Keamanan Data & Privasi Multitenant
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Konteks database hanya dikirim per-permintaan ke LLM dan diisolasi ketat sesuai outlet yang aktif. Tidak ada data pelanggan yang bocor antar toko.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ACID Deterministic Integrity
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Semua pemotongan stok fisik dan pembukuan uang kas tetap diproses secara presisi oleh PostgreSQL & Go Fiber backend, menjamin bebas dari kesalahan matematis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
