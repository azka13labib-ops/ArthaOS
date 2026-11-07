import React from "react";
import {
  PosterTemplateId,
  PosterThemeId,
  POSTER_THEMES,
} from "./poster-engine";

interface TemplateThumbnailProps {
  templateId: PosterTemplateId;
  themeId: PosterThemeId;
  brandColor: string;
  hasPhoto: boolean;
}

export function TemplateThumbnail({
  templateId,
  themeId,
  brandColor,
  hasPhoto,
}: TemplateThumbnailProps) {
  const palette = POSTER_THEMES[themeId] ?? POSTER_THEMES.light;

  if (templateId === "hero-scrim") {
    return (
      <div
        className="w-full aspect-[4/5] rounded-md overflow-hidden relative border"
        style={{
          backgroundColor: "#14161D",
          borderColor: palette.border,
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-45"
          style={{
            background: `radial-gradient(circle at 75% 25%, ${brandColor}, transparent 65%)`,
          }}
        />
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
          <div
            className="h-1 w-6 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.72)" }}
          />
          <div
            className="h-2 w-4 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 p-1.5 space-y-1"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.55), transparent)",
          }}
        >
          <div
            className="h-1.5 w-4/5 rounded-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
          />
          <div
            className="h-1 w-3/5 rounded-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.65)" }}
          />
          <div
            className="h-2 w-full rounded-xs mt-1"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          />
        </div>
      </div>
    );
  }

  if (templateId === "warm-artisan") {
    return (
      <div
        className="w-full aspect-[4/5] rounded-md overflow-hidden relative p-1.5 flex flex-col items-center justify-between border"
        style={{
          backgroundColor: palette.bgStart,
          borderColor: palette.border,
        }}
        aria-hidden="true"
      >
        <div
          className="h-1 w-6 rounded-full opacity-60"
          style={{ backgroundColor: palette.ink }}
        />
        <div
          className="w-4/5 flex-1 my-1 rounded-t-full rounded-b-sm border flex items-end justify-center pb-1"
          style={{
            backgroundColor: hasPhoto ? `${brandColor}22` : palette.surface,
            borderColor: brandColor,
          }}
        >
          <div
            className="h-1.5 w-6 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
        </div>
        <div className="w-full flex flex-col items-center gap-0.5">
          <div
            className="h-1.5 w-3/4 rounded-xs"
            style={{ backgroundColor: palette.ink }}
          />
          <div
            className="h-1.5 w-1/2 rounded-xs"
            style={{ backgroundColor: brandColor }}
          />
        </div>
      </div>
    );
  }

  if (templateId === "promo-deal") {
    return (
      <div
        className="w-full aspect-[4/5] rounded-md overflow-hidden relative flex flex-col justify-between border"
        style={{
          backgroundColor: palette.bgStart,
          borderColor: palette.border,
        }}
        aria-hidden="true"
      >
        <div className="h-1 w-full" style={{ backgroundColor: brandColor }} />
        <div className="p-1.5 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <div
              className="h-1.5 w-7 rounded-full"
              style={{ backgroundColor: brandColor }}
            />
            <div
              className="h-2 w-11/12 rounded-xs"
              style={{ backgroundColor: palette.ink }}
            />
          </div>
          <div
            className="rounded-sm border p-1 flex items-center justify-between"
            style={{
              backgroundColor: palette.surface,
              borderColor: brandColor,
            }}
          >
            <div
              className="h-1 w-5 rounded-xs opacity-50"
              style={{ backgroundColor: palette.ink }}
            />
            <div
              className="h-2 w-6 rounded-xs"
              style={{ backgroundColor: brandColor }}
            />
          </div>
          <div
            className="h-2 w-full rounded-xs"
            style={{ backgroundColor: brandColor }}
          />
        </div>
      </div>
    );
  }

  if (templateId === "new-arrival") {
    return (
      <div
        className="w-full aspect-[4/5] rounded-md overflow-hidden p-1 border"
        style={{
          backgroundColor: palette.bgStart,
          borderColor: palette.border,
        }}
        aria-hidden="true"
      >
        <div
          className="w-full h-full rounded-xs border flex flex-col justify-between"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          <div
            className="px-1 py-0.5 border-b flex justify-between items-center"
            style={{ borderColor: palette.border }}
          >
            <div
              className="h-1 w-5 rounded-xs"
              style={{ backgroundColor: palette.ink }}
            />
            <div
              className="h-1 w-4 rounded-xs"
              style={{ backgroundColor: brandColor }}
            />
          </div>
          <div className="p-1 flex-1 flex flex-col justify-between">
            <div
              className="w-full flex-1 rounded-xs mb-1"
              style={{ backgroundColor: `${brandColor}1F` }}
            />
            <div
              className="h-1.5 w-3/4 rounded-xs"
              style={{ backgroundColor: palette.ink }}
            />
          </div>
          <div
            className="px-1 py-0.5 border-t"
            style={{ borderColor: palette.border }}
          >
            <div
              className="h-1 w-1/2 rounded-xs opacity-60"
              style={{ backgroundColor: palette.ink }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (templateId === "tips-quote") {
    return (
      <div
        className="w-full aspect-[4/5] rounded-md overflow-hidden p-1.5 flex flex-col justify-between border"
        style={{
          backgroundColor: palette.bgStart,
          borderColor: palette.border,
        }}
        aria-hidden="true"
      >
        <div className="flex justify-between items-center">
          <div
            className="h-1 w-5 rounded-xs"
            style={{ backgroundColor: palette.ink }}
          />
          <div
            className="h-1.5 w-4 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
        </div>
        <div
          className="flex-1 my-1 rounded-sm border p-1.5 flex flex-col justify-center gap-1"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          <div
            className="h-1.5 w-3 rounded-xs"
            style={{ backgroundColor: brandColor }}
          />
          <div
            className="h-1.5 w-full rounded-xs"
            style={{ backgroundColor: palette.ink }}
          />
          <div
            className="h-1 w-4/5 rounded-xs opacity-60"
            style={{ backgroundColor: palette.ink }}
          />
          <div
            className="h-1 w-3/5 rounded-xs opacity-60"
            style={{ backgroundColor: palette.ink }}
          />
        </div>
        <div
          className="h-1.5 w-full rounded-xs border"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        />
      </div>
    );
  }

  // Default: "editorial-fnb"
  return (
    <div
      className="w-full aspect-[4/5] rounded-md overflow-hidden p-1.5 flex flex-col justify-between border"
      style={{
        backgroundColor: palette.bgStart,
        borderColor: palette.border,
      }}
      aria-hidden="true"
    >
      <div
        className="pb-1 border-b flex justify-between items-center"
        style={{ borderColor: palette.border }}
      >
        <div
          className="h-1 w-6 rounded-xs"
          style={{ backgroundColor: palette.ink }}
        />
        <div
          className="h-1.5 w-4 rounded-full"
          style={{ backgroundColor: brandColor }}
        />
      </div>
      <div
        className="w-full flex-1 my-1 rounded-sm border"
        style={{
          backgroundColor: hasPhoto ? `${brandColor}24` : palette.surface,
          borderColor: palette.border,
        }}
      />
      <div className="space-y-0.5">
        <div
          className="h-1.5 w-4/5 rounded-xs"
          style={{ backgroundColor: palette.ink }}
        />
        <div
          className="h-1.5 w-2/5 rounded-xs"
          style={{ backgroundColor: brandColor }}
        />
      </div>
    </div>
  );
}
