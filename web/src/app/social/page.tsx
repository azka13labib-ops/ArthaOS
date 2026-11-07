"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import {
  Product,
  SocialQuota,
  GenerateCaptionResponse,
  RenderPosterResponse,
  SocialAccount,
} from "@/lib/types";
import {
  ASPECT_RATIO_SPECS,
  CURATED_TEMPLATES,
  FONT_PRESETS,
  POSTER_THEMES,
  PosterAspectRatio,
  PosterFontPresetId,
  PosterTemplateId,
  PosterThemeId,
  computeDiscountPercent,
  renderPosterToCanvas,
} from "@/components/social/poster-engine";
import { TemplateThumbnail } from "@/components/social/TemplateThumbnail";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Share2,
  Download,
  Copy,
  Check,
  Key,
  Palette,
  Type,
  Tag,
  ShoppingBag,
  MessageCircleHeart,
  Lightbulb,
  CloudUpload,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Unlink,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ImagePlus,
  Trash2,
  RotateCcw,
  Search,
  Wand2,
  Move,
  Store as StoreIcon,
  Plus,
  X,
} from "lucide-react";

type StudioTab = "design" | "media" | "content" | "ai";
type StageTab = "canvas" | "caption";

const GOAL_OPTIONS = [
  { id: "promo", label: "Promo & Diskon", icon: Tag, desc: "Tarik pembeli dengan potongan harga atau paket hemat" },
  { id: "new_product", label: "Produk / Menu Baru", icon: ShoppingBag, desc: "Kenalkan menu baru atau stok yang baru tiba" },
  { id: "testimonial", label: "Apresiasi Pelanggan", icon: MessageCircleHeart, desc: "Bangun kedekatan dengan pelanggan setia toko" },
  { id: "education", label: "Info & Tips Toko", icon: Lightbulb, desc: "Bagikan info jam buka, tips produk, atau kutipan" },
] as const;

const TONE_OPTIONS = [
  { id: "santai", label: "Santai & Akrab" },
  { id: "profesional", label: "Profesional" },
  { id: "ramah", label: "Ramah & Hangat" },
] as const;

const BRAND_COLOR_SWATCHES = [
  { name: "Merah Promo", hex: "#E11D48" },
  { name: "Terakota Kuliner", hex: "#C2410C" },
  { name: "Kuning Amber", hex: "#D97706" },
  { name: "Hijau Zamrud", hex: "#059669" },
  { name: "Toska Butik", hex: "#0F766E" },
  { name: "Biru Kobalt", hex: "#2563EB" },
  { name: "Ungu Kalibra", hex: "#9333EA" },
  { name: "Hitam Arang", hex: "#18181B" },
];

const BADGE_QUICK_CHIPS = [
  "PROMO SPESIAL",
  "MENU BARU",
  "TERLARIS",
  "DISKON GAJIAN",
  "INFO TOKO",
];

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function formatIdr(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function SocialStudioContent() {
  const { activeStore, isLoadingStores } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Store & API data
  const [products, setProducts] = useState<Product[]>([]);
  const [quota, setQuota] = useState<SocialQuota | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingStoreData, setIsLoadingStoreData] = useState(false);

  // Studio UI Navigation
  const [activeTab, setActiveTab] = useState<StudioTab>("design");
  const [stageTab, setStageTab] = useState<StageTab>("canvas");
  const [toastBanner, setToastBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Poster Visual State
  const [selectedTemplateId, setSelectedTemplateId] = useState<PosterTemplateId>("editorial-fnb");
  const [aspectRatio, setAspectRatio] = useState<PosterAspectRatio>("4:5");
  const [themeId, setThemeId] = useState<PosterThemeId>("cream");
  const [fontPresetId, setFontPresetId] = useState<PosterFontPresetId>("editorial");
  const [brandColor, setBrandColor] = useState<string>("#C2410C");

  // Poster Content State
  const [posterStoreName, setPosterStoreName] = useState<string>("");
  const [badgeText, setBadgeText] = useState<string>("SPESIAL HARI INI");
  const [headline, setHeadline] = useState<string>("Kopi Susu Gula Aren Segar Setiap Pagi");
  const [subheadline, setSubheadline] = useState<string>(
    "Racikan biji kopi pilihan dan gula aren murni. Siap menemani aktivitas harian Anda."
  );
  const [promoPrice, setPromoPrice] = useState<string>("Rp 18.000");
  const [originalPrice, setOriginalPrice] = useState<string>("Rp 24.000");
  const [showFooter, setShowFooter] = useState<boolean>(true);
  const [ctaText, setCtaText] = useState<string>("Pesan Sekarang & Kunjungi Outlet");
  const [contactText, setContactText] = useState<string>("");

  // Product Photo State
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState<string>("");
  const [loadedImageEl, setLoadedImageEl] = useState<HTMLImageElement | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imagePanX, setImagePanX] = useState<number>(0);
  const [imagePanY, setImagePanY] = useState<number>(0);
  const [isDraggingDropzone, setIsDraggingDropzone] = useState<boolean>(false);
  const [isPanningCanvas, setIsPanningCanvas] = useState<boolean>(false);
  const panDragStartRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Store Product Picker & AI Copy State
  const [productSearch, setProductSearch] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [goal, setGoal] = useState<string>("promo");
  const [tone, setTone] = useState<string>("santai");
  const [extraNote, setExtraNote] = useState<string>("");
  const [applyAiToPoster, setApplyAiToPoster] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Caption & Hashtag State
  const [caption, setCaption] = useState<string>(
    "Awali harimu dengan segelas Kopi Susu Gula Aren segar dari toko kami. Manisnya pas, kopinya terasa, dan harganya lebih hemat khusus minggu ini. Yuk mampir ke outlet atau pesan langsung sekarang!"
  );
  const [hashtags, setHashtags] = useState<string[]>([
    "#kopisusu",
    "#kulinerlokal",
    "#promohariini",
    "#umkmindonesia",
  ]);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [copiedMode, setCopiedMode] = useState<"all" | "caption" | null>(null);

  // Export & Cloud State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string>("");
  const [fontsReadyTick, setFontsReadyTick] = useState<number>(0);
  const [isUploadingCloud, setIsUploadingCloud] = useState<boolean>(false);
  const [cloudUrl, setCloudUrl] = useState<string>("");
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Modals: Instagram Account & BYOK
  const [igDialogOpen, setIgDialogOpen] = useState<boolean>(false);
  const [confirmDisconnectId, setConfirmDisconnectId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  const [byokModalOpen, setByokModalOpen] = useState<boolean>(false);
  const [byokKey, setByokKey] = useState<string>("");
  const [isSavingBYOK, setIsSavingBYOK] = useState<boolean>(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToastBanner({ type, message });
  }, []);

  useEffect(() => {
    if (!toastBanner) return;
    const timer = setTimeout(() => setToastBanner(null), 4500);
    return () => clearTimeout(timer);
  }, [toastBanner]);

  // Sync default store name & address when active store changes
  useEffect(() => {
    if (!activeStore) return;
    setPosterStoreName(activeStore.name);
    setContactText((prev) => {
      if (prev.trim()) return prev;
      return activeStore.address?.trim() || "";
    });
  }, [activeStore]);

  // Ensure web fonts trigger a crisp Canvas redraw once loaded
  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        setFontsReadyTick((t) => t + 1);
      });
    }
  }, []);

  // Load Store Products, Quota, and Connected Accounts
  const loadStoreData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoadingStoreData(true);
    try {
      const [prodRes, quotaRes, accRes] = await Promise.allSettled([
        api.products.list(activeStore.id),
        api.social.getQuota(activeStore.id),
        api.social.getAccounts(activeStore.id),
      ]);

      if (prodRes.status === "fulfilled") {
        const val = prodRes.value as Product[] | { products?: Product[]; data?: Product[] };
        const list = Array.isArray(val) ? val : val.products || val.data || [];
        setProducts(list.filter((p: Product) => p.is_active !== false));
      }

      if (quotaRes.status === "fulfilled") {
        setQuota(quotaRes.value);
      }

      if (accRes.status === "fulfilled" && accRes.value?.data) {
        setAccounts(accRes.value.data);
        const activeAcc = accRes.value.data.find((a: SocialAccount) => a.status === "active");
        if (activeAcc) {
          setContactText((prev) => prev.trim() || `@${activeAcc.username}`);
        }
      }
    } finally {
      setIsLoadingStoreData(false);
    }
  }, [activeStore]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  // Handle OAuth Redirect Query Params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");

    if (connected === "true") {
      showToast("success", "Akun Instagram Bisnis berhasil dihubungkan ke toko Anda.");
      loadStoreData();
      router.replace("/social");
    } else if (oauthError) {
      showToast("error", `Gagal menghubungkan Instagram: ${oauthError}`);
      router.replace("/social");
    }
  }, [searchParams, router, loadStoreData, showToast]);

  // Clean up object URL on unmount or photo change
  useEffect(() => {
    return () => {
      if (uploadedPhotoUrl && uploadedPhotoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedPhotoUrl);
      }
    };
  }, [uploadedPhotoUrl]);

  const connectedAccount = useMemo(
    () => accounts.find((acc) => acc.status === "active") ?? null,
    [accounts]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const discountPercent = useMemo(
    () => computeDiscountPercent(originalPrice, promoPrice),
    [originalPrice, promoPrice]
  );

  // Redraw Poster Canvas whenever visual or text state updates
  const redrawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderPosterToCanvas(canvas, {
      templateId: selectedTemplateId,
      aspectRatio,
      themeId,
      fontPresetId,
      brandColor,
      storeName: posterStoreName || activeStore?.name || "Toko Kami",
      badgeText,
      headline,
      subheadline,
      promoPrice,
      originalPrice,
      showFooter,
      ctaText,
      contactText,
      productImage: loadedImageEl,
      imageZoom,
      imagePanX,
      imagePanY,
    });

    setPreviewImgUrl(canvas.toDataURL("image/jpeg", 0.92));
  }, [
    selectedTemplateId,
    aspectRatio,
    themeId,
    fontPresetId,
    brandColor,
    posterStoreName,
    activeStore,
    badgeText,
    headline,
    subheadline,
    promoPrice,
    originalPrice,
    showFooter,
    ctaText,
    contactText,
    loadedImageEl,
    imageZoom,
    imagePanX,
    imagePanY,
  ]);

  useEffect(() => {
    redrawPoster();
  }, [redrawPoster, fontsReadyTick]);

  // Template Selection Handler (applies curated defaults smoothly)
  const handleSelectTemplate = (tmplId: PosterTemplateId) => {
    const meta = CURATED_TEMPLATES.find((t) => t.id === tmplId);
    setSelectedTemplateId(tmplId);
    if (meta) {
      setThemeId(meta.defaultTheme);
      setFontPresetId(meta.defaultFont);
      setBrandColor(meta.defaultBrandColor);
    }
    setCloudUrl("");
  };

  // Product Photo File Loader
  const handlePhotoFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Format file harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast("error", "Ukuran foto maksimal 15 MB agar pemrosesan tetap lancar.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setUploadedPhotoUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setUploadedPhotoName(file.name);
      setLoadedImageEl(img);
      setImageZoom(1);
      setImagePanX(0);
      setImagePanY(0);
      setCloudUrl("");
      setStageTab("canvas");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      showToast("error", "Gagal memuat file gambar. Silakan coba foto lain.");
    };
    img.src = objectUrl;
  };

  const handleClearPhoto = () => {
    if (uploadedPhotoUrl && uploadedPhotoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedPhotoUrl);
    }
    setUploadedPhotoUrl(null);
    setUploadedPhotoName("");
    setLoadedImageEl(null);
    setImageZoom(1);
    setImagePanX(0);
    setImagePanY(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Direct Drag-to-Pan on Live Poster Preview
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loadedImageEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanningCanvas(true);
    panDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: imagePanX,
      origPanY: imagePanY,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningCanvas || !panDragStartRef.current || !loadedImageEl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - panDragStartRef.current.startX) / Math.max(120, rect.width * 0.5);
    const dy = (e.clientY - panDragStartRef.current.startY) / Math.max(120, rect.height * 0.5);
    // Dragging right moves image right (reduces crop offset or shifts center naturally)
    const nextPanX = Math.max(-1, Math.min(1, panDragStartRef.current.origPanX + dx));
    const nextPanY = Math.max(-1, Math.min(1, panDragStartRef.current.origPanY + dy));
    setImagePanX(Number(nextPanX.toFixed(2)));
    setImagePanY(Number(nextPanY.toFixed(2)));
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningCanvas) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture was already released
      }
      setIsPanningCanvas(false);
      panDragStartRef.current = null;
    }
  };

  // Instant Product Fill + AI Selection
  const handleSelectStoreProduct = (product: Product) => {
    const alreadySelected = selectedProductIds.includes(product.id);
    if (alreadySelected) {
      setSelectedProductIds((prev) => prev.filter((id) => id !== product.id));
      return;
    }

    setSelectedProductIds((prev) => [...prev, product.id]);
    // Immediately populate poster headline & price without requiring AI quota
    setHeadline(product.name);
    setPromoPrice(formatIdr(product.sell_price));
    setOriginalPrice("");
    setStageTab("canvas");
    showToast("success", `"${product.name}" langsung diterapkan ke judul dan harga poster.`);
  };

  // AI Content Generator
  const handleGenerateAI = async () => {
    if (!activeStore) return;
    setIsGenerating(true);
    setCloudUrl("");

    try {
      const res: GenerateCaptionResponse = await api.social.generateCaption(activeStore.id, {
        product_ids: selectedProductIds,
        goal,
        tone,
        extra_note: extraNote,
      });

      if (applyAiToPoster) {
        if (res.headline) setHeadline(res.headline);
        if (res.subheadline) setSubheadline(res.subheadline);
      }
      if (res.caption) setCaption(res.caption);
      if (res.hashtags && res.hashtags.length > 0) setHashtags(res.hashtags);

      if (quota && !res.is_byok) {
        setQuota({
          ...quota,
          caption_left: res.quota_left,
          caption_used: quota.caption_used + 1,
        });
      }

      showToast(
        "success",
        applyAiToPoster
          ? "Judul poster dan caption AI berhasil diperbarui."
          : "Caption dan tagar AI berhasil dibuat."
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghasilkan teks dengan AI.";
      showToast("error", message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Poster as PNG or JPEG
  const handleDownloadPoster = (format: "png" | "jpeg") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawPoster();

    const mime = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = format === "png" ? canvas.toDataURL(mime) : canvas.toDataURL(mime, 0.94);
    const ratioSlug = aspectRatio.replace(":", "x");
    const storeSlug = (activeStore?.name || "artha").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const ext = format === "png" ? "png" : "jpg";

    const link = document.createElement("a");
    link.download = `poster-${storeSlug}-${ratioSlug}-${Date.now()}.${ext}`;
    link.href = dataUrl;
    link.click();

    showToast("success", `Poster resolusi penuh (${ASPECT_RATIO_SPECS[aspectRatio].sublabel}) berhasil diunduh.`);
  };

  // Quick Share via Web Share API (Mobile WA / IG) or Clipboard + Download Fallback
  const handleQuickShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSharing(true);

    try {
      redrawPoster();
      const fullCaption = `${caption.trim()}\n\n${hashtags.join(" ")}`.trim();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );

      if (blob && typeof navigator !== "undefined" && navigator.share) {
        const file = new File([blob], `poster-promo-${Date.now()}.png`, { type: "image/png" });
        const canShareFiles =
          typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

        if (canShareFiles) {
          await navigator.share({
            title: headline || "Poster Toko",
            text: fullCaption,
            files: [file],
          });
          showToast("success", "Poster dan caption siap dibagikan.");
          return;
        }
      }

      // Desktop fallback: copy caption to clipboard and download PNG
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(fullCaption);
      }
      handleDownloadPoster("png");
      showToast("success", "Poster diunduh & caption otomatis disalin ke clipboard untuk ditempel ke WA/IG.");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      showToast("error", "Gagal membuka menu bagikan perangkat.");
    } finally {
      setIsSharing(false);
    }
  };

  // Save Rendered Poster to ArthaOS Cloud
  const handleSaveToCloud = async () => {
    if (!activeStore || !canvasRef.current) return;
    setIsUploadingCloud(true);
    try {
      redrawPoster();
      const imageData = canvasRef.current.toDataURL("image/jpeg", 0.92);
      const res: RenderPosterResponse = await api.social.renderPoster(activeStore.id, {
        template_id: selectedTemplateId,
        headline,
        subheadline,
        price_text: promoPrice,
        brand_color: brandColor,
        theme: themeId,
        aspect_ratio: aspectRatio,
        store_name: posterStoreName || activeStore.name,
        image_data: imageData,
      });
      setCloudUrl(res.full_url);
      showToast("success", "Poster berhasil disimpan ke penyimpanan cloud toko.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan poster ke server.";
      showToast("error", message);
    } finally {
      setIsUploadingCloud(false);
    }
  };

  // Copy Caption Helpers
  const handleCopyText = async (mode: "all" | "caption") => {
    const textToCopy =
      mode === "all"
        ? `${caption.trim()}\n\n${hashtags.join(" ")}`.trim()
        : caption.trim();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 2000);
    } catch {
      showToast("error", "Gagal menyalin teks ke clipboard.");
    }
  };

  const handleAddHashtag = () => {
    const raw = newTagInput.trim().replace(/\s+/g, "");
    if (!raw) return;
    const formatted = raw.startsWith("#") ? raw : `#${raw}`;
    if (!hashtags.includes(formatted)) {
      setHashtags((prev) => [...prev, formatted]);
    }
    setNewTagInput("");
  };

  // Instagram Connect & Disconnect
  const handleConnectInstagram = async () => {
    if (!activeStore) return;
    setIsConnecting(true);
    try {
      const res = await api.social.connectAccount(activeStore.id);
      if (res.auth_url) {
        window.location.href = res.auth_url;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menghubungkan akun Instagram. Pastikan META_APP_ID sudah diatur di server.";
      showToast("error", message);
      setIsConnecting(false);
    }
  };

  const handleDisconnectInstagram = async (accountId: number) => {
    if (!activeStore) return;
    setIsDisconnecting(true);
    try {
      await api.social.disconnectAccount(activeStore.id, accountId);
      setAccounts([]);
      setConfirmDisconnectId(null);
      showToast("success", "Koneksi akun Instagram Bisnis berhasil diputuskan.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memutuskan akun Instagram.";
      showToast("error", message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // BYOK Save
  const handleSaveBYOK = async () => {
    if (!activeStore) return;
    setIsSavingBYOK(true);
    try {
      await api.social.setBYOK(activeStore.id, byokKey.trim(), "groq");
      const updatedQuota = await api.social.getQuota(activeStore.id);
      setQuota(updatedQuota);
      setByokKey("");
      setByokModalOpen(false);
      showToast(
        "success",
        byokKey.trim()
          ? "API Key pribadi (BYOK) aktif. Pembuatan caption AI kini tanpa batas."
          : "Kembali menggunakan kuota AI standar toko."
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan pengaturan API Key.";
      showToast("error", message);
    } finally {
      setIsSavingBYOK(false);
    }
  };

  const activeRatioSpec = ASPECT_RATIO_SPECS[aspectRatio];
  const fallbackStoreName = activeStore?.name || "Toko Pilihan";

  return (
    <AppLayout>
      {/* Hidden font preloader spans so browser fetches curated poster typefaces immediately on /social */}
      <div className="sr-only" aria-hidden="true">
        <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800 }}>ArthaPoster</span>
        <span style={{ fontFamily: "var(--font-playfair)", fontWeight: 700 }}>ArthaPoster</span>
        <span style={{ fontFamily: "var(--font-grotesk)", fontWeight: 700 }}>ArthaPoster</span>
        <span style={{ fontFamily: "var(--font-dmsans)", fontWeight: 700 }}>ArthaPoster</span>
      </div>

      {/* Offscreen High-DPI Render Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-5">
        {/* Studio Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Studio Poster & Konten Sosial
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Desain materi promosi siap unggah untuk Feed Instagram, Status WhatsApp, dan katalog produk toko.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Compact Instagram Status Trigger */}
            <Button
              type="button"
              variant="outline"
              disabled={!activeStore}
              onClick={() => {
                setConfirmDisconnectId(null);
                setIgDialogOpen(true);
              }}
              className="min-h-11 px-3.5 gap-2 text-xs font-medium rounded-lg"
            >
              <InstagramIcon className="w-4 h-4 text-foreground" />
              {connectedAccount ? (
                <>
                  <span className="truncate max-w-[130px]">@{connectedAccount.username}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                </>
              ) : (
                <span>Akun Instagram</span>
              )}
            </Button>

            {/* Quota & BYOK Trigger */}
            <Button
              type="button"
              variant="outline"
              disabled={!activeStore}
              onClick={() => setByokModalOpen(true)}
              className="min-h-11 px-3.5 gap-2 text-xs font-medium rounded-lg"
            >
              <Key className="w-4 h-4 text-primary" />
              {quota?.has_byok ? (
                <span>AI: BYOK Aktif</span>
              ) : (
                <span>
                  Kuota AI: <strong className="text-foreground">{quota ? `${quota.caption_left}/${quota.caption_limit}` : "15"}</strong>
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Store Sync Info Banner when no active store is selected */}
        {!isLoadingStores && !activeStore && (
          <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex items-center gap-2.5 text-xs text-muted-foreground">
            <StoreIcon className="w-4 h-4 text-primary shrink-0" />
            <span>
              Mode desain cepat aktif: Anda tetap dapat mengedit poster, mengunggah foto, dan mengunduh PNG/JPG sekarang. Pilih atau masuk ke akun toko di menu samping untuk menyinkronkan produk inventori dan asisten AI.
            </span>
          </div>
        )}

        {/* Inline Toast Feedback Banner */}
        {toastBanner && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
              toastBanner.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : "bg-destructive/10 text-destructive border-destructive/25"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastBanner.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toastBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastBanner(null)}
              className="min-w-11 min-h-11 -my-2 -mr-2 flex items-center justify-center rounded-lg opacity-75 hover:opacity-100"
              aria-label="Tutup pesan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SPLIT STICKY WORKSPACE: Preview first on mobile so edits are visible immediately */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT INSPECTOR (5 cols on desktop, second on mobile) */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <Card className="rounded-xl border-border overflow-hidden">
              {/* 4-Tab Studio Inspector Navigation */}
              <div
                role="tablist"
                aria-label="Pengaturan desain poster"
                className="grid grid-cols-4 border-b border-border bg-muted/40 p-1 gap-1"
              >
                {[
                  { id: "design" as const, label: "Desain", icon: Palette },
                  { id: "media" as const, label: "Foto", icon: ImagePlus },
                  { id: "content" as const, label: "Teks", icon: Type },
                  { id: "ai" as const, label: "AI Copy", icon: Wand2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-h-11 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                          ? "bg-card text-foreground font-semibold border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="whitespace-nowrap text-xs">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <CardContent className="p-4 sm:p-5 space-y-5">
                {/* ==================== TAB 1: DESAIN ==================== */}
                {activeTab === "design" && (
                  <div className="space-y-5">
                    {/* Aspect Ratio Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ukuran & Format Kanvas
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(ASPECT_RATIO_SPECS) as PosterAspectRatio[]).map((ratioKey) => {
                          const spec = ASPECT_RATIO_SPECS[ratioKey];
                          const isSelected = aspectRatio === ratioKey;
                          return (
                            <button
                              key={ratioKey}
                              type="button"
                              onClick={() => {
                                setAspectRatio(ratioKey);
                                setStageTab("canvas");
                              }}
                              className={`min-h-12 p-2.5 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <div className="text-xs font-semibold text-foreground">{spec.shortLabel}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">{spec.sublabel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Curated 6 Visual Template Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Pilih Tata Letak Template
                        </Label>
                        <span className="text-[11px] text-muted-foreground">6 gaya kurasi</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {CURATED_TEMPLATES.map((tmpl) => {
                          const isSelected = selectedTemplateId === tmpl.id;
                          return (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => handleSelectTemplate(tmpl.id)}
                              className={`p-2 rounded-xl border text-left transition-colors flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border bg-background hover:bg-muted/40"
                              }`}
                            >
                              <TemplateThumbnail
                                templateId={tmpl.id}
                                themeId={isSelected ? themeId : tmpl.defaultTheme}
                                brandColor={isSelected ? brandColor : tmpl.defaultBrandColor}
                                hasPhoto={Boolean(loadedImageEl)}
                              />
                              <div>
                                <div className="text-xs font-semibold text-foreground leading-tight">
                                  {tmpl.shortName}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {tmpl.categoryLabel}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Surface Theme Mode */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Suasana Warna Dasar
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(POSTER_THEMES) as PosterThemeId[]).map((tKey) => {
                          const tMeta = POSTER_THEMES[tKey];
                          const isSelected = themeId === tKey;
                          return (
                            <button
                              key={tKey}
                              type="button"
                              onClick={() => setThemeId(tKey)}
                              className={`min-h-11 px-3 py-2 rounded-lg border flex items-center gap-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                                  : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-border shrink-0"
                                style={{ backgroundColor: tMeta.previewSwatch }}
                                aria-hidden="true"
                              />
                              <span className="truncate">{tMeta.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Curated Font Pairings */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Gaya Tipografi Poster
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(FONT_PRESETS) as PosterFontPresetId[]).map((fKey) => {
                          const fMeta = FONT_PRESETS[fKey];
                          const isSelected = fontPresetId === fKey;
                          return (
                            <button
                              key={fKey}
                              type="button"
                              onClick={() => setFontPresetId(fKey)}
                              className={`min-h-12 p-2.5 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-background hover:bg-muted/50"
                              }`}
                            >
                              <div
                                className="text-sm font-bold text-foreground leading-tight"
                                style={{ fontFamily: `var(${fMeta.headingVar}), sans-serif` }}
                              >
                                {fMeta.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {fMeta.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Brand Accent Color Swatches (44px accessible hit areas) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Warna Aksen Toko
                        </Label>
                        <span className="text-xs font-mono text-muted-foreground uppercase">
                          {brandColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {BRAND_COLOR_SWATCHES.map((swatch) => {
                          const isSelected = brandColor.toLowerCase() === swatch.hex.toLowerCase();
                          return (
                            <button
                              key={swatch.hex}
                              type="button"
                              onClick={() => setBrandColor(swatch.hex)}
                              title={swatch.name}
                              aria-label={`Pilih warna ${swatch.name}`}
                              className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background hover:bg-muted/50"
                              }`}
                            >
                              <span
                                className="w-6 h-6 rounded-full border border-black/15 dark:border-white/20"
                                style={{ backgroundColor: swatch.hex }}
                              />
                            </button>
                          );
                        })}

                        <label
                          title="Pilih warna kustom"
                          className="min-h-11 px-3 rounded-lg border border-border bg-background hover:bg-muted/50 flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer"
                        >
                          <input
                            type="color"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                            aria-label="Pemilih warna kustom"
                          />
                          <span>Kustom</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== TAB 2: FOTO & PRODUK ==================== */}
                {activeTab === "media" && (
                  <div className="space-y-5">
                    {/* Product Photo Upload & Framing */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Foto Produk / Makanan (Opsional)
                        </Label>
                        {loadedImageEl && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Foto Aktif
                          </span>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                        className="hidden"
                      />

                      {!loadedImageEl ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingDropzone(true);
                          }}
                          onDragLeave={() => setIsDraggingDropzone(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingDropzone(false);
                            handlePhotoFile(e.dataTransfer.files?.[0]);
                          }}
                          className={`p-5 rounded-xl border-2 border-dashed text-center transition-colors ${
                            isDraggingDropzone
                              ? "border-primary bg-primary/5"
                              : "border-border bg-muted/20 hover:bg-muted/40"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2.5">
                            <ImagePlus className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Unggah foto menu atau produk nyata
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tarik foto ke sini atau ambil dari galeri HP. Tanpa foto pun poster tetap tampil rapi dengan mode tipografi.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3.5 min-h-11 px-4 text-xs font-semibold gap-2"
                          >
                            <ImagePlus className="w-4 h-4" />
                            Pilih Foto dari Perangkat
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {uploadedPhotoUrl && (
                                <img
                                  src={uploadedPhotoUrl}
                                  alt="Foto produk terpilih"
                                  className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {uploadedPhotoName || "Foto Produk"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Bisa digeser langsung pada pratinjau kanvas
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="min-h-11 px-3 text-xs"
                              >
                                Ganti
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleClearPhoto}
                                className="min-h-11 min-w-11 px-2.5 text-destructive hover:bg-destructive/10"
                                aria-label="Hapus foto produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Zoom & Pan Sliders */}
                          <div className="space-y-2.5 pt-2 border-t border-border">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Perbesar Foto (Zoom)</span>
                                <span className="font-mono text-foreground">{Math.round(imageZoom * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="2.4"
                                step="0.05"
                                value={imageZoom}
                                onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                                className="w-full h-2 accent-primary cursor-pointer"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                  <span>Geser Kiri/Kanan</span>
                                  <span className="font-mono">{Math.round(imagePanX * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="-1"
                                  max="1"
                                  step="0.05"
                                  value={imagePanX}
                                  onChange={(e) => setImagePanX(parseFloat(e.target.value))}
                                  className="w-full h-2 accent-primary cursor-pointer"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                  <span>Geser Atas/Bawah</span>
                                  <span className="font-mono">{Math.round(imagePanY * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="-1"
                                  max="1"
                                  step="0.05"
                                  value={imagePanY}
                                  onChange={(e) => setImagePanY(parseFloat(e.target.value))}
                                  className="w-full h-2 accent-primary cursor-pointer"
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setImageZoom(1);
                                setImagePanX(0);
                                setImagePanY(0);
                              }}
                              className="w-full min-h-11 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset Posisi & Zoom Foto
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Store Products Quick Fill */}
                    <div className="space-y-2.5 pt-2 border-t border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Pilih Produk Toko (Isi Instan)
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Klik produk untuk langsung mengisi judul dan harga di poster tanpa kuota AI.
                          </p>
                        </div>
                        {selectedProductIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedProductIds([])}
                            className="min-h-11 px-2 text-xs text-primary font-medium hover:underline shrink-0"
                          >
                            Reset ({selectedProductIds.length})
                          </button>
                        )}
                      </div>

                      {products.length > 4 && (
                        <div className="relative">
                          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Cari nama produk atau SKU..."
                            className="pl-9 h-11 text-xs rounded-lg"
                          />
                        </div>
                      )}

                      {isLoadingStoreData ? (
                        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground text-center">
                          Memuat daftar produk aktif toko...
                        </div>
                      ) : products.length === 0 ? (
                        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground text-center">
                          Belum ada produk aktif di inventori toko ini. Anda tetap bisa menulis teks promo secara bebas di tab Teks & Harga.
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground text-center">
                          Tidak ada produk yang cocok dengan pencarian &ldquo;{productSearch}&rdquo;.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {filteredProducts.map((prod) => {
                            const isSelected = selectedProductIds.includes(prod.id);
                            return (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => handleSelectStoreProduct(prod)}
                                className={`w-full min-h-11 px-3 py-2 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                  isSelected
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border bg-background hover:bg-muted/50 text-foreground"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-medium truncate">{prod.name}</div>
                                  {prod.sku && (
                                    <div className="text-[11px] text-muted-foreground font-mono">
                                      {prod.sku}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-semibold font-mono text-foreground">
                                    {formatIdr(prod.sell_price)}
                                  </span>
                                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== TAB 3: TEKS & HARGA ==================== */}
                {activeTab === "content" && (
                  <div className="space-y-4">
                    {/* Top Badge Label */}
                    <div className="space-y-2">
                      <Label htmlFor="poster_badge" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Label Badge Atas (Opsional)
                      </Label>
                      <Input
                        id="poster_badge"
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        placeholder="Contoh: PROMO AKHIR PEKAN"
                        className="h-11 text-xs font-medium rounded-lg"
                        maxLength={32}
                      />
                      <div className="flex flex-wrap gap-2">
                        {BADGE_QUICK_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setBadgeText(chip)}
                            className="min-h-11 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground"
                          >
                            {chip}
                          </button>
                        ))}
                        {badgeText && (
                          <button
                            type="button"
                            onClick={() => setBadgeText("")}
                            className="min-h-11 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                          >
                            Sembunyikan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-1.5">
                      <Label htmlFor="poster_headline" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Judul Utama Poster
                      </Label>
                      <Textarea
                        id="poster_headline"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="Tulis judul promo atau nama menu unggulan"
                        rows={2}
                        className="text-sm font-semibold resize-none rounded-lg"
                        maxLength={110}
                      />
                    </div>

                    {/* Subheadline */}
                    <div className="space-y-1.5">
                      <Label htmlFor="poster_subheadline" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Deskripsi Singkat (Subjudul)
                      </Label>
                      <Textarea
                        id="poster_subheadline"
                        value={subheadline}
                        onChange={(e) => setSubheadline(e.target.value)}
                        placeholder="Tambahkan keterangan singkat produk, syarat promo, atau jam berlaku"
                        rows={2}
                        className="text-xs resize-none rounded-lg"
                        maxLength={220}
                      />
                    </div>

                    {/* Promo Price & Strikethrough Price */}
                    <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Informasi Harga & Diskon
                        </Label>
                        {discountPercent && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                            Otomatis: Hemat {discountPercent}%
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="promo_price" className="text-xs text-foreground font-medium">
                            Harga Jual / Promo
                          </Label>
                          <Input
                            id="promo_price"
                            value={promoPrice}
                            onChange={(e) => setPromoPrice(e.target.value)}
                            placeholder="Contoh: Rp 18.000"
                            className="h-11 text-xs font-semibold rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="orig_price" className="text-xs text-muted-foreground">
                            Harga Normal Coret (Opsional)
                          </Label>
                          <Input
                            id="orig_price"
                            value={originalPrice}
                            onChange={(e) => setOriginalPrice(e.target.value)}
                            placeholder="Contoh: Rp 24.000"
                            className="h-11 text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Store Name & Dynamic Footer */}
                    <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="poster_store_name" className="text-xs text-foreground font-medium">
                          Nama Toko di Header Poster
                        </Label>
                        <Input
                          id="poster_store_name"
                          value={posterStoreName}
                          onChange={(e) => setPosterStoreName(e.target.value)}
                          placeholder={fallbackStoreName}
                          className="h-11 text-xs rounded-lg"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <Label htmlFor="toggle_footer" className="text-xs font-medium text-foreground cursor-pointer">
                          Tampilkan Baris Ajakan & Kontak Bawah
                        </Label>
                        <input
                          id="toggle_footer"
                          type="checkbox"
                          checked={showFooter}
                          onChange={(e) => setShowFooter(e.target.checked)}
                          className="w-5 h-5 accent-primary rounded cursor-pointer"
                        />
                      </div>

                      {showFooter && (
                        <div className="space-y-2.5 pt-1">
                          <div className="space-y-1">
                            <Label htmlFor="cta_text" className="text-xs text-muted-foreground">
                              Teks Ajakan (CTA)
                            </Label>
                            <Input
                              id="cta_text"
                              value={ctaText}
                              onChange={(e) => setCtaText(e.target.value)}
                              placeholder="Contoh: Pesan Sekarang via WhatsApp"
                              className="h-11 text-xs rounded-lg"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="contact_text" className="text-xs text-muted-foreground">
                              Info Kontak / Alamat / Username IG
                            </Label>
                            <Input
                              id="contact_text"
                              value={contactText}
                              onChange={(e) => setContactText(e.target.value)}
                              placeholder="Contoh: WA 0812-xxxx-xxxx atau Jl. Merdeka No. 10"
                              className="h-11 text-xs rounded-lg"
                            />
                            <div className="flex flex-wrap gap-2">
                              {connectedAccount && (
                                <button
                                  type="button"
                                  onClick={() => setContactText(`@${connectedAccount.username}`)}
                                  className="min-h-11 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium"
                                >
                                  Pakai @{connectedAccount.username}
                                </button>
                              )}
                              {activeStore?.address && (
                                <button
                                  type="button"
                                  onClick={() => setContactText(activeStore.address || "")}
                                  className="min-h-11 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium truncate max-w-[240px]"
                                >
                                  Pakai Alamat Toko
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== TAB 4: ASISTEN AI ==================== */}
                {activeTab === "ai" && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                      Gunakan asisten copywriting untuk merangkai kalimat judul poster, caption Instagram/WhatsApp, dan rekomendasi tagar secara otomatis.
                    </div>

                    {/* Goal Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tujuan Promosi
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {GOAL_OPTIONS.map((item) => {
                          const Icon = item.icon;
                          const isSelected = goal === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGoal(item.id)}
                              className={`min-h-12 p-3 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-background hover:bg-muted/40 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                <span className="font-semibold text-xs">{item.label}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {item.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tone Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Gaya Bahasa
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {TONE_OPTIONS.map((item) => {
                          const isSelected = tone === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setTone(item.id)}
                              className={`min-h-11 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                                  : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Extra Promo Context */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ai_extra_note" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Detail Promo Tambahan (Opsional)
                      </Label>
                      <Textarea
                        id="ai_extra_note"
                        value={extraNote}
                        onChange={(e) => setExtraNote(e.target.value)}
                        placeholder="Contoh: Beli 2 gratis 1 khusus Jumat sampai Minggu, tersedia pesan antar."
                        rows={3}
                        className="text-xs resize-none rounded-lg"
                        maxLength={1000}
                      />
                      {selectedProductIds.length > 0 && (
                        <p className="text-[11px] text-primary font-medium">
                          Menyertakan {selectedProductIds.length} produk terpilih dari tab Foto & Produk.
                        </p>
                      )}
                    </div>

                    <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={applyAiToPoster}
                        onChange={(e) => setApplyAiToPoster(e.target.checked)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      <span>Perbarui juga teks Judul & Subjudul di kanvas poster</span>
                    </label>

                    <Button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={isGenerating || !activeStore}
                      className="w-full min-h-11 gap-2 text-sm font-semibold rounded-lg"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Menyusun Teks Promosi...
                        </>
                      ) : (
                        <>
                          {/* Purpose (R-04): Wand2 marks explicit user-triggered AI text generation */}
                          <Wand2 className="w-4 h-4" />
                          Buat Teks & Caption AI
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT STICKY STAGE (7 cols on desktop, first on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-7 lg:sticky lg:top-6 space-y-4">
            <Card className="rounded-xl border-border overflow-hidden">
              {/* Stage Header with Canvas vs Caption Switcher */}
              <div className="px-4 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="Mode tampilan studio"
                  className="inline-flex rounded-lg border border-border bg-muted/40 p-1 gap-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={stageTab === "canvas"}
                    onClick={() => setStageTab("canvas")}
                    className={`min-h-11 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      stageTab === "canvas"
                        ? "bg-card text-foreground font-semibold border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Kanvas Poster
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={stageTab === "caption"}
                    onClick={() => setStageTab("caption")}
                    className={`min-h-11 px-3.5 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      stageTab === "caption"
                        ? "bg-card text-foreground font-semibold border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Caption & Tagar</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {hashtags.length}
                    </Badge>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {activeRatioSpec.label}
                  </Badge>
                </div>
              </div>

              {stageTab === "canvas" ? (
                <>
                  {/* Matte Neutral Live Poster Stage */}
                  <div className="p-3 sm:p-5 bg-muted/40 flex flex-col items-center justify-center">
                    <div
                      onPointerDown={handleStagePointerDown}
                      onPointerMove={handleStagePointerMove}
                      onPointerUp={handleStagePointerUp}
                      onPointerCancel={handleStagePointerUp}
                      style={{
                        aspectRatio: `${activeRatioSpec.width} / ${activeRatioSpec.height}`,
                      }}
                      className={`relative max-h-[300px] sm:max-h-[410px] lg:max-h-[450px] w-auto max-w-full rounded-xl overflow-hidden border border-border bg-card select-none ${
                        loadedImageEl ? "cursor-grab active:cursor-grabbing touch-none" : ""
                      }`}
                    >
                      {previewImgUrl ? (
                        <img
                          src={previewImgUrl}
                          alt="Pratinjau langsung poster toko"
                          draggable={false}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <div className="w-64 h-80 flex items-center justify-center text-xs text-muted-foreground">
                          Menyiapkan kanvas poster...
                        </div>
                      )}
                    </div>

                    {loadedImageEl && (
                      <p className="mt-2.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-primary" />
                        Geser langsung pada poster untuk mengatur posisi foto produk
                      </p>
                    )}
                  </div>

                  {/* Export, Share & Cloud Action Footer */}
                  <div className="p-4 bg-card border-t border-border space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        type="button"
                        onClick={() => handleDownloadPoster("png")}
                        className="min-h-11 gap-1.5 text-xs font-semibold rounded-lg"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Unduh PNG</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleDownloadPoster("jpeg")}
                        className="min-h-11 gap-1.5 text-xs font-semibold rounded-lg"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Unduh JPG</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleQuickShare}
                        disabled={isSharing}
                        className="min-h-11 gap-1.5 text-xs font-medium rounded-lg"
                      >
                        <Share2 className="w-4 h-4 shrink-0" />
                        <span>{isSharing ? "Menyiapkan..." : "Bagikan WA/IG"}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveToCloud}
                        disabled={isUploadingCloud || !activeStore}
                        className="min-h-11 gap-1.5 text-xs font-medium rounded-lg"
                      >
                        {isUploadingCloud ? (
                          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <CloudUpload className="w-4 h-4 shrink-0" />
                        )}
                        <span>Simpan Cloud</span>
                      </Button>
                    </div>

                    {cloudUrl && (
                      <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs flex items-center justify-between gap-3">
                        <span className="truncate text-muted-foreground font-mono text-[11px]">
                          {cloudUrl}
                        </span>
                        <a
                          href={cloudUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-11 px-3 inline-flex items-center gap-1 text-primary font-semibold hover:underline shrink-0"
                        >
                          Buka File <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* CAPTION & HASHTAGS STAGE VIEW */
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        Editor Caption & Tagar
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Sesuaikan caption sebelum ditempel ke Instagram, WhatsApp, atau Facebook.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyText("caption")}
                        className="min-h-11 px-3 gap-1.5 text-xs rounded-lg"
                      >
                        {copiedMode === "caption" ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Caption</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCopyText("all")}
                        className="min-h-11 px-3.5 gap-1.5 text-xs font-semibold rounded-lg"
                      >
                        {copiedMode === "all" ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Caption + Tagar Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Semua</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Tulis caption promosi di sini..."
                      rows={8}
                      className="text-sm leading-relaxed rounded-lg"
                    />
                    <div className="flex justify-end text-[11px] text-muted-foreground">
                      {caption.length} karakter
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-border">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tagar Promosi ({hashtags.length})
                    </Label>

                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setHashtags((prev) => prev.filter((t) => t !== tag))}
                          title={`Klik untuk menghapus ${tag}`}
                          className="min-h-11 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-destructive/10 border border-border text-xs font-mono text-foreground hover:text-destructive transition-colors"
                        >
                          <span>{tag}</span>
                          <X className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddHashtag();
                          }
                        }}
                        placeholder="Tambah tagar baru (misal: kulinerbandung)"
                        className="h-11 text-xs rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddHashtag}
                        className="min-h-11 px-4 gap-1.5 text-xs shrink-0 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* INSTAGRAM INTEGRATION DIALOG */}
      <Dialog open={igDialogOpen} onOpenChange={setIgDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <InstagramIcon className="w-5 h-5 text-primary" />
              Integrasi Akun Instagram Bisnis
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Hubungkan akun Instagram Business atau Creator toko Anda untuk menyinkronkan username toko di poster dan fitur publikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {connectedAccount ? (
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    @{connectedAccount.username}
                  </span>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Terhubung
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {connectedAccount.token_expires_at
                      ? `Akses aktif hingga ${new Date(connectedAccount.token_expires_at).toLocaleDateString("id-ID")}`
                      : "Token akses aktif"}
                  </span>
                </div>

                {confirmDisconnectId === connectedAccount.id ? (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 space-y-2.5 mt-2">
                    <p className="text-xs text-destructive font-medium">
                      Yakin ingin memutuskan koneksi @{connectedAccount.username} dari toko ini?
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDisconnectId(null)}
                        className="min-h-11 text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnectInstagram(connectedAccount.id)}
                        disabled={isDisconnecting}
                        className="min-h-11 text-xs"
                      >
                        {isDisconnecting ? "Memutuskan..." : "Ya, Putuskan"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDisconnectId(connectedAccount.id)}
                    className="w-full min-h-11 text-xs text-destructive hover:bg-destructive/10 gap-1.5 mt-1"
                  >
                    <Unlink className="w-4 h-4" />
                    Putuskan Akun Instagram
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Belum ada akun Instagram Bisnis yang terhubung. Anda tetap bisa membuat, mengunduh, dan membagikan poster resolusi penuh secara bebas tanpa menghubungkan akun.
                </p>
                <Button
                  type="button"
                  onClick={handleConnectInstagram}
                  disabled={isConnecting}
                  className="w-full min-h-11 gap-2 text-xs font-semibold"
                >
                  <InstagramIcon className="w-4 h-4" />
                  {isConnecting ? "Mengarahkan ke Meta..." : "Hubungkan Instagram Bisnis"}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIgDialogOpen(false)}
              className="min-h-11 text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BYOK API KEY DIALOG */}
      <Dialog open={byokModalOpen} onOpenChange={setByokModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Key className="w-5 h-5 text-primary" />
              Gunakan API Key Sendiri (BYOK)
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Masukkan Groq API Key pribadi Anda untuk membuka batas kuota bulanan pembuatan teks promosi AI. Kunci disimpan terenkripsi AES-256-GCM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="byok_input" className="text-xs font-medium">
                Groq API Key (gsk_...)
              </Label>
              <Input
                id="byok_input"
                type="password"
                value={byokKey}
                onChange={(e) => setByokKey(e.target.value)}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                className="h-11 font-mono text-xs rounded-lg"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Kosongkan kolom lalu klik simpan apabila ingin kembali memakai kuota standar toko ({quota ? `${quota.caption_left}/${quota.caption_limit}` : "15"} tersisa bulan ini).
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setByokModalOpen(false)}
              className="min-h-11 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveBYOK}
              disabled={isSavingBYOK}
              className="min-h-11 text-xs font-semibold"
            >
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
      <SocialStudioContent />
    </Suspense>
  );
}
