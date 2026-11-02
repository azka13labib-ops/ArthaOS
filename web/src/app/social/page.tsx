"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { Product, PosterTemplate, SocialQuota, SocialAccount } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Tag,
  Palette,
  Key,
  Flame,
  CheckCircle2,
  AlertCircle,
  Share2,
  ExternalLink,
  Sliders,
  Type,
  CloudUpload,
  Layers,
  Unlink,
  ShieldCheck,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const GOAL_OPTIONS = [
  { id: "promo", label: "Promo Diskon / Flash Sale", icon: Flame, desc: "Penawaran hemat, diskon terbatas, & promo paket" },
  { id: "new_product", label: "Produk Baru / Menu Baru", icon: Sparkles, desc: "Pengumuman menu atau varian baru yang hadir" },
  { id: "testimonial", label: "Testimoni & Terima Kasih", icon: CheckCircle2, desc: "Apresiasi pelanggan setia & bukti kualitas" },
  { id: "education", label: "Tips & Edukasi Pelanggan", icon: Tag, desc: "Kutipan inspiratif, tips memilih, & wawasan toko" },
];

const TONE_OPTIONS = [
  { id: "santai", label: "Santai & Akrab", hint: "Bahasa tongkrongan akrab, hangat" },
  { id: "ramah", label: "Ramah & Sopan", hint: "Sopan, hangat untuk keluarga & umum" },
  { id: "profesional", label: "Profesional & Elegan", hint: "Berwibawa, rapi & terpercaya" },
];

const COLOR_PRESETS = [
  { name: "Crimson Rose", hex: "#E11D48" },
  { name: "Royal Indigo", hex: "#4F46E5" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Amber Gold", hex: "#D97706" },
  { name: "Midnight Violet", hex: "#7C3AED" },
  { name: "Charcoal Dark", hex: "#1E293B" },
];

function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function SocialContent() {
  const { activeStore } = useStore();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<PosterTemplate[]>([]);
  const [quota, setQuota] = useState<SocialQuota | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingStoreData, setIsLoadingStoreData] = useState(false);

  // Meta connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [oauthFeedback, setOauthFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states
  const [goal, setGoal] = useState("promo");
  const [tone, setTone] = useState("santai");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [extraNote, setExtraNote] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Editor states (live-synced with canvas)
  const [selectedTemplateId, setSelectedTemplateId] = useState("promo-deal");
  const [headline, setHeadline] = useState("PROMO SPESIAL HARI INI");
  const [subheadline, setSubheadline] = useState("Nikmati produk favorit pilihan dengan harga hemat terbaik minggu ini.");
  const [priceText, setPriceText] = useState("Mulai Rp 15.000");
  const [brandColor, setBrandColor] = useState("#E11D48");
  const [caption, setCaption] = useState(
    "Promo spesial terbatas di toko kami! Nikmati menu andalan dengan penawaran terbaik hari ini.\n\nStok terbatas setiap hari, yuk mampir dan pesan sekarang!"
  );
  const [hashtags, setHashtags] = useState<string[]>([
    "#promospesial",
    "#diskonhariini",
    "#umkmindonesia",
    "#kulinerlokal",
    "#belanjamurah",
  ]);

  // Action states
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cloudUrl, setCloudUrl] = useState("");
  const [previewImgUrl, setPreviewImgUrl] = useState("");

  // BYOK Modal
  const [byokModalOpen, setByokModalOpen] = useState(false);
  const [byokKey, setByokKey] = useState("");
  const [isSavingBYOK, setIsSavingBYOK] = useState(false);
  const [byokSuccessMsg, setByokSuccessMsg] = useState("");

  // Handle URL feedback from OAuth callback
  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      setOauthFeedback({
        type: "success",
        message: "Akun Instagram Business Anda berhasil terhubung!",
      });
    } else if (searchParams.get("error")) {
      setOauthFeedback({
        type: "error",
        message: decodeURIComponent(searchParams.get("error") || "Gagal menghubungkan akun Instagram"),
      });
    }
  }, [searchParams]);

  // Load initial store data
  const loadStoreData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoadingStoreData(true);
    try {
      const [prods, tmpls, q, accs] = await Promise.all([
        api.products.list(activeStore.id),
        api.social.getTemplates(activeStore.id),
        api.social.getQuota(activeStore.id),
        api.social.getAccounts(activeStore.id),
      ]);
      setProducts(prods || []);
      if (tmpls?.templates) {
        setTemplates(tmpls.templates);
      }
      setQuota(q);
      setAccounts(accs?.data || []);
    } catch (err: any) {
      console.error("Gagal memuat data sosial:", err);
    } finally {
      setIsLoadingStoreData(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  // Redraw canvas whenever poster parameters change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    const storeName = activeStore ? activeStore.name.toUpperCase() : "ARTHA STORE";

    // 1. Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    if (selectedTemplateId === "promo-deal") {
      bgGradient.addColorStop(0, "#0F172A");
      bgGradient.addColorStop(0.5, "#1E1B4B");
      bgGradient.addColorStop(1, "#090D16");
    } else if (selectedTemplateId === "new-arrival") {
      bgGradient.addColorStop(0, "#09090B");
      bgGradient.addColorStop(0.6, "#18181B");
      bgGradient.addColorStop(1, "#030712");
    } else {
      // tips-quote
      bgGradient.addColorStop(0, "#042F2E");
      bgGradient.addColorStop(0.6, "#0F172A");
      bgGradient.addColorStop(1, "#021A1A");
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Decorative Top Accent Bar
    ctx.fillStyle = brandColor;
    ctx.fillRect(0, 0, width, 28);

    // 3. Header badge / store label
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, 80, 80, width - 160, 80, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(storeName, 120, 132);

    ctx.fillStyle = brandColor;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "right";
    const categoryTag =
      selectedTemplateId === "promo-deal"
        ? "PROMO SPESIAL"
        : selectedTemplateId === "new-arrival"
        ? "MENU BARU"
        : "TIPS TOKO";
    ctx.fillText(categoryTag, width - 120, 130);

    // 4. Central card
    const cardY = 200;
    const cardHeight = 880;
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(ctx, 80, cardY, width - 160, cardHeight, 32);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();

    // Template specific graphics
    if (selectedTemplateId === "promo-deal") {
      // Bold discount badge
      ctx.fillStyle = brandColor;
      roundRect(ctx, 120, cardY + 60, 260, 60, 16);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PENAWARAN HEMAT", 250, cardY + 100);

      // Headline
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.font = "900 68px sans-serif";
      wrapText(ctx, headline || "PROMO SPESIAL", 120, cardY + 220, width - 240, 82, 4);

      // Price Tag Pill
      if (priceText.trim()) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        roundRect(ctx, 120, cardY + 460, width - 240, 120, 24);
        ctx.fill();
        ctx.strokeStyle = brandColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#F8FAFC";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("Harga Spesial:", 160, cardY + 532);

        ctx.fillStyle = brandColor;
        ctx.font = "900 48px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(priceText, width - 160, cardY + 536);
        ctx.textAlign = "left";
      }

      // Subheadline
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "400 36px sans-serif";
      wrapText(ctx, subheadline, 120, cardY + 640, width - 240, 52, 4);
    } else if (selectedTemplateId === "new-arrival") {
      // New arrival template
      ctx.fillStyle = brandColor;
      roundRect(ctx, 120, cardY + 60, 240, 56, 14);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KINI TERSEDIA", 240, cardY + 98);

      // Headline
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.font = "800 64px sans-serif";
      wrapText(ctx, headline || "MENU BARU KAMI", 120, cardY + 220, width - 240, 78, 4);

      // Visual focal box
      const frameY = cardY + 380;
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      roundRect(ctx, 120, frameY, width - 240, 220, 24);
      ctx.fill();
      ctx.strokeStyle = brandColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#E2E8F0";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(priceText ? priceText : "Kualitas & Cita Rasa Terbaik", width / 2, frameY + 125);
      ctx.textAlign = "left";

      // Subheadline
      ctx.fillStyle = "#94A3B8";
      ctx.font = "400 34px sans-serif";
      wrapText(ctx, subheadline, 120, cardY + 660, width - 240, 50, 4);
    } else {
      // tips-quote template
      ctx.fillStyle = brandColor;
      ctx.font = "bold 160px serif";
      ctx.fillText("“", 120, cardY + 160);

      // Headline
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 58px sans-serif";
      wrapText(ctx, headline || "TIPS SEHARI-HARI", 120, cardY + 240, width - 240, 74, 4);

      // Divider line
      ctx.fillStyle = brandColor;
      ctx.fillRect(120, cardY + 440, 160, 6);

      // Subheadline
      ctx.fillStyle = "#E2E8F0";
      ctx.font = "400 38px sans-serif";
      wrapText(ctx, subheadline, 120, cardY + 520, width - 240, 56, 5);

      if (priceText.trim()) {
        ctx.fillStyle = brandColor;
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(priceText, 120, cardY + 800);
      }
    }

    // 5. Footer CTA Bar
    const footerY = height - 190;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    roundRect(ctx, 80, footerY, width - 160, 110, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Kunjungi Outlet & Pesan Sekarang", 130, footerY + 65);

    ctx.fillStyle = brandColor;
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Instagram • ArthaOS", width - 130, footerY + 65);

    setPreviewImgUrl(canvas.toDataURL("image/jpeg", 0.92));
  }, [selectedTemplateId, headline, subheadline, priceText, brandColor, activeStore]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Connect to Instagram via OAuth
  const handleConnectInstagram = async () => {
    if (!activeStore) return;
    setIsConnecting(true);
    try {
      const res = await api.social.connectAccount(activeStore.id);
      if (res.auth_url) {
        window.location.href = res.auth_url;
      }
    } catch (err: any) {
      alert("Gagal memulai koneksi Meta/Instagram: " + err.message);
      setIsConnecting(false);
    }
  };

  // Disconnect Instagram Account
  const handleDisconnectInstagram = async (accId: number) => {
    if (!activeStore) return;
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi akun Instagram ini dari toko Anda?")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await api.social.disconnectAccount(activeStore.id, accId);
      await loadStoreData();
      setOauthFeedback({
        type: "success",
        message: "Akun Instagram berhasil diputuskan.",
      });
    } catch (err: any) {
      alert("Gagal memutuskan akun: " + err.message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // AI Content Generator handler
  const handleGenerateAI = async () => {
    if (!activeStore) return;
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const res = await api.social.generateCaption(activeStore.id, {
        goal,
        tone,
        product_ids: selectedProductIds,
        extra_note: extraNote,
      });

      if (res.headline) setHeadline(res.headline);
      if (res.subheadline) setSubheadline(res.subheadline);
      if (res.caption) setCaption(res.caption);
      if (res.hashtags && Array.isArray(res.hashtags)) setHashtags(res.hashtags);

      if (selectedProductIds.length > 0) {
        const prod = products.find((p) => p.id === selectedProductIds[0]);
        if (prod && prod.sell_price > 0) {
          setPriceText(`Rp ${prod.sell_price.toLocaleString("id-ID")}`);
        }
      }

      const newQuota = await api.social.getQuota(activeStore.id);
      setQuota(newQuota);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat materi konten AI. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download JPEG to local device
  const handleDownloadPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const safeStore = activeStore ? activeStore.name.toLowerCase().replace(/\s+/g, "-") : "artha";
      link.download = `poster-${safeStore}-${goal}-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal unduh gambar:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Save to Cloud Storage
  const handleSaveToCloud = async () => {
    if (!activeStore) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsUploading(true);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const res = await api.social.renderPoster(activeStore.id, {
        template_id: selectedTemplateId,
        headline,
        subheadline,
        price_text: priceText,
        brand_color: brandColor,
        image_data: dataUrl,
      });

      setCloudUrl(res.full_url || res.url);
    } catch (err: any) {
      alert("Gagal menyimpan ke cloud: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Copy caption & hashtags
  const handleCopyCaption = async () => {
    const fullText = `${caption}\n\n${hashtags.join(" ")}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin:", err);
    }
  };

  // Save BYOK Key
  const handleSaveBYOK = async () => {
    if (!activeStore) return;
    setIsSavingBYOK(true);
    setByokSuccessMsg("");
    try {
      await api.social.setBYOK(activeStore.id, byokKey.trim(), "groq");
      setByokSuccessMsg("API Key berhasil disimpan!");
      const q = await api.social.getQuota(activeStore.id);
      setQuota(q);
      setTimeout(() => {
        setByokModalOpen(false);
        setByokSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      alert("Gagal menyimpan key: " + err.message);
    } finally {
      setIsSavingBYOK(false);
    }
  };

  const toggleProductSelect = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const connectedAccount = accounts.length > 0 && accounts[0].status === "active" ? accounts[0] : null;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <Share2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Konten Media Sosial</h1>
              <Badge variant="secondary" className="text-xs">
                Instagram 4:5
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Buat poster visual dan caption profesional bertenaga AI untuk menarik pelanggan ke toko Anda.
            </p>
          </div>

          {/* Quota & BYOK Status Badge */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-muted/60 rounded-xl border border-border/60 text-xs flex items-center gap-2">
              <span className="font-medium text-foreground">Kuota AI Bulan Ini:</span>
              {quota?.has_byok ? (
                <Badge className="bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  BYOK Aktif (Tanpa Batas)
                </Badge>
              ) : (
                <span className="font-bold text-primary">
                  {quota ? `${quota.caption_left} / ${quota.caption_limit}` : "15"} tersisa
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setByokModalOpen(true)}
              className="gap-1.5 text-xs h-9"
            >
              <Key className="w-3.5 h-3.5" />
              BYOK API Key
            </Button>
          </div>
        </div>

        {/* OAuth Feedback Alert if any */}
        {oauthFeedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
              oauthFeedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {oauthFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{oauthFeedback.message}</span>
            </div>
            <button
              onClick={() => setOauthFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* INSTAGRAM ACCOUNT INTEGRATION CARD (FASE 2) */}
        <Card className="border-border/80 bg-gradient-to-r from-card via-card to-muted/20 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                <InstagramIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Akun Instagram Bisnis</h3>
                  {connectedAccount ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Terhubung
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                      Belum Terhubung
                    </Badge>
                  )}
                </div>

                {connectedAccount ? (
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-foreground">@{connectedAccount.username}</span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {connectedAccount.token_expires_at
                        ? `Token aktif hingga ${new Date(connectedAccount.token_expires_at).toLocaleDateString("id-ID")}`
                        : "Token aktif (60 hari)"}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hubungkan akun Instagram Business untuk auto-post & penjadwalan. Anda tetap bisa mengunduh poster secara manual.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {connectedAccount ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnectInstagram(connectedAccount.id)}
                  disabled={isDisconnecting}
                  className="text-xs text-destructive hover:bg-destructive/10 gap-1.5 h-9"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {isDisconnecting ? "Memutuskan..." : "Putuskan Akun"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectInstagram}
                  disabled={isConnecting}
                  className="text-xs bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white gap-1.5 h-9 shadow-sm"
                >
                  <InstagramIcon className="w-3.5 h-3.5" />
                  {isConnecting ? "Mengarahkan ke Meta..." : "Hubungkan Akun"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hidden high-res canvas for rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Generator Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Generator Materi Konten
                </CardTitle>
                <CardDescription>
                  Pilih tujuan, gaya komunikasi, dan produk toko yang ingin dipromosikan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 1. Goal Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tujuan Konten
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_OPTIONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = goal === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGoal(item.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-xs ring-1 ring-primary"
                              : "border-border hover:border-muted-foreground/30 hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="font-semibold text-xs">{item.label.split(" / ")[0]}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Tone Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gaya Bahasa (Tone)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTone(item.id)}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          tone === item.id
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                            : "border-border hover:bg-muted/40 text-muted-foreground text-xs"
                        }`}
                      >
                        <div className="text-xs font-medium">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Product Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Produk Toko Terkait (Opsional)
                    </Label>
                    {selectedProductIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Hapus pilihan ({selectedProductIds.length})
                      </button>
                    )}
                  </div>
                  {isLoadingStoreData ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">Memuat produk toko...</div>
                  ) : products.length === 0 ? (
                    <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground text-center">
                      Belum ada produk aktif di toko ini.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-1 border rounded-lg bg-background">
                      {products.map((p) => {
                        const isChecked = selectedProductIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleProductSelect(p.id)}
                            className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                              isChecked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                            }`}
                          >
                            <span className="truncate pr-2">{p.name}</span>
                            <span className="text-muted-foreground font-mono shrink-0">
                              Rp {p.sell_price.toLocaleString("id-ID")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Extra Note */}
                <div className="space-y-1.5">
                  <Label htmlFor="extra_note" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Catatan Tambahan (Opsional)
                  </Label>
                  <Textarea
                    id="extra_note"
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value)}
                    placeholder="Contoh: Diskon khusus berlaku hari Jumat s/d Minggu, beli 2 gratis 1."
                    rows={2}
                    className="text-xs resize-none"
                    maxLength={1000}
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !activeStore}
                  className="w-full gap-2 h-11 text-sm font-semibold shadow-md"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sedang Menyusun Konten AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Buat Konten dengan AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Poster Template & Color Customization */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Kustomisasi Desain Poster
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Pilih Desain Template</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tmpl.id);
                          if (tmpl.default_brand_color) setBrandColor(tmpl.default_brand_color);
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          selectedTemplateId === tmpl.id
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                            : "border-border hover:bg-muted text-muted-foreground text-xs"
                        }`}
                      >
                        <div className="text-xs font-semibold truncate">{tmpl.name.split(" & ")[0]}</div>
                        <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{tmpl.category}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color presets */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Warna Aksen Brand</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setBrandColor(color.hex)}
                        title={color.name}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          brandColor.toLowerCase() === color.hex.toLowerCase()
                            ? "scale-110 border-white ring-2 ring-primary"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0"
                      title="Pilih warna kustom"
                    />
                  </div>
                </div>

                {/* Text overrides */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Teks Judul (Headline Poster)</Label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Judul utama poster"
                      className="text-xs h-9 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Teks Penjelasan (Subheadline)</Label>
                    <Input
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      placeholder="Penjelasan ringkas"
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Label Harga Promo (Opsional)</Label>
                    <Input
                      value={priceText}
                      onChange={(e) => setPriceText(e.target.value)}
                      placeholder="Contoh: Mulai Rp 15.000"
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Interactive Poster Preview & Caption Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Visual Poster Live Preview */}
            <Card className="overflow-hidden border-primary/20 shadow-lg">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Pratinjau Poster Instagram (4:5)</CardTitle>
                  <CardDescription className="text-xs">Resolusi tinggi 1080×1350 px siap diunduh</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs uppercase font-mono">
                  1080 × 1350
                </Badge>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 flex flex-col items-center bg-black/30">
                {/* Scaled visual frame */}
                <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
                  {previewImgUrl ? (
                    <img
                      src={previewImgUrl}
                      alt="Pratinjau Poster"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted">
                      Membuat pratinjau...
                    </div>
                  )}
                </div>

                {/* Primary Download & Cloud Action Bar */}
                <div className="w-full max-w-[380px] grid grid-cols-2 gap-2 mt-4">
                  <Button
                    onClick={handleDownloadPoster}
                    disabled={isDownloading}
                    className="gap-2 h-10 text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Poster (JPEG)
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSaveToCloud}
                    disabled={isUploading}
                    className="gap-2 h-10 text-xs"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudUpload className="w-3.5 h-3.5" />
                    )}
                    Simpan ke Cloud
                  </Button>
                </div>

                {cloudUrl && (
                  <div className="mt-3 p-2 bg-muted/60 rounded-lg text-[11px] text-muted-foreground flex items-center justify-between w-full max-w-[380px]">
                    <span className="truncate pr-2">URL: {cloudUrl}</span>
                    <a
                      href={cloudUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline shrink-0 flex items-center gap-1 font-medium"
                    >
                      Buka <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Caption & Hashtag Editor */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    Caption & Tagar Instagram
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dapat diedit bebas sebelum disalin ke Instagram.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant={isCopied ? "default" : "secondary"}
                  onClick={handleCopyCaption}
                  className="gap-1.5 text-xs h-8"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin Caption
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tulis atau hasilkan caption di sini..."
                  rows={6}
                  className="text-xs leading-relaxed font-sans"
                />

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Tagar Rekomendasi:</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs font-mono py-1 px-2.5 bg-muted hover:bg-muted/80 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(tag);
                        }}
                        title="Klik untuk salin tagar"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* BYOK Modal Dialog */}
      <Dialog open={byokModalOpen} onOpenChange={setByokModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Gunakan API Key Sendiri (BYOK)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan API key Groq pribadi Anda untuk mendapatkan kuota pembuatan caption tanpa batas (unlimited). Key disimpan terenkripsi dengan aman.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Groq API Key (gsk_...)</Label>
              <Input
                type="password"
                value={byokKey}
                onChange={(e) => setByokKey(e.target.value)}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Kosongkan dan klik simpan jika ingin kembali menggunakan kuota standar bawaan ArthaOS.
            </p>
            {byokSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {byokSuccessMsg}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setByokModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveBYOK} disabled={isSavingBYOK}>
              {isSavingBYOK ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function SocialMediaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SocialContent />
    </Suspense>
  );
}

// Canvas helper functions
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        line = line + words.slice(n + 1).join(" ") + "...";
        ctx.fillText(line, x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
