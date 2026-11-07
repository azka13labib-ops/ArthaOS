// High-resolution HTML5 Canvas 2D Poster Layout & Typography Engine for ArthaOS

export type PosterAspectRatio = "4:5" | "9:16" | "1:1";
export type PosterThemeId = "light" | "cream" | "dark";
export type PosterFontPresetId = "modern" | "editorial" | "promo-bold" | "warm-casual";
export type PosterTemplateId =
  | "editorial-fnb"
  | "promo-deal"
  | "hero-scrim"
  | "new-arrival"
  | "warm-artisan"
  | "tips-quote";

export interface AspectRatioSpec {
  id: PosterAspectRatio;
  label: string;
  shortLabel: string;
  sublabel: string;
  width: number;
  height: number;
}

export const ASPECT_RATIO_SPECS: Record<PosterAspectRatio, AspectRatioSpec> = {
  "4:5": {
    id: "4:5",
    label: "Feed IG (4:5)",
    shortLabel: "4:5 Feed",
    sublabel: "1080 x 1350 px",
    width: 1080,
    height: 1350,
  },
  "9:16": {
    id: "9:16",
    label: "Story / Status WA (9:16)",
    shortLabel: "9:16 Story",
    sublabel: "1080 x 1920 px",
    width: 1080,
    height: 1920,
  },
  "1:1": {
    id: "1:1",
    label: "Persegi Katalog (1:1)",
    shortLabel: "1:1 Katalog",
    sublabel: "1080 x 1080 px",
    width: 1080,
    height: 1080,
  },
};

export interface PosterThemePalette {
  id: PosterThemeId;
  name: string;
  bgStart: string;
  bgEnd: string;
  surface: string;
  surfaceElevated: string;
  ink: string;
  muted: string;
  border: string;
  subtleFill: string;
  previewSwatch: string;
}

export const POSTER_THEMES: Record<PosterThemeId, PosterThemePalette> = {
  light: {
    id: "light",
    name: "Terang Bersih",
    bgStart: "#FAF9F6",
    bgEnd: "#F1EFEA",
    surface: "#FFFFFF",
    surfaceElevated: "#F8FAFC",
    ink: "#111827",
    muted: "#4B5563",
    border: "rgba(17, 24, 39, 0.12)",
    subtleFill: "rgba(17, 24, 39, 0.045)",
    previewSwatch: "#FAF9F6",
  },
  cream: {
    id: "cream",
    name: "Krem Hangat",
    bgStart: "#F5EFE6",
    bgEnd: "#EAE0D0",
    surface: "#FCF9F4",
    surfaceElevated: "#F3ECE1",
    ink: "#241710",
    muted: "#665242",
    border: "rgba(36, 23, 16, 0.14)",
    subtleFill: "rgba(36, 23, 16, 0.055)",
    previewSwatch: "#F2E8D9",
  },
  dark: {
    id: "dark",
    name: "Gelap Kontras",
    bgStart: "#121318",
    bgEnd: "#0B0C10",
    surface: "#1A1D24",
    surfaceElevated: "#222630",
    ink: "#F8FAFC",
    muted: "#A1A1AA",
    border: "rgba(255, 255, 255, 0.14)",
    subtleFill: "rgba(255, 255, 255, 0.06)",
    previewSwatch: "#14161D",
  },
};

export interface FontPresetMeta {
  id: PosterFontPresetId;
  name: string;
  desc: string;
  headingVar: string;
  headingWeight: number;
  bodyVar: string;
  bodyWeight: number;
  priceVar: string;
  priceWeight: number;
}

export const FONT_PRESETS: Record<PosterFontPresetId, FontPresetMeta> = {
  modern: {
    id: "modern",
    name: "Modern Bersih",
    desc: "Plus Jakarta Sans tegas & rapi",
    headingVar: "--font-jakarta",
    headingWeight: 800,
    bodyVar: "--font-jakarta",
    bodyWeight: 500,
    priceVar: "--font-jakarta",
    priceWeight: 800,
  },
  editorial: {
    id: "editorial",
    name: "Editorial Serif",
    desc: "Playfair Display + Sans klasik",
    headingVar: "--font-playfair",
    headingWeight: 700,
    bodyVar: "--font-jakarta",
    bodyWeight: 500,
    priceVar: "--font-jakarta",
    priceWeight: 800,
  },
  "promo-bold": {
    id: "promo-bold",
    name: "Promo Tegas",
    desc: "Space Grotesk mencolok untuk diskon",
    headingVar: "--font-grotesk",
    headingWeight: 700,
    bodyVar: "--font-dmsans",
    bodyWeight: 500,
    priceVar: "--font-grotesk",
    priceWeight: 700,
  },
  "warm-casual": {
    id: "warm-casual",
    name: "Hangat Kasual",
    desc: "DM Sans ramah untuk kuliner & harian",
    headingVar: "--font-dmsans",
    headingWeight: 700,
    bodyVar: "--font-jakarta",
    bodyWeight: 400,
    priceVar: "--font-dmsans",
    priceWeight: 700,
  },
};

export interface CuratedTemplateMeta {
  id: PosterTemplateId;
  name: string;
  shortName: string;
  categoryLabel: string;
  description: string;
  defaultBrandColor: string;
  defaultTheme: PosterThemeId;
  defaultFont: PosterFontPresetId;
  defaultBadge: string;
}

export const CURATED_TEMPLATES: CuratedTemplateMeta[] = [
  {
    id: "editorial-fnb",
    name: "Editorial Kuliner & Kopi",
    shortName: "Editorial F&B",
    categoryLabel: "Menu & Kuliner",
    description: "Bingkai foto proporsional dengan tipografi menu editorial hangat.",
    defaultBrandColor: "#C2410C",
    defaultTheme: "cream",
    defaultFont: "editorial",
    defaultBadge: "SPESIAL HARI INI",
  },
  {
    id: "promo-deal",
    name: "Promo Diskon & Harga Coret",
    shortName: "Promo Diskon",
    categoryLabel: "Flash Sale",
    description: "Sorotan tiket harga coret, persen hemat otomatis, dan CTA tegas.",
    defaultBrandColor: "#E11D48",
    defaultTheme: "light",
    defaultFont: "promo-bold",
    defaultBadge: "PROMO TERBATAS",
  },
  {
    id: "hero-scrim",
    name: "Foto Penuh (Full Hero)",
    shortName: "Foto Penuh",
    categoryLabel: "Visual Fokus",
    description: "Foto produk memenuhi kanvas dengan gradasi baca sinematik.",
    defaultBrandColor: "#D97706",
    defaultTheme: "dark",
    defaultFont: "modern",
    defaultBadge: "MENU FAVORIT",
  },
  {
    id: "new-arrival",
    name: "Katalog Minimalis Bersih",
    shortName: "Katalog Bersih",
    categoryLabel: "Produk Baru",
    description: "Grid galeri bergaris tipis ala butik dan katalog produk modern.",
    defaultBrandColor: "#0F766E",
    defaultTheme: "light",
    defaultFont: "modern",
    defaultBadge: "KOLEKSI BARU",
  },
  {
    id: "warm-artisan",
    name: "Bingkai Lengkung Artisan",
    shortName: "Lengkung Artisan",
    categoryLabel: "Hampers & Roti",
    description: "Jendela lengkung lembut untuk kuliner rumahan, paket, & bakery.",
    defaultBrandColor: "#9333EA",
    defaultTheme: "cream",
    defaultFont: "warm-casual",
    defaultBadge: "BUATAN SEGAR",
  },
  {
    id: "tips-quote",
    name: "Info Toko & Kutipan",
    shortName: "Info & Kutipan",
    categoryLabel: "Pengumuman",
    description: "Tata letak pengumuman jam buka, edukasi, atau kutipan toko.",
    defaultBrandColor: "#2563EB",
    defaultTheme: "light",
    defaultFont: "editorial",
    defaultBadge: "INFO PELANGGAN",
  },
];

export interface PosterRenderState {
  templateId: string;
  aspectRatio: PosterAspectRatio;
  themeId: PosterThemeId;
  fontPresetId: PosterFontPresetId;
  brandColor: string;
  storeName: string;
  badgeText: string;
  headline: string;
  subheadline: string;
  promoPrice: string;
  originalPrice: string;
  showFooter: boolean;
  ctaText: string;
  contactText: string;
  productImage: HTMLImageElement | null;
  imageZoom: number; // 1.0 to 2.5
  imagePanX: number; // -1.0 to 1.0
  imagePanY: number; // -1.0 to 1.0
}

interface ResolvedFonts {
  heading: string;
  headingWeight: number;
  body: string;
  bodyWeight: number;
  price: string;
  priceWeight: number;
}

function resolveCssFontFamily(cssVarName: string): string {
  if (typeof window === "undefined") return "sans-serif";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim();
  if (!raw) return "system-ui, -apple-system, sans-serif";
  return `${raw}, system-ui, sans-serif`;
}

export function resolvePosterFonts(presetId: PosterFontPresetId): ResolvedFonts {
  const preset = FONT_PRESETS[presetId] ?? FONT_PRESETS.modern;
  return {
    heading: resolveCssFontFamily(preset.headingVar),
    headingWeight: preset.headingWeight,
    body: resolveCssFontFamily(preset.bodyVar),
    bodyWeight: preset.bodyWeight,
    price: resolveCssFontFamily(preset.priceVar),
    priceWeight: preset.priceWeight,
  };
}

export function parseNumericPrice(input: string): number | null {
  if (!input || !input.trim()) return null;
  const lower = input.toLowerCase().trim();
  // Match patterns like "25rb", "25.5rb", "25k"
  const shorthandMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k)\b/);
  if (shorthandMatch) {
    const num = parseFloat(shorthandMatch[1].replace(",", "."));
    if (!Number.isNaN(num) && num > 0) {
      return Math.round(num * 1000);
    }
  }
  const digitsOnly = lower.replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  const parsed = parseInt(digitsOnly, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

export function computeDiscountPercent(originalPrice: string, promoPrice: string): number | null {
  const orig = parseNumericPrice(originalPrice);
  const promo = parseNumericPrice(promoPrice);
  if (!orig || !promo || orig <= promo) return null;
  const pct = Math.round(((orig - promo) / orig) * 100);
  if (pct < 1 || pct > 99) return null;
  return pct;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r: Number.isNaN(r) ? 225 : r, g: Number.isNaN(g) ? 29 : g, b: Number.isNaN(b) ? 72 : b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r: Number.isNaN(r) ? 225 : r, g: Number.isNaN(g) ? 29 : g, b: Number.isNaN(b) ? 72 : b };
  }
  return { r: 225, g: 29, b: 72 };
}

function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getReadableTextOnColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#FFFFFF";
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawArchPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bottomRadius = 28
) {
  const archRadius = Math.min(w / 2, h * 0.48);
  const br = Math.min(bottomRadius, w / 2, (h - archRadius) / 2);
  const centerX = x + w / 2;
  const archCenterY = y + archRadius;

  ctx.beginPath();
  ctx.arc(centerX, archCenterY, archRadius, Math.PI, 0, false);
  // Ensure top right connects smoothly if archRadius < w/2
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + br, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - br);
  ctx.lineTo(x, archCenterY);
  ctx.closePath();
}

function drawTicketPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 24,
  notchRadius = 18
) {
  const midY = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, midY - notchRadius);
  ctx.arc(x + w, midY, notchRadius, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, midY + notchRadius);
  ctx.arc(x, midY, notchRadius, Math.PI / 2, -Math.PI / 2, true);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function breakLongWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number
): string[] {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const chunks: string[] = [];
  let current = "";
  for (const ch of word) {
    if (ctx.measureText(current + ch).width > maxWidth && current.length > 0) {
      chunks.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function layoutWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const rawWords = cleaned.split(" ");
  const words: string[] = [];
  for (const w of rawWords) {
    words.push(...breakLongWord(ctx, w, maxWidth));
  }

  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const candidate = currentLine ? `${currentLine} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length === maxLines - 1) {
        const rest = [currentLine, ...words.slice(i + 1)].join(" ");
        if (ctx.measureText(rest).width <= maxWidth) {
          currentLine = rest;
        } else {
          let truncated = rest;
          while (truncated.length > 3 && ctx.measureText(`${truncated}...`).width > maxWidth) {
            truncated = truncated.slice(0, -1).trimEnd();
          }
          currentLine = `${truncated}...`;
        }
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

function fitHeadlineBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  fontWeight: number,
  maxFontSize: number,
  minFontSize: number,
  maxWidth: number,
  maxLines: number,
  lineHeightRatio = 1.16
): { lines: string[]; fontSize: number; lineHeight: number; totalHeight: number } {
  const content = text.trim() || "Judul Promo Toko";
  let size = maxFontSize;

  while (size >= minFontSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const rawWords = content.replace(/\s+/g, " ").split(" ");
    let tempLines = 1;
    let cur = "";
    let wordTooWide = false;

    for (const w of rawWords) {
      if (ctx.measureText(w).width > maxWidth) {
        wordTooWide = true;
        break;
      }
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth || !cur) {
        cur = next;
      } else {
        tempLines++;
        cur = w;
      }
    }

    if (!wordTooWide && tempLines <= maxLines) {
      const lines = layoutWrappedLines(ctx, content, maxWidth, maxLines);
      const lineHeight = Math.round(size * lineHeightRatio);
      return {
        lines,
        fontSize: size,
        lineHeight,
        totalHeight: lines.length * lineHeight,
      };
    }
    size -= 4;
  }

  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  const lines = layoutWrappedLines(ctx, content, maxWidth, maxLines);
  const lineHeight = Math.round(minFontSize * lineHeightRatio);
  return {
    lines,
    fontSize: minFontSize,
    lineHeight,
    totalHeight: lines.length * lineHeight,
  };
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  align: CanvasTextAlign = "left"
): number {
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawFramedPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  shape: "rounded" | "arch" | "rect",
  radius: number,
  zoom: number,
  panX: number,
  panY: number,
  borderStroke?: string
) {
  const natW = img.naturalWidth || img.width || 1;
  const natH = img.naturalHeight || img.height || 1;
  const safeZoom = Math.max(1, Math.min(2.5, zoom || 1));

  const baseScale = Math.max(box.w / natW, box.h / natH);
  const drawW = natW * baseScale * safeZoom;
  const drawH = natH * baseScale * safeZoom;

  const maxOffsetX = Math.max(0, (drawW - box.w) / 2);
  const maxOffsetY = Math.max(0, (drawH - box.h) / 2);

  const clampedPanX = Math.max(-1, Math.min(1, panX || 0));
  const clampedPanY = Math.max(-1, Math.min(1, panY || 0));

  const drawX = box.x + (box.w - drawW) / 2 + clampedPanX * maxOffsetX;
  const drawY = box.y + (box.h - drawH) / 2 + clampedPanY * maxOffsetY;

  ctx.save();
  if (shape === "arch") {
    drawArchPath(ctx, box.x, box.y, box.w, box.h, radius);
  } else if (shape === "rounded") {
    drawRoundedRectPath(ctx, box.x, box.y, box.w, box.h, radius);
  } else {
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.closePath();
  }
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  if (borderStroke) {
    ctx.save();
    if (shape === "arch") {
      drawArchPath(ctx, box.x, box.y, box.w, box.h, radius);
    } else if (shape === "rounded") {
      drawRoundedRectPath(ctx, box.x, box.y, box.w, box.h, radius);
    } else {
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.closePath();
    }
    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawPosterBaseBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: PosterThemePalette,
  brandColor: string
) {
  const grad = ctx.createLinearGradient(0, 0, width * 0.35, height);
  grad.addColorStop(0, palette.bgStart);
  grad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient radial tint in top-right corner for depth without muddying contrast
  const ambient = ctx.createRadialGradient(
    width * 0.88,
    height * 0.08,
    20,
    width * 0.88,
    height * 0.08,
    width * 0.65
  );
  ambient.addColorStop(0, hexWithAlpha(brandColor, palette.id === "dark" ? 0.16 : 0.07));
  ambient.addColorStop(1, hexWithAlpha(brandColor, 0));
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, width, height);
}

function drawBadgePill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string,
  textColor: string,
  fontFamily: string,
  align: "left" | "center" | "right" = "left",
  fontSize = 22
): { width: number; height: number } {
  const label = text.trim().toUpperCase();
  if (!label) return { width: 0, height: 0 };

  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  const padX = 26;
  const h = fontSize + 26;
  const w = Math.ceil(ctx.measureText(label).width + padX * 2);

  let drawX = x;
  if (align === "center") drawX = x - w / 2;
  if (align === "right") drawX = x - w;

  drawRoundedRectPath(ctx, drawX, y, w, h, h / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, drawX + w / 2, y + h / 2 + 1);
  return { width: w, height: h };
}

function drawDiscountSeal(
  ctx: CanvasRenderingContext2D,
  discountPct: number,
  centerX: number,
  centerY: number,
  radius: number,
  brandColor: string,
  fontFamily: string
) {
  const onBrand = getReadableTextOnColor(brandColor);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = brandColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 8, 0, Math.PI * 2);
  ctx.strokeStyle = onBrand === "#FFFFFF" ? "rgba(255,255,255,0.35)" : "rgba(17,24,39,0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = onBrand;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(radius * 0.26)}px ${fontFamily}`;
  ctx.fillText("HEMAT", centerX, centerY - radius * 0.26);

  ctx.font = `800 ${Math.round(radius * 0.48)}px ${fontFamily}`;
  ctx.fillText(`${discountPct}%`, centerX, centerY + radius * 0.18);
  ctx.restore();
}

function drawPriceCluster(
  ctx: CanvasRenderingContext2D,
  promoPrice: string,
  originalPrice: string,
  discountPct: number | null,
  x: number,
  y: number,
  maxWidth: number,
  align: "left" | "center",
  brandColor: string,
  inkColor: string,
  mutedColor: string,
  fonts: ResolvedFonts,
  promoSize = 54
): number {
  const promo = promoPrice.trim();
  const orig = originalPrice.trim();
  if (!promo && !orig) return y;

  let curY = y;
  const onBrand = getReadableTextOnColor(brandColor);

  if (orig) {
    const origFontSize = Math.round(promoSize * 0.48);
    ctx.font = `600 ${origFontSize}px ${fonts.body}`;
    const origMetrics = ctx.measureText(orig);
    const origW = origMetrics.width;

    const pillText = discountPct ? `HEMAT ${discountPct}%` : "";
    ctx.font = `700 ${Math.round(origFontSize * 0.78)}px ${fonts.body}`;
    const pillW = pillText ? ctx.measureText(pillText).width + 28 : 0;
    const gap = pillText ? 14 : 0;
    const rowW = origW + gap + pillW;

    const startX = align === "center" ? x - rowW / 2 : x;

    // Strikethrough original price
    ctx.font = `600 ${origFontSize}px ${fonts.body}`;
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const midOrigY = curY + origFontSize * 0.65;
    ctx.fillText(orig, startX, midOrigY);

    ctx.strokeStyle = brandColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX - 2, midOrigY);
    ctx.lineTo(startX + origW + 4, midOrigY);
    ctx.stroke();

    if (pillText) {
      const pillH = origFontSize + 10;
      const pillX = startX + origW + gap;
      const pillY = midOrigY - pillH / 2;
      drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = brandColor;
      ctx.fill();

      ctx.font = `700 ${Math.round(origFontSize * 0.78)}px ${fonts.body}`;
      ctx.fillStyle = onBrand;
      ctx.textAlign = "center";
      ctx.fillText(pillText, pillX + pillW / 2, midOrigY + 1);
    }

    curY += origFontSize + 16;
  }

  if (promo) {
    let fittedSize = promoSize;
    ctx.font = `${fonts.priceWeight} ${fittedSize}px ${fonts.price}`;
    while (fittedSize > 32 && ctx.measureText(promo).width > maxWidth) {
      fittedSize -= 3;
      ctx.font = `${fonts.priceWeight} ${fittedSize}px ${fonts.price}`;
    }

    ctx.fillStyle = inkColor;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillText(promo, x, curY);
    curY += Math.round(fittedSize * 1.15);
  }

  return curY;
}

function drawFooterBar(
  ctx: CanvasRenderingContext2D,
  state: PosterRenderState,
  width: number,
  height: number,
  padX: number,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  variant: "pill" | "minimal" | "solid-brand" | "scrim-light" = "pill"
) {
  if (!state.showFooter) return;
  const cta = state.ctaText.trim();
  const contact = state.contactText.trim();
  if (!cta && !contact) return;

  const barH = 92;
  const barY = height - padX - barH + 8;
  const barW = width - padX * 2;

  if (variant === "solid-brand") {
    const onBrand = getReadableTextOnColor(state.brandColor);
    drawRoundedRectPath(ctx, padX, barY, barW, barH, 22);
    ctx.fillStyle = state.brandColor;
    ctx.fill();

    ctx.textBaseline = "middle";
    const midY = barY + barH / 2;
    if (cta && contact) {
      ctx.fillStyle = onBrand;
      ctx.font = `700 26px ${fonts.body}`;
      ctx.textAlign = "left";
      ctx.fillText(cta, padX + 32, midY);

      ctx.font = `600 24px ${fonts.body}`;
      ctx.textAlign = "right";
      ctx.fillText(contact, width - padX - 32, midY);
    } else {
      ctx.fillStyle = onBrand;
      ctx.font = `700 27px ${fonts.body}`;
      ctx.textAlign = "center";
      ctx.fillText(cta || contact, width / 2, midY);
    }
    return;
  }

  if (variant === "scrim-light") {
    drawRoundedRectPath(ctx, padX, barY, barW, barH, 22);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const midY = barY + barH / 2;
    ctx.textBaseline = "middle";
    if (cta && contact) {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 26px ${fonts.body}`;
      ctx.textAlign = "left";
      ctx.fillText(cta, padX + 30, midY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = `600 23px ${fonts.body}`;
      ctx.textAlign = "right";
      ctx.fillText(contact, width - padX - 30, midY);
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 26px ${fonts.body}`;
      ctx.textAlign = "center";
      ctx.fillText(cta || contact, width / 2, midY);
    }
    return;
  }

  if (variant === "minimal") {
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, barY + 12);
    ctx.lineTo(width - padX, barY + 12);
    ctx.stroke();

    const textY = barY + 54;
    ctx.textBaseline = "middle";
    if (cta && contact) {
      ctx.fillStyle = palette.ink;
      ctx.font = `700 25px ${fonts.body}`;
      ctx.textAlign = "left";
      ctx.fillText(cta, padX, textY);

      ctx.fillStyle = state.brandColor;
      ctx.font = `600 24px ${fonts.body}`;
      ctx.textAlign = "right";
      ctx.fillText(contact, width - padX, textY);
    } else {
      ctx.fillStyle = palette.ink;
      ctx.font = `600 25px ${fonts.body}`;
      ctx.textAlign = "center";
      ctx.fillText(cta || contact, width / 2, textY);
    }
    return;
  }

  // Default "pill"
  drawRoundedRectPath(ctx, padX, barY, barW, barH, 22);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const midY = barY + barH / 2;
  ctx.textBaseline = "middle";
  if (cta && contact) {
    // Accent dot
    ctx.beginPath();
    ctx.arc(padX + 30, midY, 7, 0, Math.PI * 2);
    ctx.fillStyle = state.brandColor;
    ctx.fill();

    ctx.fillStyle = palette.ink;
    ctx.font = `700 25px ${fonts.body}`;
    ctx.textAlign = "left";
    ctx.fillText(cta, padX + 50, midY);

    ctx.fillStyle = palette.muted;
    ctx.font = `600 23px ${fonts.body}`;
    ctx.textAlign = "right";
    ctx.fillText(contact, width - padX - 28, midY);
  } else {
    ctx.fillStyle = palette.ink;
    ctx.font = `700 25px ${fonts.body}`;
    ctx.textAlign = "center";
    ctx.fillText(cta || contact, width / 2, midY);
  }
}

export function renderPosterToCanvas(
  canvas: HTMLCanvasElement,
  state: PosterRenderState
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const spec = ASPECT_RATIO_SPECS[state.aspectRatio] ?? ASPECT_RATIO_SPECS["4:5"];
  const width = spec.width;
  const height = spec.height;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const palette = POSTER_THEMES[state.themeId] ?? POSTER_THEMES.light;
  const fonts = resolvePosterFonts(state.fontPresetId);
  const discountPct = computeDiscountPercent(state.originalPrice, state.promoPrice);
  const storeLabel = (state.storeName || "TOKO KAMI").trim();
  const onBrand = getReadableTextOnColor(state.brandColor);

  ctx.clearRect(0, 0, width, height);

  // Normalize legacy template IDs gracefully
  const templateId = state.templateId;

  if (templateId === "hero-scrim") {
    renderHeroScrimTemplate(ctx, width, height, state, palette, fonts, discountPct, storeLabel, onBrand);
    return;
  }

  if (templateId === "editorial-fnb") {
    renderEditorialFnbTemplate(ctx, width, height, state, palette, fonts, discountPct, storeLabel, onBrand);
    return;
  }

  if (templateId === "promo-deal") {
    renderPromoDealTemplate(ctx, width, height, state, palette, fonts, discountPct, storeLabel, onBrand);
    return;
  }

  if (templateId === "new-arrival") {
    renderMinimalCatalogTemplate(ctx, width, height, state, palette, fonts, discountPct, storeLabel, onBrand);
    return;
  }

  if (templateId === "warm-artisan") {
    renderWarmArtisanTemplate(ctx, width, height, state, palette, fonts, discountPct, storeLabel, onBrand);
    return;
  }

  // Default / "tips-quote"
  renderStoreQuoteTemplate(ctx, width, height, state, palette, fonts, discountPct, storeLabel, onBrand);
}

// ============================================================================
// TEMPLATE 1: EDITORIAL F&B ("editorial-fnb")
// ============================================================================
function renderEditorialFnbTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PosterRenderState,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  discountPct: number | null,
  storeLabel: string,
  onBrand: string
) {
  drawPosterBaseBackground(ctx, width, height, palette, state.brandColor);

  const padX = 72;
  const contentW = width - padX * 2;
  const isStory = state.aspectRatio === "9:16";
  const isSquare = state.aspectRatio === "1:1";

  // Top editorial masthead
  const topY = isSquare ? 56 : 68;
  ctx.fillStyle = palette.ink;
  ctx.font = `700 26px ${fonts.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(storeLabel.toUpperCase(), padX, topY + 22);

  if (state.badgeText.trim()) {
    drawBadgePill(
      ctx,
      state.badgeText,
      width - padX,
      topY,
      state.brandColor,
      onBrand,
      fonts.body,
      "right",
      20
    );
  }

  const ruleY = topY + 64;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, ruleY);
  ctx.lineTo(width - padX, ruleY);
  ctx.stroke();

  const footerReserved = state.showFooter && (state.ctaText.trim() || state.contactText.trim()) ? 124 : 40;

  if (state.productImage) {
    const photoTop = ruleY + 32;
    const photoH = isStory ? 860 : isSquare ? 430 : 590;
    drawFramedPhoto(
      ctx,
      state.productImage,
      { x: padX, y: photoTop, w: contentW, h: photoH },
      "rounded",
      28,
      state.imageZoom,
      state.imagePanX,
      state.imagePanY,
      palette.border
    );

    if (discountPct) {
      drawDiscountSeal(
        ctx,
        discountPct,
        width - padX - 76,
        photoTop + 76,
        66,
        state.brandColor,
        fonts.body
      );
    }

    let textY = photoTop + photoH + (isStory ? 48 : 34);
    const maxHeadlineSize = isStory ? 74 : isSquare ? 54 : 64;
    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      maxHeadlineSize,
      38,
      contentW,
      isSquare ? 2 : 3,
      1.14
    );

    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    textY = drawLines(ctx, headBlock.lines, padX, textY, headBlock.lineHeight, "left");

    if (state.subheadline.trim()) {
      textY += 14;
      const subSize = isSquare ? 26 : 30;
      ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, contentW, isStory ? 3 : 2);
      textY = drawLines(ctx, subLines, padX, textY, Math.round(subSize * 1.42), "left");
    }

    if (state.promoPrice.trim() || state.originalPrice.trim()) {
      const bottomLimit = height - padX - footerReserved;
      const priceY = Math.min(textY + 24, bottomLimit - 95);
      drawPriceCluster(
        ctx,
        state.promoPrice,
        state.originalPrice,
        null,
        padX,
        Math.max(textY + 16, priceY),
        contentW,
        "left",
        state.brandColor,
        state.brandColor,
        palette.muted,
        fonts,
        isSquare ? 48 : 58
      );
    }
  } else {
    // Aesthetic Editorial Menu Card (No-Photo Mode)
    const cardTop = ruleY + 36;
    const cardBottom = height - padX - footerReserved;
    const cardH = cardBottom - cardTop;

    drawRoundedRectPath(ctx, padX, cardTop, contentW, cardH, 32);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner editorial hairline frame
    drawRoundedRectPath(ctx, padX + 22, cardTop + 22, contentW - 44, cardH - 44, 20);
    ctx.strokeStyle = hexWithAlpha(state.brandColor, 0.28);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const innerX = padX + 64;
    const innerW = contentW - 128;
    let curY = cardTop + (isStory ? 110 : 74);

    // Ornamental accent bar
    ctx.fillStyle = state.brandColor;
    ctx.fillRect(innerX, curY, 84, 6);
    curY += 42;

    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 96 : isSquare ? 68 : 82,
      46,
      innerW,
      4,
      1.13
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    curY = drawLines(ctx, headBlock.lines, innerX, curY, headBlock.lineHeight, "left");

    if (state.subheadline.trim()) {
      curY += 28;
      const subSize = isStory ? 36 : 32;
      ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, innerW, isStory ? 5 : 3);
      curY = drawLines(ctx, subLines, innerX, curY, Math.round(subSize * 1.48), "left");
    }

    if (state.promoPrice.trim() || state.originalPrice.trim()) {
      const priceBoxH = state.originalPrice.trim() ? 168 : 126;
      const priceBoxY = Math.max(curY + 36, cardBottom - 64 - priceBoxH);
      drawRoundedRectPath(ctx, innerX, priceBoxY, innerW, priceBoxH, 22);
      ctx.fillStyle = palette.subtleFill;
      ctx.fill();

      drawPriceCluster(
        ctx,
        state.promoPrice,
        state.originalPrice,
        discountPct,
        innerX + 32,
        priceBoxY + 24,
        innerW - 64,
        "left",
        state.brandColor,
        state.brandColor,
        palette.muted,
        fonts,
        isSquare ? 54 : 64
      );
    }
  }

  drawFooterBar(ctx, state, width, height, padX, palette, fonts, "minimal");
}

// ============================================================================
// TEMPLATE 2: PROMO DISKON & HARGA CORET ("promo-deal")
// ============================================================================
function renderPromoDealTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PosterRenderState,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  discountPct: number | null,
  storeLabel: string,
  onBrand: string
) {
  drawPosterBaseBackground(ctx, width, height, palette, state.brandColor);

  // Top bold brand accent strip
  ctx.fillStyle = state.brandColor;
  ctx.fillRect(0, 0, width, 22);

  const padX = 68;
  const contentW = width - padX * 2;
  const isStory = state.aspectRatio === "9:16";
  const isSquare = state.aspectRatio === "1:1";

  // Header row
  const headerY = isSquare ? 54 : 68;
  if (state.badgeText.trim()) {
    drawBadgePill(
      ctx,
      state.badgeText,
      padX,
      headerY,
      state.brandColor,
      onBrand,
      fonts.body,
      "left",
      22
    );
  }

  ctx.fillStyle = palette.ink;
  ctx.font = `700 25px ${fonts.body}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(storeLabel.toUpperCase(), width - padX, headerY + 24);

  const footerReserved = state.showFooter && (state.ctaText.trim() || state.contactText.trim()) ? 124 : 36;

  if (state.productImage) {
    let curY = headerY + 76;
    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 80 : isSquare ? 56 : 68,
      40,
      contentW,
      isSquare ? 2 : 3,
      1.12
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    curY = drawLines(ctx, headBlock.lines, padX, curY, headBlock.lineHeight, "left");

    if (state.subheadline.trim() && !isSquare) {
      curY += 12;
      ctx.font = `${fonts.bodyWeight} 29px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, contentW, 2);
      curY = drawLines(ctx, subLines, padX, curY, 40, "left");
    }

    const ticketH = state.promoPrice.trim() || state.originalPrice.trim() ? 148 : 0;
    const availablePhotoH = height - padX - footerReserved - curY - (ticketH ? ticketH - 28 : 24) - 24;
    const photoY = curY + 24;
    const photoH = Math.max(260, availablePhotoH);

    drawFramedPhoto(
      ctx,
      state.productImage,
      { x: padX, y: photoY, w: contentW, h: photoH },
      "rounded",
      28,
      state.imageZoom,
      state.imagePanX,
      state.imagePanY,
      palette.border
    );

    if (discountPct) {
      drawDiscountSeal(
        ctx,
        discountPct,
        width - padX - 78,
        photoY + 78,
        68,
        state.brandColor,
        fonts.body
      );
    }

    if (ticketH > 0) {
      const ticketY = photoY + photoH - 36;
      const ticketW = contentW - 48;
      const ticketX = padX + 24;

      ctx.save();
      drawTicketPath(ctx, ticketX, ticketY, ticketW, ticketH, 22, 16);
      ctx.fillStyle = palette.surface;
      ctx.shadowColor = "rgba(0,0,0,0.16)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.fill();
      ctx.restore();

      drawTicketPath(ctx, ticketX, ticketY, ticketW, ticketH, 22, 16);
      ctx.strokeStyle = state.brandColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Left label inside ticket, right price
      ctx.fillStyle = palette.muted;
      ctx.font = `700 24px ${fonts.body}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("HARGA PROMO", ticketX + 38, ticketY + (state.originalPrice.trim() ? 50 : ticketH / 2));

      if (state.originalPrice.trim()) {
        const origText = state.originalPrice.trim();
        ctx.font = `600 28px ${fonts.body}`;
        const origW = ctx.measureText(origText).width;
        ctx.fillStyle = palette.muted;
        ctx.fillText(origText, ticketX + 38, ticketY + 96);

        ctx.strokeStyle = state.brandColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ticketX + 36, ticketY + 96);
        ctx.lineTo(ticketX + 42 + origW, ticketY + 96);
        ctx.stroke();
      }

      if (state.promoPrice.trim()) {
        let pSize = isSquare ? 52 : 60;
        ctx.font = `${fonts.priceWeight} ${pSize}px ${fonts.price}`;
        while (pSize > 34 && ctx.measureText(state.promoPrice.trim()).width > ticketW * 0.56) {
          pSize -= 3;
          ctx.font = `${fonts.priceWeight} ${pSize}px ${fonts.price}`;
        }
        ctx.fillStyle = state.brandColor;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(state.promoPrice.trim(), ticketX + ticketW - 38, ticketY + ticketH / 2 + 2);
      }
    }
  } else {
    // Bold Retail Ticket Typography Poster (No-Photo Mode)
    let curY = headerY + (isStory ? 130 : 86);
    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 108 : isSquare ? 76 : 92,
      48,
      contentW,
      4,
      1.1
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    curY = drawLines(ctx, headBlock.lines, padX, curY, headBlock.lineHeight, "left");

    if (state.subheadline.trim()) {
      curY += 26;
      const subSize = isStory ? 38 : 34;
      ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, contentW, isStory ? 4 : 3);
      curY = drawLines(ctx, subLines, padX, curY, Math.round(subSize * 1.42), "left");
    }

    if (state.promoPrice.trim() || state.originalPrice.trim()) {
      const ticketH = state.originalPrice.trim() ? 230 : 180;
      const bottomLimit = height - padX - footerReserved;
      const ticketY = Math.max(curY + 44, Math.min(curY + (isStory ? 110 : 64), bottomLimit - ticketH - 20));

      drawTicketPath(ctx, padX, ticketY, contentW, ticketH, 28, 20);
      ctx.fillStyle = palette.surface;
      ctx.fill();
      ctx.strokeStyle = state.brandColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      drawPriceCluster(
        ctx,
        state.promoPrice,
        state.originalPrice,
        null,
        padX + 48,
        ticketY + (state.originalPrice.trim() ? 38 : 50),
        contentW - (discountPct ? 240 : 96),
        "left",
        state.brandColor,
        state.brandColor,
        palette.muted,
        fonts,
        isSquare ? 68 : 78
      );

      if (discountPct) {
        drawDiscountSeal(
          ctx,
          discountPct,
          width - padX - 108,
          ticketY + ticketH / 2,
          72,
          state.brandColor,
          fonts.body
        );
      }
    }
  }

  drawFooterBar(ctx, state, width, height, padX, palette, fonts, "solid-brand");
}

// ============================================================================
// TEMPLATE 3: FULL-BLEED HERO SCRIM ("hero-scrim")
// ============================================================================
function renderHeroScrimTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PosterRenderState,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  discountPct: number | null,
  storeLabel: string,
  onBrand: string
) {
  const padX = 72;
  const contentW = width - padX * 2;
  const isStory = state.aspectRatio === "9:16";
  const isSquare = state.aspectRatio === "1:1";

  if (state.productImage) {
    // Full canvas photo
    drawFramedPhoto(
      ctx,
      state.productImage,
      { x: 0, y: 0, w: width, h: height },
      "rect",
      0,
      state.imageZoom,
      state.imagePanX,
      state.imagePanY
    );

    // Top readability scrim
    const topScrim = ctx.createLinearGradient(0, 0, 0, 260);
    topScrim.addColorStop(0, "rgba(10, 12, 16, 0.72)");
    topScrim.addColorStop(1, "rgba(10, 12, 16, 0)");
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, width, 260);

    // Bottom multi-stop readability scrim
    const scrimStart = height * (isSquare ? 0.32 : 0.36);
    const botScrim = ctx.createLinearGradient(0, scrimStart, 0, height);
    botScrim.addColorStop(0, "rgba(10, 12, 16, 0)");
    botScrim.addColorStop(0.38, "rgba(10, 12, 16, 0.68)");
    botScrim.addColorStop(1, "rgba(10, 12, 16, 0.94)");
    ctx.fillStyle = botScrim;
    ctx.fillRect(0, scrimStart, width, height - scrimStart);
  } else {
    // Architectural color-block canvas when no photo is uploaded
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#11131A");
    bgGrad.addColorStop(0.55, "#181B24");
    bgGrad.addColorStop(1, "#0B0D12");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Bold architectural spotlight shapes in brandColor
    ctx.save();
    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.22, width * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = hexWithAlpha(state.brandColor, 0.22);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.78, width * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = hexWithAlpha(state.brandColor, 0.12);
    ctx.fill();
    ctx.restore();
  }

  // Top bar over scrim (always crisp white for guaranteed contrast over dark scrim)
  const topY = 68;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 26px ${fonts.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(storeLabel.toUpperCase(), padX, topY + 22);

  if (discountPct) {
    drawDiscountSeal(ctx, discountPct, width - padX - 66, topY + 66, 66, state.brandColor, fonts.body);
  } else if (state.badgeText.trim()) {
    drawBadgePill(ctx, state.badgeText, width - padX, topY, state.brandColor, onBrand, fonts.body, "right", 20);
  }

  // Bottom anchored content stack (computed bottom-up so nothing ever overlaps!)
  const hasFooter = state.showFooter && Boolean(state.ctaText.trim() || state.contactText.trim());
  let bottomCursor = hasFooter ? height - padX - 116 : height - padX;

  if (state.promoPrice.trim() || state.originalPrice.trim()) {
    const priceBlockH = state.originalPrice.trim() ? 118 : 78;
    bottomCursor -= priceBlockH;
    drawPriceCluster(
      ctx,
      state.promoPrice,
      state.originalPrice,
      null,
      padX,
      bottomCursor,
      contentW,
      "left",
      state.brandColor,
      "#FFFFFF",
      "rgba(255,255,255,0.75)",
      fonts,
      isSquare ? 58 : 68
    );
    bottomCursor -= 22;
  }

  if (state.subheadline.trim()) {
    const subSize = isStory ? 34 : 30;
    ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
    const subLines = layoutWrappedLines(ctx, state.subheadline, contentW, isStory ? 3 : 2);
    const subLineH = Math.round(subSize * 1.42);
    bottomCursor -= subLines.length * subLineH;
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    drawLines(ctx, subLines, padX, bottomCursor, subLineH, "left");
    bottomCursor -= 20;
  }

  const headBlock = fitHeadlineBlock(
    ctx,
    state.headline,
    fonts.heading,
    fonts.headingWeight,
    isStory ? 92 : isSquare ? 68 : 80,
    44,
    contentW,
    state.productImage ? 3 : 4,
    1.12
  );
  bottomCursor -= headBlock.totalHeight;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
  drawLines(ctx, headBlock.lines, padX, bottomCursor, headBlock.lineHeight, "left");

  if (state.badgeText.trim() && discountPct) {
    drawBadgePill(
      ctx,
      state.badgeText,
      padX,
      bottomCursor - 68,
      state.brandColor,
      onBrand,
      fonts.body,
      "left",
      20
    );
  }

  drawFooterBar(ctx, state, width, height, padX, palette, fonts, "scrim-light");
}

// ============================================================================
// TEMPLATE 4: KATALOG MINIMALIS BERSIH ("new-arrival")
// ============================================================================
function renderMinimalCatalogTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PosterRenderState,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  discountPct: number | null,
  storeLabel: string,
  onBrand: string
) {
  drawPosterBaseBackground(ctx, width, height, palette, state.brandColor);

  const margin = 56;
  const frameW = width - margin * 2;
  const frameH = height - margin * 2;
  const isStory = state.aspectRatio === "9:16";
  const isSquare = state.aspectRatio === "1:1";

  // Swiss gallery card container
  drawRoundedRectPath(ctx, margin, margin, frameW, frameH, 20);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top grid cell
  const headerH = 88;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, margin + headerH);
  ctx.lineTo(width - margin, margin + headerH);
  ctx.stroke();

  ctx.fillStyle = palette.ink;
  ctx.font = `700 24px ${fonts.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(storeLabel.toUpperCase(), margin + 36, margin + headerH / 2);

  if (state.badgeText.trim()) {
    ctx.fillStyle = state.brandColor;
    ctx.font = `700 22px ${fonts.body}`;
    ctx.textAlign = "right";
    ctx.fillText(state.badgeText.trim().toUpperCase(), width - margin - 36, margin + headerH / 2);
  }

  // Bottom footer cell inside Swiss frame
  const hasFooter = state.showFooter && Boolean(state.ctaText.trim() || state.contactText.trim());
  const footerCellH = hasFooter ? 88 : 0;
  const bodyBottom = height - margin - footerCellH;

  if (hasFooter) {
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.moveTo(margin, bodyBottom);
    ctx.lineTo(width - margin, bodyBottom);
    ctx.stroke();

    const midFootY = bodyBottom + footerCellH / 2;
    ctx.textBaseline = "middle";
    if (state.ctaText.trim() && state.contactText.trim()) {
      ctx.fillStyle = palette.ink;
      ctx.font = `600 23px ${fonts.body}`;
      ctx.textAlign = "left";
      ctx.fillText(state.ctaText.trim(), margin + 36, midFootY);

      ctx.fillStyle = palette.muted;
      ctx.font = `500 22px ${fonts.body}`;
      ctx.textAlign = "right";
      ctx.fillText(state.contactText.trim(), width - margin - 36, midFootY);
    } else {
      ctx.fillStyle = palette.ink;
      ctx.font = `600 23px ${fonts.body}`;
      ctx.textAlign = "center";
      ctx.fillText(state.ctaText.trim() || state.contactText.trim(), width / 2, midFootY);
    }
  }

  const innerX = margin + 40;
  const innerW = frameW - 80;
  let curY = margin + headerH + 36;

  if (state.productImage) {
    const photoH = isStory ? 880 : isSquare ? 440 : 600;
    drawFramedPhoto(
      ctx,
      state.productImage,
      { x: innerX, y: curY, w: innerW, h: photoH },
      "rounded",
      14,
      state.imageZoom,
      state.imagePanX,
      state.imagePanY,
      palette.border
    );

    if (discountPct) {
      drawBadgePill(
        ctx,
        `HEMAT ${discountPct}%`,
        innerX + 22,
        curY + 22,
        state.brandColor,
        onBrand,
        fonts.body,
        "left",
        20
      );
    }

    curY += photoH + (isStory ? 44 : 32);
    const hasPrice = Boolean(state.promoPrice.trim() || state.originalPrice.trim());
    const textColW = hasPrice && isSquare ? innerW * 0.58 : innerW;

    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 68 : isSquare ? 48 : 58,
      34,
      textColW,
      2,
      1.15
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    const afterHeadY = drawLines(ctx, headBlock.lines, innerX, curY, headBlock.lineHeight, "left");

    if (hasPrice && isSquare) {
      // Side-by-side price in 1:1 catalog for clean space economy
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      if (state.originalPrice.trim()) {
        ctx.font = `500 24px ${fonts.body}`;
        ctx.fillStyle = palette.muted;
        const origTxt = state.originalPrice.trim();
        const origW = ctx.measureText(origTxt).width;
        ctx.fillText(origTxt, innerX + innerW, curY + 4);
        ctx.strokeStyle = state.brandColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(innerX + innerW - origW - 2, curY + 18);
        ctx.lineTo(innerX + innerW + 2, curY + 18);
        ctx.stroke();
      }
      if (state.promoPrice.trim()) {
        ctx.font = `${fonts.priceWeight} 44px ${fonts.price}`;
        ctx.fillStyle = state.brandColor;
        ctx.fillText(state.promoPrice.trim(), innerX + innerW, curY + (state.originalPrice.trim() ? 36 : 4));
      }
    } else {
      let nextY = afterHeadY;
      if (state.subheadline.trim()) {
        nextY += 12;
        ctx.font = `${fonts.bodyWeight} 28px ${fonts.body}`;
        ctx.fillStyle = palette.muted;
        const subLines = layoutWrappedLines(ctx, state.subheadline, innerW, isStory ? 3 : 2);
        nextY = drawLines(ctx, subLines, innerX, nextY, 39, "left");
      }
      if (hasPrice) {
        drawPriceCluster(
          ctx,
          state.promoPrice,
          state.originalPrice,
          discountPct,
          innerX,
          Math.min(nextY + 20, bodyBottom - 108),
          innerW,
          "left",
          state.brandColor,
          state.brandColor,
          palette.muted,
          fonts,
          54
        );
      }
    }
  } else {
    // Minimalist Swiss Typographic Poster (No-Photo Mode)
    ctx.fillStyle = state.brandColor;
    ctx.fillRect(innerX, curY + 16, 68, 8);
    curY += 64;

    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 96 : isSquare ? 70 : 84,
      44,
      innerW,
      4,
      1.12
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    curY = drawLines(ctx, headBlock.lines, innerX, curY, headBlock.lineHeight, "left");

    if (state.subheadline.trim()) {
      curY += 32;
      const subSize = isStory ? 36 : 32;
      ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, innerW, isStory ? 5 : 3);
      curY = drawLines(ctx, subLines, innerX, curY, Math.round(subSize * 1.45), "left");
    }

    if (state.promoPrice.trim() || state.originalPrice.trim()) {
      const priceRowY = Math.max(curY + 48, bodyBottom - 165);
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(innerX, priceRowY - 24);
      ctx.lineTo(innerX + innerW, priceRowY - 24);
      ctx.stroke();

      drawPriceCluster(
        ctx,
        state.promoPrice,
        state.originalPrice,
        discountPct,
        innerX,
        priceRowY,
        innerW,
        "left",
        state.brandColor,
        state.brandColor,
        palette.muted,
        fonts,
        64
      );
    }
  }
}

// ============================================================================
// TEMPLATE 5: BINGKAI LENGKUNG ARTISAN ("warm-artisan")
// ============================================================================
function renderWarmArtisanTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PosterRenderState,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  discountPct: number | null,
  storeLabel: string,
  onBrand: string
) {
  drawPosterBaseBackground(ctx, width, height, palette, state.brandColor);

  const padX = 76;
  const contentW = width - padX * 2;
  const centerX = width / 2;
  const isStory = state.aspectRatio === "9:16";
  const isSquare = state.aspectRatio === "1:1";

  const topY = isSquare ? 50 : 66;
  ctx.fillStyle = palette.muted;
  ctx.font = `700 24px ${fonts.body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(storeLabel.toUpperCase(), centerX, topY);

  const footerReserved = state.showFooter && (state.ctaText.trim() || state.contactText.trim()) ? 120 : 36;

  if (state.productImage) {
    const archW = isSquare ? 540 : 720;
    const archH = isStory ? 860 : isSquare ? 440 : 600;
    const archX = centerX - archW / 2;
    const archY = topY + 52;

    // Offset decorative arch outline
    ctx.save();
    drawArchPath(ctx, archX - 12, archY - 10, archW + 24, archH + 20, 34);
    ctx.strokeStyle = hexWithAlpha(state.brandColor, 0.4);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    drawFramedPhoto(
      ctx,
      state.productImage,
      { x: archX, y: archY, w: archW, h: archH },
      "arch",
      28,
      state.imageZoom,
      state.imagePanX,
      state.imagePanY,
      palette.border
    );

    if (discountPct) {
      drawDiscountSeal(ctx, discountPct, archX + archW - 34, archY + archH - 54, 64, state.brandColor, fonts.body);
    } else if (state.badgeText.trim()) {
      drawBadgePill(
        ctx,
        state.badgeText,
        centerX,
        archY + archH - 26,
        state.brandColor,
        onBrand,
        fonts.body,
        "center",
        20
      );
    }

    let curY = archY + archH + (state.badgeText.trim() && !discountPct ? 40 : 30);
    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 72 : isSquare ? 50 : 60,
      36,
      contentW,
      2,
      1.15
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    curY = drawLines(ctx, headBlock.lines, centerX, curY, headBlock.lineHeight, "center");

    if (state.subheadline.trim() && !isSquare) {
      curY += 12;
      ctx.font = `${fonts.bodyWeight} 28px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, contentW * 0.9, isStory ? 3 : 2);
      curY = drawLines(ctx, subLines, centerX, curY, 39, "center");
    }

    if (state.promoPrice.trim() || state.originalPrice.trim()) {
      drawPriceCluster(
        ctx,
        state.promoPrice,
        state.originalPrice,
        null,
        centerX,
        Math.min(curY + 18, height - padX - footerReserved - 96),
        contentW,
        "center",
        state.brandColor,
        state.brandColor,
        palette.muted,
        fonts,
        isSquare ? 46 : 56
      );
    }
  } else {
    // Artisan Arch Pavilion Typography Mode
    const archW = width - 160;
    const archTop = topY + 56;
    const archH = height - archTop - padX - footerReserved;
    const archX = centerX - archW / 2;

    drawArchPath(ctx, archX, archTop, archW, archH, 36);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = hexWithAlpha(state.brandColor, 0.35);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    let curY = archTop + (isStory ? 180 : 120);
    if (state.badgeText.trim()) {
      const badge = drawBadgePill(
        ctx,
        state.badgeText,
        centerX,
        curY,
        state.brandColor,
        onBrand,
        fonts.body,
        "center",
        21
      );
      curY += badge.height + 36;
    }

    const innerW = archW - 120;
    const headBlock = fitHeadlineBlock(
      ctx,
      state.headline,
      fonts.heading,
      fonts.headingWeight,
      isStory ? 88 : isSquare ? 62 : 74,
      42,
      innerW,
      3,
      1.15
    );
    ctx.fillStyle = palette.ink;
    ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
    curY = drawLines(ctx, headBlock.lines, centerX, curY, headBlock.lineHeight, "center");

    if (state.subheadline.trim()) {
      curY += 26;
      const subSize = isStory ? 34 : 30;
      ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
      ctx.fillStyle = palette.muted;
      const subLines = layoutWrappedLines(ctx, state.subheadline, innerW, isStory ? 4 : 3);
      curY = drawLines(ctx, subLines, centerX, curY, Math.round(subSize * 1.45), "center");
    }

    if (state.promoPrice.trim() || state.originalPrice.trim()) {
      drawPriceCluster(
        ctx,
        state.promoPrice,
        state.originalPrice,
        discountPct,
        centerX,
        Math.max(curY + 38, archTop + archH - 185),
        innerW,
        "center",
        state.brandColor,
        state.brandColor,
        palette.muted,
        fonts,
        62
      );
    }
  }

  drawFooterBar(ctx, state, width, height, padX, palette, fonts, "pill");
}

// ============================================================================
// TEMPLATE 6: INFO TOKO & KUTIPAN ("tips-quote")
// ============================================================================
function renderStoreQuoteTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PosterRenderState,
  palette: PosterThemePalette,
  fonts: ResolvedFonts,
  discountPct: number | null,
  storeLabel: string,
  onBrand: string
) {
  drawPosterBaseBackground(ctx, width, height, palette, state.brandColor);

  const padX = 72;
  const contentW = width - padX * 2;
  const isStory = state.aspectRatio === "9:16";
  const isSquare = state.aspectRatio === "1:1";
  const footerReserved = state.showFooter && (state.ctaText.trim() || state.contactText.trim()) ? 124 : 36;

  // Header
  const topY = isSquare ? 54 : 68;
  ctx.fillStyle = palette.ink;
  ctx.font = `700 25px ${fonts.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(storeLabel.toUpperCase(), padX, topY + 22);

  if (state.badgeText.trim()) {
    drawBadgePill(ctx, state.badgeText, width - padX, topY, state.brandColor, onBrand, fonts.body, "right", 20);
  }

  let curY = topY + 76;

  if (state.productImage) {
    const bannerH = isStory ? 620 : isSquare ? 320 : 420;
    drawFramedPhoto(
      ctx,
      state.productImage,
      { x: padX, y: curY, w: contentW, h: bannerH },
      "rounded",
      26,
      state.imageZoom,
      state.imagePanX,
      state.imagePanY,
      palette.border
    );
    curY += bannerH + 36;
  }

  const cardH = height - padX - footerReserved - curY;
  drawRoundedRectPath(ctx, padX, curY, contentW, cardH, 30);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Left vertical editorial accent bar inside card
  const innerX = padX + 56;
  const innerW = contentW - 112;
  let textY = curY + (state.productImage ? 46 : isStory ? 96 : 64);

  if (!state.productImage) {
    ctx.fillStyle = hexWithAlpha(state.brandColor, 0.22);
    ctx.font = `700 140px ${fonts.heading}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("“", innerX - 8, textY - 36);
    textY += 68;
  }

  const headBlock = fitHeadlineBlock(
    ctx,
    state.headline,
    fonts.heading,
    fonts.headingWeight,
    state.productImage ? (isSquare ? 48 : 58) : isStory ? 80 : 68,
    36,
    innerW,
    state.productImage ? 3 : 4,
    1.16
  );
  ctx.fillStyle = palette.ink;
  ctx.font = `${fonts.headingWeight} ${headBlock.fontSize}px ${fonts.heading}`;
  textY = drawLines(ctx, headBlock.lines, innerX, textY, headBlock.lineHeight, "left");

  // Accent divider line
  textY += 24;
  ctx.fillStyle = state.brandColor;
  ctx.fillRect(innerX, textY, 96, 6);
  textY += 28;

  if (state.subheadline.trim()) {
    const subSize = state.productImage ? (isSquare ? 26 : 30) : isStory ? 36 : 33;
    ctx.font = `${fonts.bodyWeight} ${subSize}px ${fonts.body}`;
    ctx.fillStyle = palette.muted;
    const maxSubLines = state.productImage ? (isSquare ? 2 : 3) : isStory ? 7 : 5;
    const subLines = layoutWrappedLines(ctx, state.subheadline, innerW, maxSubLines);
    textY = drawLines(ctx, subLines, innerX, textY, Math.round(subSize * 1.48), "left");
  }

  if (state.promoPrice.trim() || state.originalPrice.trim()) {
    drawPriceCluster(
      ctx,
      state.promoPrice,
      state.originalPrice,
      discountPct,
      innerX,
      Math.min(textY + 28, curY + cardH - 115),
      innerW,
      "left",
      state.brandColor,
      state.brandColor,
      palette.muted,
      fonts,
      48
    );
  }

  drawFooterBar(ctx, state, width, height, padX, palette, fonts, "pill");
}

