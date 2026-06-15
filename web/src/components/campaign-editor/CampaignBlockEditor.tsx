"use client";

import React, { useRef, useState } from "react";
import { campaignsApi } from "@/lib/api";

export type BlockType =
  | "navigation"
  | "hero"
  | "section"
  | "button"
  | "content"
  | "divider"
  | "spacer"
  | "gallery";

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
};

type Align = "left" | "center" | "right";

export type ContentWidthPreset = "compact" | "regular" | "wide";
export type FontPreset = "jakarta" | "helvetica" | "arial" | "georgia";
export type SecondaryButtonStyle = "outline" | "dark";

export type CampaignTemplateSettings = {
  contentWidth: ContentWidthPreset;
  fontPreset: FontPreset;
  bodyBackground: string;
  contentBackground: string;
  headingColor: string;
  textColor: string;
  linkColor: string;
  dividerColor: string;
  buttonPrimaryBackground: string;
  buttonPrimaryText: string;
  secondaryButtonStyle: SecondaryButtonStyle;
};

export type CampaignBuilderState = {
  version: 1;
  template: CampaignTemplateSettings;
  blocks: Block[];
};

type BuilderSidebarTab = "template" | "settings";

export const FONT_PRESETS: Record<
  FontPreset,
  { label: string; family: string }
> = {
  jakarta: {
    label: "Plus Jakarta Sans",
    family:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  helvetica: {
    label: "Helvetica",
    family: "Helvetica, Arial, sans-serif",
  },
  arial: {
    label: "Arial",
    family: "Arial, Helvetica, sans-serif",
  },
  georgia: {
    label: "Georgia",
    family: "Georgia, 'Times New Roman', serif",
  },
};

export const CONTENT_WIDTH_PRESETS: Record<
  ContentWidthPreset,
  { label: string; width: number }
> = {
  compact: { label: "Compact", width: 560 },
  regular: { label: "Regular", width: 600 },
  wide: { label: "Wide", width: 680 },
};

export const DEFAULT_TEMPLATE_SETTINGS: CampaignTemplateSettings = {
  contentWidth: "regular",
  fontPreset: "jakarta",
  bodyBackground: "#eef2f7",
  contentBackground: "#ffffff",
  headingColor: "#141216",
  textColor: "#4b5563",
  linkColor: "#2563eb",
  dividerColor: "#d7dde7",
  buttonPrimaryBackground: "#16a34a",
  buttonPrimaryText: "#ffffff",
  secondaryButtonStyle: "outline",
};

/** Style variants per block type (stored in props.style). */
export const NAVIGATION_STYLES = [
  { id: "minimal", label: "Minimal" },
  { id: "centered", label: "Centered" },
  { id: "bordered", label: "Bordered" },
  { id: "dark", label: "Dark bar" },
] as const;
export const HERO_STYLES = [
  { id: "minimal", label: "Minimal" },
  { id: "card", label: "Card" },
  { id: "fullWidth", label: "Full width" },
] as const;
export const BUTTON_STYLES = [
  { id: "primary", label: "Primary" },
  { id: "outline", label: "Outline" },
  { id: "text", label: "Text link" },
] as const;
export const DIVIDER_STYLES = [
  { id: "line", label: "Line" },
  { id: "dotted", label: "Dotted" },
  { id: "spaced", label: "Spaced" },
] as const;

const BLOCK_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  navigation: {
    style: "minimal",
    logoType: "text" as "text" | "image",
    logoText: "Your Brand",
    logoUrl: "",
    links: [
      { text: "Home", url: "" },
      { text: "About", url: "" },
    ],
    align: "center" as Align,
  },
  hero: {
    style: "minimal",
    heading: "Welcome to our newsletter",
    subtext: "Here's what's new this week.",
    buttonText: "Learn more",
    buttonUrl: "#",
    imageUrl: "",
    align: "center" as Align,
  },
  section: {
    columnCount: 1,
    heading: "",
    align: "left" as Align,
    columns: [
      {
        heading: "",
        content: "Column content. Add text, images, or buttons below.",
        imageUrl: "",
        buttonText: "",
        buttonUrl: "",
      },
    ],
  },
  button: {
    style: "primary",
    text: "Click here",
    url: "#",
    align: "center" as Align,
  },
  content: {
    html: "<p>Hello {{name}},</p><p>Your custom content goes here.</p>",
    imageUrl: "",
    imageAlt: "Image",
    align: "left" as Align,
  },
  divider: { style: "line", align: "center" as Align },
  spacer: { height: 24 },
  gallery: {
    align: "center" as Align,
    images: [
      { src: "", alt: "Image 1", url: "#" },
      { src: "", alt: "Image 2", url: "#" },
      { src: "", alt: "Image 3", url: "#" },
    ],
  },
};

const BLOCK_LABELS: Record<BlockType, string> = {
  navigation: "Navigation",
  hero: "Hero",
  section: "Section",
  button: "Button",
  content: "Content",
  divider: "Divider",
  spacer: "Spacer",
  gallery: "Gallery",
};

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  navigation: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  ),
  hero: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  section: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  button: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  content: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h7"
      />
    </svg>
  ),
  divider: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14"
      />
    </svg>
  ),
  spacer: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  ),
  gallery: (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
      />
    </svg>
  ),
};

function genId() {
  return "b-" + Math.random().toString(36).slice(2, 11);
}

export function createDefaultBuilderState(): CampaignBuilderState {
  return {
    version: 1,
    template: { ...DEFAULT_TEMPLATE_SETTINGS },
    blocks: [],
  };
}

export function normalizeTemplateSettings(
  raw?: Partial<CampaignTemplateSettings> | null,
): CampaignTemplateSettings {
  const next = {
    ...DEFAULT_TEMPLATE_SETTINGS,
    ...(raw ?? {}),
  };
  if (!(next.contentWidth in CONTENT_WIDTH_PRESETS)) {
    next.contentWidth = DEFAULT_TEMPLATE_SETTINGS.contentWidth;
  }
  if (!(next.fontPreset in FONT_PRESETS)) {
    next.fontPreset = DEFAULT_TEMPLATE_SETTINGS.fontPreset;
  }
  if (!["outline", "dark"].includes(next.secondaryButtonStyle)) {
    next.secondaryButtonStyle = DEFAULT_TEMPLATE_SETTINGS.secondaryButtonStyle;
  }
  return next;
}

function createContentBlockFromHtml(html: string, patch?: Partial<Block["props"]>): Block {
  return {
    id: genId(),
    type: "content",
    props: {
      ...BLOCK_DEFAULTS.content,
      html,
      ...(patch ?? {}),
    },
  };
}

export function normalizeBuilderState(
  raw?: unknown,
  fallbackHtml = "",
  templateFallback?: Partial<CampaignTemplateSettings> | null,
): CampaignBuilderState {
  const fallback = createDefaultBuilderState();
  const normalizedTemplate = normalizeTemplateSettings(
    typeof raw === "object" && raw != null && "template" in raw
      ? (raw as { template?: Partial<CampaignTemplateSettings> }).template
      : templateFallback,
  );
  const blocks =
    typeof raw === "object" &&
    raw != null &&
    Array.isArray((raw as { blocks?: unknown[] }).blocks)
      ? (raw as { blocks: unknown[] }).blocks
          .map((candidate) => {
            if (
              !candidate ||
              typeof candidate !== "object" ||
              !("type" in candidate)
            ) {
              return null;
            }
            const type = (candidate as { type?: string }).type;
            if (!type || !(type in BLOCK_DEFAULTS)) return null;
            const rawId = (candidate as { id?: string }).id;
            const candidateId: string =
              typeof rawId === "string" && rawId ? rawId : genId();
            return {
              id: candidateId,
              type: type as BlockType,
              props: {
                ...BLOCK_DEFAULTS[type as BlockType],
                ...((candidate as { props?: Record<string, unknown> }).props ?? {}),
              },
            } satisfies Block;
          })
          .filter((block): block is Block => block != null)
      : parseHtmlToBlocks(fallbackHtml);

  return {
    ...fallback,
    version: 1,
    template: normalizedTemplate,
    blocks,
  };
}

function getTemplateFontFamily(template: CampaignTemplateSettings): string {
  return FONT_PRESETS[template.fontPreset].family;
}

function getTemplateContentWidth(template: CampaignTemplateSettings): number {
  return CONTENT_WIDTH_PRESETS[template.contentWidth].width;
}

function getContainerStyle(template: CampaignTemplateSettings): string {
  return `style="max-width: ${getTemplateContentWidth(template)}px; margin: 0 auto;"`;
}

function getBaseCellStyle(template: CampaignTemplateSettings): string {
  return `padding: 16px 24px; font-family: ${getTemplateFontFamily(template)}; font-size: 16px; line-height: 1.5; color: ${template.textColor};`;
}

function getPrimaryButtonStyle(
  template: CampaignTemplateSettings,
  extra = "",
): string {
  return `display: inline-block; padding: 12px 24px; background: ${template.buttonPrimaryBackground}; color: ${template.buttonPrimaryText}; text-decoration: none; border-radius: 8px; font-weight: 600; ${extra}`.trim();
}

function getSecondaryButtonStyle(template: CampaignTemplateSettings): string {
  if (template.secondaryButtonStyle === "dark") {
    return `display: inline-block; padding: 12px 28px; background: ${template.headingColor}; color: ${template.contentBackground}; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid ${template.headingColor};`;
  }
  return `display: inline-block; padding: 12px 28px; background: transparent; color: ${template.linkColor}; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid ${template.linkColor};`;
}

function renderParagraphs(text: string, style: string): string {
  const lines = (text || "").split(/\n+/).filter((line) => line.trim());
  if (lines.length === 0) return "";
  return lines
    .map((line) => `<p style="${style}">${escapeHtml(line)}</p>`)
    .join("");
}

/** Renders a single block to HTML (used for builder preview and full output). */
export function blockToHtml(
  b: Block,
  templateInput?: Partial<CampaignTemplateSettings> | null,
): string {
  const template = normalizeTemplateSettings(templateInput);
  const baseCellStyle = getBaseCellStyle(template);
  const containerStyle = getContainerStyle(template);

  switch (b.type) {
    case "navigation": {
      const style = (b.props.style as string) || "minimal";
      const logoType = (b.props.logoType as "text" | "image") || "text";
      const logoText = (b.props.logoText as string) || "Brand";
      const logoUrl = (b.props.logoUrl as string) || "";
      const links = (b.props.links as { text: string; url: string }[]) || [];
      const align = (b.props.align as Align) || "center";
      const linkColor = style === "dark" ? "#e5e7eb" : template.linkColor;
      const linkItems = links
        .filter((l) => (l.text || "").trim())
        .map((l) => {
          const label = escapeHtml((l.text || "").trim());
          const url = (l.url || "").trim();
          if (url) {
            return `<a href="${escapeHtml(url)}" style="color: ${linkColor}; text-decoration: none; font-size: 14px;">${label}</a>`;
          }
          return `<span style="font-size: 14px; color: ${style === "dark" ? "#9ca3af" : template.textColor};">${label}</span>`;
        })
        .join(" &nbsp;·&nbsp; ");
      const isSvg = /\.svg(\?|$)/i.test(logoUrl);
      const logoImgStyle = isSvg
        ? "max-width: 180px; width: 180px; height: auto; display: block; border: 0;"
        : "max-width: 180px; height: auto; display: block; border: 0;";
      const logoHtml =
        logoType === "image" && logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(logoText || "Logo")}" style="${logoImgStyle}" ${isSvg ? 'width="180"' : ""} />`
          : `<strong style="font-size: 18px; letter-spacing: -0.02em; color: ${style === "dark" ? "#fff" : template.headingColor};">${escapeHtml(logoText || "Brand")}</strong>`;
      const hasLinks = linkItems.length > 0;
      const isDark = style === "dark";
      const bg = isDark ? "background: #1f2937;" : "";
      const borderBottom =
        style === "bordered"
          ? `border-bottom: 1px solid ${template.dividerColor};`
          : "";
      const pad = style === "centered" ? "24px 24px" : style === "dark" ? "16px 24px" : "20px 24px";
      const tdStyle = `style="${baseCellStyle} text-align: ${align}; padding: ${pad}; ${bg} ${borderBottom}"`;
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              <div style="margin-bottom: ${hasLinks ? "12px" : "0"};">${logoHtml}</div>
              ${hasLinks ? `<div style="font-size: 14px; line-height: 1.6;">${linkItems}</div>` : ""}
            </td></tr>
          </table>`;
    }
    case "hero": {
      const style = (b.props.style as string) || "minimal";
      const heading = (b.props.heading as string) || "";
      const subtext = (b.props.subtext as string) || "";
      const btnText = (b.props.buttonText as string) || "";
      const btnUrl = (b.props.buttonUrl as string) || "#";
      const imgUrl = (b.props.imageUrl as string) || "";
      const align = (b.props.align as Align) || "center";
      const cardWrap =
        style === "card"
          ? `background: ${template.bodyBackground}; border-radius: 12px; padding: 28px 24px;`
          : "";
      const fullWidth = style === "fullWidth" ? "max-width: 100%;" : "";
      const tdStyle = `style="${baseCellStyle} text-align: ${align}; padding: 32px 24px; ${cardWrap} ${fullWidth}"`;
      const btnStyle = getPrimaryButtonStyle(template);
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />` : ""}
              <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700; color: ${template.headingColor};">${escapeHtml(heading)}</h1>
              <p style="margin: 0 0 20px; color: ${template.textColor}; font-size: 16px;">${escapeHtml(subtext)}</p>
              ${btnText ? `<a href="${escapeHtml(btnUrl)}" style="${btnStyle}">${escapeHtml(btnText)}</a>` : ""}
            </td></tr>
          </table>`;
    }
    case "button": {
      const style = (b.props.style as string) || "primary";
      const text = (b.props.text as string) || "Button";
      const url = (b.props.url as string) || "#";
      const align = (b.props.align as Align) || "center";
      const tdStyle = `style="${baseCellStyle} text-align: ${align};"`;
      const btnStyle =
        style === "outline"
          ? getSecondaryButtonStyle(template)
          : style === "text"
            ? `display: inline-block; padding: 0; background: transparent; color: ${template.linkColor}; text-decoration: underline; font-weight: 600;`
            : getPrimaryButtonStyle(template, "padding: 12px 28px;");
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              <a href="${escapeHtml(url)}" style="${btnStyle}">${escapeHtml(text)}</a>
            </td></tr>
          </table>`;
    }
    case "divider": {
      const style = (b.props.style as string) || "line";
      const align = (b.props.align as Align) || "center";
      const alignStyle =
        align === "center" ? "margin: 0 auto" : align === "right" ? "margin: 0 0 0 auto" : "margin: 0";
      const tdStyle = `style="${baseCellStyle} text-align: ${align};"`;
      const hrStyle =
        style === "dotted"
          ? `border: none; border-top: 2px dotted ${template.dividerColor}; ${alignStyle}; max-width: 100%;`
          : style === "spaced"
            ? `border: none; margin: 24px auto; max-width: 100%; height: 0;`
            : `border: none; border-top: 1px solid ${template.dividerColor}; ${alignStyle}; max-width: 100%;`;
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}><hr style="${hrStyle}" /></td></tr>
          </table>`;
    }
    case "section": {
      const columnCount = Math.min(3, Math.max(1, Number(b.props.columnCount) || 1));
      const heading = (b.props.heading as string) || "";
      const align = (b.props.align as Align) || "left";
      const columns = (b.props.columns as { heading?: string; content: string; imageUrl?: string; buttonText?: string; buttonUrl?: string }[]) || [];
      const widthPct = Math.floor(100 / columnCount);
      const cellStyleCol = `style="${baseCellStyle} padding: 16px 12px; vertical-align: top; width: ${widthPct}%; text-align: ${align};"`;
      const cells = Array.from({ length: columnCount }, (_, i) => {
        const col = columns[i] || { heading: "", content: "", imageUrl: "", buttonText: "", buttonUrl: "" };
        const img = (col.imageUrl as string)?.trim();
        const btn = (col.buttonText as string)?.trim();
        const btnUrl = (col.buttonUrl as string) || "#";
        return `<td ${cellStyleCol}>
            ${(col.heading as string) ? `<h3 style="margin: 0 0 8px; font-size: 18px; color: ${template.headingColor};">${escapeHtml(String(col.heading))}</h3>` : ""}
            ${img ? `<img src="${escapeHtml(img)}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 12px;" />` : ""}
            ${renderParagraphs(col.content || "", `margin: 0 0 12px; color: ${template.textColor};`)}
            ${btn ? `<a href="${escapeHtml(btnUrl)}" style="${getPrimaryButtonStyle(template, "padding: 10px 20px; font-size: 14px;")}">${escapeHtml(btn)}</a>` : ""}
          </td>`;
      }).join("");
      const headingTdStyle = `style="${baseCellStyle} text-align: ${align};"`;
      const headingAlign = `style="margin: 0 0 16px; font-size: 22px; text-align: ${align}; color: ${template.headingColor};"`;
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            ${heading ? `<tr><td ${headingTdStyle} colspan="${columnCount}"><h2 ${headingAlign}>${escapeHtml(heading)}</h2></td></tr>` : ""}
            <tr>${cells}</tr>
          </table>`;
    }
    case "content": {
      const html = (b.props.html as string) || "";
      const imageUrl = (b.props.imageUrl as string) || "";
      const imageAlt = (b.props.imageAlt as string) || "Image";
      const align = (b.props.align as Align) || "left";
      const tdStyle = `style="${baseCellStyle} text-align: ${align};"`;
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />` : ""}
              <div>${html}</div>
            </td></tr>
          </table>`;
    }
    case "spacer": {
      const h = Math.max(0, Number(b.props.height) ?? 24);
      return `<div style="height: ${h}px;"></div>`;
    }
    case "gallery": {
      const images = (b.props.images as { src: string; alt: string; url: string }[]) || [];
      const align = (b.props.align as Align) || "center";
      const cols = 3;
      const width = Math.floor(100 / cols);
      const galleryTdStyle = `style="${baseCellStyle} text-align: ${align}; width: ${width}%; vertical-align: top;"`;
      const cells = images
        .filter((i) => i.src)
        .map((i) => `<td ${galleryTdStyle}><a href="${escapeHtml(i.url || "#")}"><img src="${escapeHtml(i.src)}" alt="${escapeHtml(i.alt || "")}" style="max-width: 100%; height: auto; border-radius: 8px;" /></a></td>`)
        .join("");
      if (!cells) return "";
      return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr>${cells}</tr>
          </table>`;
    }
    default:
      return "";
  }
}

export function builderStateToHtml(
  builderState?: CampaignBuilderState | null,
): string {
  const normalized = normalizeBuilderState(builderState);
  return blocksToHtml(normalized.blocks, normalized.template);
}

function blocksToHtml(
  blocks: Block[],
  template?: Partial<CampaignTemplateSettings> | null,
): string {
  const parts = blocks.map((b) => blockToHtml(b, template)).filter(Boolean);
  return parts.join("\n").trim() || "<p></p>";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Viewport presets for email preview. */
export const PREVIEW_VIEWPORTS = [
  { id: "phone", label: "Phone", width: 375, icon: "phone" },
  { id: "tablet", label: "Tablet", width: 768, icon: "tablet" },
  { id: "laptop", label: "Laptop", width: 1024, icon: "laptop" },
  { id: "desktop", label: "Desktop", width: 1280, icon: "desktop" },
  { id: "full", label: "Full", width: null, icon: "full" },
] as const;
export type PreviewViewportId = (typeof PREVIEW_VIEWPORTS)[number]["id"];

/** Full email preview HTML (wrapper + body) for live preview. */
export function buildEmailPreviewHtml(
  innerBody: string,
  templateInput?: Partial<CampaignTemplateSettings> | null,
): string {
  const template = normalizeTemplateSettings(templateInput);
  const withPlaceholders = innerBody
    .replace(/\{\{name\}\}/g, "John")
    .replace(/\{\{email\}\}/g, "john@example.com")
    .replace(/\{\{id\}\}/g, "123")
    .replace(/\{\{unsubscribe_url\}\}/g, "#");
  const contentWidth = getTemplateContentWidth(template);
  const fontFamily = getTemplateFontFamily(template);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>a{color:${template.linkColor};text-decoration:none;}a:hover{text-decoration:underline;}p{margin:0 0 1em;}p:last-child{margin-bottom:0;}h1,h2,h3{color:${template.headingColor};margin:0 0 0.5em;font-weight:600;}</style>
</head>
<body style="margin:0;padding:0;background:${template.bodyBackground};font-family:${fontFamily};font-size:16px;line-height:1.6;color:${template.textColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:transparent;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${contentWidth}px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04);background-color:${template.contentBackground};border:1px solid ${template.dividerColor};">
          <tr>
            <td style="padding:24px 32px 32px;">
              <div style="color:${template.textColor};">
${withPlaceholders}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 36px;border-top:1px solid ${template.dividerColor};background-color:${template.contentBackground};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:50%;vertical-align:top;text-align:left;padding-right:24px;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${template.headingColor};">Klarnow</p>
                    <p style="margin:0 0 4px;font-size:13px;color:${template.textColor};line-height:1.5;">Pendleton Way, Salford, Greater Manchester, M6 5FW</p>
                    <p style="margin:0 0 12px;font-size:13px;color:${template.textColor};line-height:1.5;">United Kingdom</p>
                    <p style="margin:0;font-size:13px;color:${template.textColor};"><a href="https://x.com/klarnow" style="color:${template.linkColor};text-decoration:none;">X</a> &nbsp; <a href="https://www.instagram.com/klarnow/" style="color:${template.linkColor};text-decoration:none;">Instagram</a> &nbsp; <a href="https://www.linkedin.com/company/klarnow/" style="color:${template.linkColor};text-decoration:none;">LinkedIn</a></p>
                  </td>
                  <td style="width:50%;vertical-align:top;text-align:right;">
                    <p style="margin:0 0 12px;font-size:13px;color:${template.textColor};">You received this email because you signed up on our website or made a purchase from us.</p>
                    <p style="margin:0;"><a href="#" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;color:${template.buttonPrimaryText};background-color:${template.buttonPrimaryBackground};border-radius:8px;text-decoration:none;">Unsubscribe</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type CampaignBlockEditorProps = {
  value?: string;
  builderState?: CampaignBuilderState | null;
  onChange: (next: {
    html: string;
    builderState: CampaignBuilderState;
  }) => void;
  className?: string;
  onPreview?: () => void;
};

const BLOCK_LIBRARY_GROUPS: Array<{
  label: string;
  types: BlockType[];
}> = [
  { label: "Navigation", types: ["navigation"] },
  { label: "Hero", types: ["hero"] },
  { label: "Sections", types: ["section"] },
  { label: "Elements", types: ["button", "content", "divider", "spacer"] },
  { label: "Gallery", types: ["gallery"] },
];

export function syncBuilderStateWithHtml(
  builderState: CampaignBuilderState | null | undefined,
  html: string,
): CampaignBuilderState {
  const normalized = normalizeBuilderState(builderState);
  const trimmedHtml = (html || "").trim();
  if (!trimmedHtml || trimmedHtml === "<p></p>") {
    return { ...normalized, blocks: [] };
  }
  if (builderStateToHtml(normalized).trim() === trimmedHtml) {
    return normalized;
  }
  return {
    ...normalized,
    blocks: parseHtmlToBlocks(trimmedHtml),
  };
}

export function CampaignBlockEditor({
  value,
  builderState,
  onChange,
  className = "",
  onPreview,
}: CampaignBlockEditorProps) {
  const [state, setState] = useState<CampaignBuilderState>(() =>
    normalizeBuilderState(builderState, value),
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<BuilderSidebarTab>("template");
  const [searchQuery, setSearchQuery] = useState("");
  const [past, setPast] = useState<CampaignBuilderState[]>([]);
  const [future, setFuture] = useState<CampaignBuilderState[]>([]);
  const [draggingBlockIndex, setDraggingBlockIndex] = useState<number | null>(null);
  const [draggingPaletteType, setDraggingPaletteType] = useState<BlockType | null>(null);
  const [dropSlotIndex, setDropSlotIndex] = useState<number | null>(null);

  const isDragActive = draggingBlockIndex !== null || draggingPaletteType !== null;
  const selectedBlock =
    state.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const serializedState = JSON.stringify(state);
  const externalState = normalizeBuilderState(builderState, value, state.template);
  const serializedExternalState = JSON.stringify(externalState);

  React.useEffect(() => {
    if (serializedExternalState === serializedState) return;
    setState(externalState);
    setPast([]);
    setFuture([]);
    setSelectedBlockId(null);
    setActiveSidebarTab("template");
  }, [externalState, serializedExternalState, serializedState]);

  const emitChange = React.useCallback(
    (next: CampaignBuilderState) => {
      onChange({
        html: builderStateToHtml(next),
        builderState: next,
      });
    },
    [onChange],
  );

  const createBlock = (type: BlockType): Block => ({
    id: genId(),
    type,
    props: { ...BLOCK_DEFAULTS[type] },
  });

  const commitState = (
    next: CampaignBuilderState,
    options?: {
      recordHistory?: boolean;
      nextSelectedBlockId?: string | null;
    },
  ) => {
    const normalized = normalizeBuilderState(next);
    if (JSON.stringify(normalized) === serializedState) return;
    if (options?.recordHistory !== false) {
      setPast((prev) => [...prev.slice(-39), state]);
    }
    setFuture([]);
    setState(normalized);
    emitChange(normalized);
    const nextSelectedBlockId =
      options?.nextSelectedBlockId !== undefined
        ? options.nextSelectedBlockId
        : selectedBlockId;
    const selectionStillExists =
      nextSelectedBlockId != null &&
      normalized.blocks.some((block) => block.id === nextSelectedBlockId);
    setSelectedBlockId(selectionStillExists ? nextSelectedBlockId : null);
    setActiveSidebarTab(selectionStillExists ? "settings" : "template");
  };

  const updateBlock = (id: string, props: Record<string, unknown>) => {
    commitState(
      {
        ...state,
        blocks: state.blocks.map((block) =>
          block.id === id ? { ...block, props } : block,
        ),
      },
      { nextSelectedBlockId: id },
    );
  };

  const removeBlock = (id: string) => {
    commitState(
      {
        ...state,
        blocks: state.blocks.filter((block) => block.id !== id),
      },
      { nextSelectedBlockId: selectedBlockId === id ? null : selectedBlockId },
    );
  };

  const addBlock = (type: BlockType, atIndex = state.blocks.length) => {
    const newBlock = createBlock(type);
    const nextBlocks = [...state.blocks];
    nextBlocks.splice(atIndex, 0, newBlock);
    commitState(
      {
        ...state,
        blocks: nextBlocks,
      },
      { nextSelectedBlockId: newBlock.id },
    );
  };

  const updateTemplate = (patch: Partial<CampaignTemplateSettings>) => {
    commitState({
      ...state,
      template: normalizeTemplateSettings({
        ...state.template,
        ...patch,
      }),
    });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [state, ...items].slice(0, 40));
    setState(previous);
    emitChange(previous);
    if (!previous.blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(null);
      setActiveSidebarTab("template");
    }
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setPast((items) => [...items.slice(-39), state]);
    setState(next);
    emitChange(next);
    if (!next.blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(null);
      setActiveSidebarTab("template");
    }
  };

  const clearSelection = () => {
    setSelectedBlockId(null);
    setActiveSidebarTab("template");
  };

  const getDropEffect = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("application/x-block-type")
      ? "copy"
      : "move";

  const handleDragStartBlock = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("application/x-block-index", String(index));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setDraggingPaletteType(null);
    setDraggingBlockIndex(index);
  };

  const handleDragEndBlock = () => {
    setDraggingBlockIndex(null);
    setDraggingPaletteType(null);
    setDropSlotIndex(null);
  };

  const handleDropOnSlot = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDropSlotIndex(null);
    setDraggingBlockIndex(null);
    setDraggingPaletteType(null);
    const blockType = e.dataTransfer.getData("application/x-block-type");
    const dragIndexRaw = e.dataTransfer.getData("application/x-block-index");
    const dragIndex = dragIndexRaw === "" ? -1 : Number(dragIndexRaw);
    if (blockType && BLOCK_DEFAULTS[blockType as BlockType]) {
      addBlock(blockType as BlockType, slotIndex);
      return;
    }
    if (!Number.isNaN(dragIndex) && dragIndex >= 0) {
      const insertAt = dragIndex < slotIndex ? slotIndex - 1 : slotIndex;
      if (insertAt === dragIndex) return;
      const next = [...state.blocks];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(insertAt, 0, removed);
      commitState(
        {
          ...state,
          blocks: next,
        },
        { nextSelectedBlockId: removed.id },
      );
    }
  };

  const handleDragOverSlot = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = getDropEffect(e);
    setDropSlotIndex(slotIndex);
  };

  const handleDragLeaveSlot = () => {
    setDropSlotIndex(null);
  };

  const getCardDropSlot = (e: React.DragEvent, index: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY >= rect.top + rect.height / 2 ? index + 1 : index;
  };

  const handleDragOverBlockCard = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = getDropEffect(e);
    setDropSlotIndex(getCardDropSlot(e, index));
  };

  const handleDropOnBlockCard = (e: React.DragEvent, index: number) => {
    handleDropOnSlot(e, getCardDropSlot(e, index));
  };

  const filteredGroups = BLOCK_LIBRARY_GROUPS.map((group) => ({
    ...group,
    types: group.types.filter((type) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        BLOCK_LABELS[type].toLowerCase().includes(query) ||
        group.label.toLowerCase().includes(query)
      );
    }),
  })).filter((group) => group.types.length > 0);

  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-(--card-border) bg-(--surface) shadow-[0_24px_60px_rgba(15,23,42,0.14)] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171717] px-4 py-3 text-white">
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          Go back
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={past.length === 0}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={onPreview}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#15803d]"
          >
            Done editing
          </button>
        </div>
      </div>

      <div className="grid min-h-[780px] gap-0 xl:grid-cols-[260px,minmax(0,1fr),340px]">
        <aside className="flex min-h-[240px] flex-col border-r border-(--card-border) bg-(--surface-elevated)">
          <div className="border-b border-(--card-border) p-4">
            <div className="flex items-center gap-3 rounded-xl border border-(--card-border) bg-(--surface) px-3 py-2">
              <svg className="h-4 w-4 text-muted-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blocks"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-dim"
              />
            </div>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {filteredGroups.map((group) => (
              <section key={group.label} className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-dim">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-block-type", type);
                        e.dataTransfer.effectAllowed = "copy";
                        setDraggingPaletteType(type);
                      }}
                      onDragEnd={() => {
                        setDraggingPaletteType(null);
                        setDropSlotIndex(null);
                      }}
                      onClick={() => addBlock(type)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-(--card-border) bg-(--surface) px-3 py-3 text-left text-sm text-foreground transition-colors hover:border-(--accent)/40 hover:bg-(--surface-hover)"
                    >
                      <span className="shrink-0 text-muted-dim">{BLOCK_ICONS[type]}</span>
                      <span className="font-medium">{BLOCK_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {filteredGroups.length === 0 && (
              <div className="rounded-2xl border border-dashed border-(--card-border) px-4 py-10 text-center text-sm text-muted-dim">
                No blocks match your search.
              </div>
            )}
          </div>
        </aside>

        <div
          className="min-w-0 overflow-auto bg-[#edf1f7] p-5 sm:p-8"
          onClick={clearSelection}
        >
          <div className="mx-auto mb-6 max-w-[720px] text-center">
            <button
              type="button"
              onClick={onPreview}
              className="text-sm font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              View in browser
            </button>
          </div>

          <div
            className="mx-auto overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
            style={{ maxWidth: `${getTemplateContentWidth(state.template)}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-(--card-border) px-7 py-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-muted-dim">
              Newsletter canvas
            </div>
            <div className="px-5 py-6 sm:px-8">
              {state.blocks.length === 0 ? (
                <div
                  className={`rounded-[24px] border-2 border-dashed px-6 py-20 text-center transition-colors ${
                    dropSlotIndex === 0
                      ? "border-(--accent) bg-(--accent)/6"
                      : "border-(--card-border) bg-(--surface-elevated)"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = getDropEffect(e);
                    setDropSlotIndex(0);
                  }}
                  onDragLeave={handleDragLeaveSlot}
                  onDrop={(e) => handleDropOnSlot(e, 0)}
                >
                  <p className="text-base font-semibold text-foreground">
                    Start building your email
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-dim">
                    Drag a block from the left sidebar into this canvas, or click a block to add it to the template.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-0"
                  onDragOver={(e) => {
                    if (e.target !== e.currentTarget) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = getDropEffect(e);
                    setDropSlotIndex(state.blocks.length);
                  }}
                  onDragLeave={(e) => {
                    if (e.target === e.currentTarget) handleDragLeaveSlot();
                  }}
                  onDrop={(e) => {
                    if (e.target !== e.currentTarget) return;
                    handleDropOnSlot(e, state.blocks.length);
                  }}
                >
                  {state.blocks.map((block, index) => (
                    <React.Fragment key={block.id}>
                      <DropSlot
                        slotIndex={index}
                        isActive={dropSlotIndex === index}
                        onDragOver={handleDragOverSlot}
                        onDragLeave={handleDragLeaveSlot}
                        onDrop={handleDropOnSlot}
                      />
                      <CanvasBlock
                        block={block}
                        index={index}
                        isSelected={selectedBlockId === block.id}
                        isDragging={draggingBlockIndex === index}
                        isDragActive={isDragActive}
                        template={state.template}
                        onSelect={() => {
                          setSelectedBlockId(block.id);
                          setActiveSidebarTab("settings");
                        }}
                        onUpdate={(props) => updateBlock(block.id, props)}
                        onRemove={() => removeBlock(block.id)}
                        onDragStart={(e) => handleDragStartBlock(e, index)}
                        onDragEnd={handleDragEndBlock}
                        onDragOver={(e) => handleDragOverBlockCard(e, index)}
                        onDrop={(e) => handleDropOnBlockCard(e, index)}
                      />
                    </React.Fragment>
                  ))}
                  <DropSlot
                    slotIndex={state.blocks.length}
                    isActive={dropSlotIndex === state.blocks.length}
                    onDragOver={handleDragOverSlot}
                    onDragLeave={handleDragLeaveSlot}
                    onDrop={handleDropOnSlot}
                  />
                </div>
              )}
            </div>
            <CanvasFooterPreview template={state.template} />
          </div>
        </div>

        <aside className="flex min-h-[240px] flex-col border-l border-(--card-border) bg-(--surface-elevated)">
          <div className="flex border-b border-(--card-border)">
            {(["template", "settings"] as const).map((tab) => {
              const isActive = activeSidebarTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    if (tab === "settings" && !selectedBlock) return;
                    setActiveSidebarTab(tab);
                  }}
                  disabled={tab === "settings" && !selectedBlock}
                  className={`flex-1 border-b-2 px-4 py-4 text-sm font-medium capitalize transition-colors ${
                    isActive
                      ? "border-(--accent) text-foreground"
                      : "border-transparent text-muted-dim hover:text-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeSidebarTab === "template" ? (
              <TemplateSettingsPanel
                template={state.template}
                onChange={updateTemplate}
              />
            ) : selectedBlock ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-(--card-border) bg-(--surface) px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-dim">
                    Selected block
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {BLOCK_LABELS[selectedBlock.type]}
                  </p>
                </div>
                <div className="rounded-2xl border border-(--card-border) bg-(--surface) p-4">
                  <BlockFields
                    block={selectedBlock}
                    onUpdate={(props) => updateBlock(selectedBlock.id, props)}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-(--card-border) bg-(--surface) px-6 py-12 text-center">
                <p className="text-base font-semibold text-foreground">
                  Select a block to edit it
                </p>
                <p className="mt-2 text-sm text-muted-dim">
                  Click any block in the canvas and its settings will appear here.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DropSlot({
  slotIndex,
  isActive,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  slotIndex: number;
  isActive: boolean;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, i: number) => void;
}) {
  return (
    <div
      className={`min-h-[12px] -my-1 rounded-lg transition-all duration-150 flex items-center justify-center ${
        isActive
          ? "min-h-[44px] bg-(--accent)/10 border-2 border-(--accent) border-dashed"
          : "hover:min-h-[20px] hover:bg-(--card-bg-subtle)"
      }`}
      onDragOver={(e) => onDragOver(e, slotIndex)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, slotIndex)}
    >
      {isActive && (
        <span className="text-xs font-medium text-(--accent)">Drop here</span>
      )}
    </div>
  );
}

type CanvasBlockProps = {
  block: Block;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  isDragActive: boolean;
  template: CampaignTemplateSettings;
  onSelect: () => void;
  onUpdate: (props: Record<string, unknown>) => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

function CanvasBlock({
  block,
  index,
  isSelected,
  isDragging,
  isDragActive,
  template,
  onSelect,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CanvasBlockProps) {
  return (
    <div
      className={`group relative rounded-[24px] border-2 transition-all duration-200 ${
        isSelected
          ? "border-(--accent) bg-(--accent)/6 shadow-[0_12px_30px_rgba(37,99,235,0.12)]"
          : "border-transparent hover:border-(--card-border) hover:bg-(--surface-elevated)"
      } ${isDragging ? "opacity-50" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragActive && (
        <div
          className="absolute inset-0 z-20"
          onDragOver={onDragOver}
          onDragLeave={(e) => e.stopPropagation()}
          onDrop={onDrop}
        />
      )}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-[#171717] px-3 py-2 text-xs font-medium text-white shadow-lg">
          <span
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="cursor-grab text-white/80 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </span>
          <span>{index + 1}. {BLOCK_LABELS[block.type]}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="pointer-events-auto rounded-xl bg-white px-3 py-2 text-xs font-medium text-danger shadow-lg transition-colors hover:bg-(--danger-muted)"
        >
          Remove
        </button>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <CanvasBlockContent
          block={block}
          template={template}
          isSelected={isSelected}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}

function CanvasBlockContent({
  block,
  template,
  isSelected,
  onUpdate,
}: {
  block: Block;
  template: CampaignTemplateSettings;
  isSelected: boolean;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const set = (patch: Record<string, unknown>) =>
    onUpdate({ ...block.props, ...patch });
  const fontFamily = getTemplateFontFamily(template);
  const headingColor = template.headingColor;
  const textColor = template.textColor;
  const linkColor = template.linkColor;
  const align = (block.props.align as Align) || "center";

  switch (block.type) {
    case "navigation": {
      const logoType = (block.props.logoType as "text" | "image") || "text";
      const links = (block.props.links as { text: string; url: string }[]) || [];
      return (
        <div
          className="rounded-[18px] px-6 py-5"
          style={{
            backgroundColor:
              block.props.style === "dark" ? "#1f2937" : "transparent",
          }}
        >
          <div
            className="flex flex-col gap-4"
            style={{
              alignItems:
                align === "left"
                  ? "flex-start"
                  : align === "right"
                    ? "flex-end"
                    : "center",
            }}
          >
            {logoType === "image" && block.props.logoUrl ? (
              <img
                src={String(block.props.logoUrl)}
                alt={String(block.props.logoText || "Logo")}
                className="max-h-16 w-auto object-contain"
              />
            ) : (
              <InlineTextField
                value={String(block.props.logoText || "")}
                onChange={(value) => set({ logoText: value })}
                className="text-center text-[2rem] font-black tracking-[-0.04em]"
                style={{
                  color: block.props.style === "dark" ? "#ffffff" : headingColor,
                  fontFamily,
                }}
                placeholder="Your brand"
              />
            )}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {links.map((link, linkIndex) => (
                <InlineTextField
                  key={`${block.id}-${linkIndex}`}
                  value={link.text}
                  onChange={(value) => {
                    const nextLinks = links.map((item, index) =>
                      index === linkIndex ? { ...item, text: value } : item,
                    );
                    set({ links: nextLinks });
                  }}
                  className="text-sm font-medium"
                  style={{
                    color: block.props.style === "dark" ? "#e5e7eb" : linkColor,
                    fontFamily,
                  }}
                  placeholder="Link label"
                />
              ))}
            </div>
          </div>
        </div>
      );
    }
    case "hero":
      return (
        <div
          className="rounded-[22px] px-6 py-7 text-center"
          style={{
            backgroundColor:
              block.props.style === "card" ? template.bodyBackground : "transparent",
          }}
        >
          {block.props.imageUrl ? (
            <img
              src={String(block.props.imageUrl)}
              alt=""
              className="mb-6 max-h-72 w-full rounded-[18px] object-cover"
            />
          ) : (
            <div className="mb-6 rounded-[18px] border border-dashed border-(--card-border) bg-(--surface-elevated) px-4 py-14 text-sm text-muted-dim">
              Add a hero image from the settings panel.
            </div>
          )}
          <InlineTextField
            value={String(block.props.heading || "")}
            onChange={(next) => set({ heading: next })}
            className="mx-auto max-w-2xl text-center text-[2.2rem] font-black tracking-[-0.05em]"
            style={{ color: headingColor, fontFamily }}
            placeholder="Write your title here"
          />
          <InlineTextareaField
            value={String(block.props.subtext || "")}
            onChange={(next) => set({ subtext: next })}
            rows={3}
            className="mx-auto mt-4 max-w-2xl text-center text-lg leading-8"
            style={{ color: textColor, fontFamily }}
            placeholder="Introduce your newsletter here."
          />
          {String(block.props.buttonText || "").trim() ? (
            <div className="mt-8">
              <button
                type="button"
                className="rounded-xl px-6 py-3 text-base font-semibold shadow-sm"
                style={{
                  backgroundColor: template.buttonPrimaryBackground,
                  color: template.buttonPrimaryText,
                  fontFamily,
                }}
              >
                <InlineTextField
                  value={String(block.props.buttonText || "")}
                  onChange={(next) => set({ buttonText: next })}
                  className="text-center text-base font-semibold"
                  style={{ color: template.buttonPrimaryText, fontFamily }}
                  placeholder="Button"
                />
              </button>
            </div>
          ) : null}
        </div>
      );
    case "section": {
      const columnCount = Math.min(3, Math.max(1, Number(block.props.columnCount) || 1));
      const columns = (
        (block.props.columns as SectionColumn[]) || []
      ).slice(0, columnCount);
      return (
        <div className="space-y-5 rounded-[22px] px-2">
          <InlineTextField
            value={String(block.props.heading || "")}
            onChange={(next) => set({ heading: next })}
            className="text-left text-[1.8rem] font-black tracking-[-0.04em]"
            style={{ color: headingColor, fontFamily }}
            placeholder="Section heading"
          />
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {columns.map((column, index) => (
              <div
                key={`${block.id}-col-${index}`}
                className="rounded-[20px] border border-(--card-border) bg-(--surface-elevated) p-4"
              >
                <InlineTextField
                  value={String(column.heading || "")}
                  onChange={(next) => {
                    const nextColumns = columns.map((item, colIndex) =>
                      colIndex === index ? { ...item, heading: next } : item,
                    );
                    set({ columns: nextColumns });
                  }}
                  className="text-left text-lg font-semibold"
                  style={{ color: headingColor, fontFamily }}
                  placeholder={`Column ${index + 1} heading`}
                />
                {column.imageUrl ? (
                  <img
                    src={column.imageUrl}
                    alt=""
                    className="mt-4 max-h-40 w-full rounded-[16px] object-cover"
                  />
                ) : null}
                <InlineTextareaField
                  value={String(column.content || "")}
                  onChange={(next) => {
                    const nextColumns = columns.map((item, colIndex) =>
                      colIndex === index ? { ...item, content: next } : item,
                    );
                    set({ columns: nextColumns });
                  }}
                  rows={4}
                  className="mt-4 text-left text-base leading-7"
                  style={{ color: textColor, fontFamily }}
                  placeholder="Column content"
                />
                {String(column.buttonText || "").trim() ? (
                  <button
                    type="button"
                    className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold"
                    style={{
                      backgroundColor: template.buttonPrimaryBackground,
                      color: template.buttonPrimaryText,
                      fontFamily,
                    }}
                  >
                    <InlineTextField
                      value={String(column.buttonText || "")}
                      onChange={(next) => {
                        const nextColumns = columns.map((item, colIndex) =>
                          colIndex === index ? { ...item, buttonText: next } : item,
                        );
                        set({ columns: nextColumns });
                      }}
                      className="text-center text-sm font-semibold"
                      style={{ color: template.buttonPrimaryText, fontFamily }}
                      placeholder="Button"
                    />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "button":
      return (
        <div
          className="flex"
          style={{
            justifyContent:
              align === "left"
                ? "flex-start"
                : align === "right"
                  ? "flex-end"
                  : "center",
          }}
        >
          <button
            type="button"
            className="rounded-xl px-6 py-3 text-base font-semibold"
            style={
              block.props.style === "outline"
                ? template.secondaryButtonStyle === "dark"
                  ? {
                      backgroundColor: headingColor,
                      border: `1px solid ${headingColor}`,
                      color: template.contentBackground,
                      fontFamily,
                    }
                  : {
                      backgroundColor: "transparent",
                      border: `2px solid ${linkColor}`,
                      color: linkColor,
                      fontFamily,
                    }
                : block.props.style === "text"
                  ? {
                      backgroundColor: "transparent",
                      color: linkColor,
                      fontFamily,
                    }
                  : {
                      backgroundColor: template.buttonPrimaryBackground,
                      color: template.buttonPrimaryText,
                      fontFamily,
                    }
            }
          >
            <InlineTextField
              value={String(block.props.text || "")}
              onChange={(next) => set({ text: next })}
              className="text-center text-base font-semibold"
              style={{
                color:
                  block.props.style === "primary"
                    ? template.buttonPrimaryText
                    : block.props.style === "text"
                      ? linkColor
                      : template.secondaryButtonStyle === "dark"
                        ? template.contentBackground
                        : linkColor,
                fontFamily,
              }}
              placeholder="Button text"
            />
          </button>
        </div>
      );
    case "content":
      return (
        <div
          className={`rounded-[20px] border px-5 py-4 ${
            isSelected ? "border-(--accent)" : "border-(--card-border)"
          }`}
          style={{ fontFamily, color: textColor }}
        >
          {block.props.imageUrl ? (
            <img
              src={String(block.props.imageUrl)}
              alt={String(block.props.imageAlt || "")}
              className="mb-4 max-h-64 w-full rounded-[16px] object-cover"
            />
          ) : null}
          <div
            className="campaign-block-preview"
            dangerouslySetInnerHTML={{
              __html:
                (block.props.html as string) ||
                "<p style=\"color:#94a3b8;\">Add custom HTML in the settings panel.</p>",
            }}
          />
        </div>
      );
    case "divider":
      return (
        <div className="px-4 py-6">
          <hr
            style={{
              border: "none",
              borderTop:
                block.props.style === "dotted"
                  ? `2px dotted ${template.dividerColor}`
                  : block.props.style === "spaced"
                    ? "none"
                    : `1px solid ${template.dividerColor}`,
              margin:
                align === "center"
                  ? "0 auto"
                  : align === "right"
                    ? "0 0 0 auto"
                    : "0",
              maxWidth: "100%",
            }}
          />
        </div>
      );
    case "spacer":
      return (
        <div
          className="rounded-[20px] border border-dashed border-(--card-border) bg-(--surface-elevated)"
          style={{ height: Math.max(24, Number(block.props.height) || 24) }}
        />
      );
    case "gallery": {
      const images = (block.props.images as GalleryImage[]) || [];
      const visibleImages = images.filter((image) => image.src);
      return (
        <div className="grid grid-cols-3 gap-3">
          {visibleImages.length > 0
            ? visibleImages.map((image, index) => (
                <div
                  key={`${block.id}-gallery-${index}`}
                  className="overflow-hidden rounded-[18px] border border-(--card-border) bg-(--surface-elevated)"
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))
            : Array.from({ length: 3 }, (_, index) => (
                <div
                  key={`${block.id}-gallery-placeholder-${index}`}
                  className="flex aspect-square items-center justify-center rounded-[18px] border border-dashed border-(--card-border) bg-(--surface-elevated) text-xs text-muted-dim"
                >
                  Image {index + 1}
                </div>
              ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function InlineTextField({
  value,
  onChange,
  className,
  style,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg bg-transparent px-2 py-1 outline-none transition-colors placeholder:text-muted-dim focus:bg-white/40 ${className ?? ""}`}
      style={style}
    />
  );
}

function InlineTextareaField({
  value,
  onChange,
  rows,
  className,
  style,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  rows: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`w-full resize-none rounded-lg bg-transparent px-2 py-1 outline-none transition-colors placeholder:text-muted-dim focus:bg-white/40 ${className ?? ""}`}
      style={style}
    />
  );
}

function TemplateSettingsPanel({
  template,
  onChange,
}: {
  template: CampaignTemplateSettings;
  onChange: (patch: Partial<CampaignTemplateSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-(--card-border) bg-(--surface) p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Layout</p>
          <p className="text-xs text-muted-dim">
            Applied to the full newsletter frame.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(CONTENT_WIDTH_PRESETS) as Array<
            [ContentWidthPreset, { label: string; width: number }]
          >).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ contentWidth: key })}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                template.contentWidth === key
                  ? "border-(--accent) bg-(--accent)/10 text-foreground"
                  : "border-(--card-border) text-muted-dim hover:bg-(--surface-hover)"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-(--card-border) bg-(--surface) p-4">
        <label className="field-label text-xs">Font</label>
        <select
          value={template.fontPreset}
          onChange={(e) => onChange({ fontPreset: e.target.value as FontPreset })}
          className="input-glass w-full text-sm"
        >
          {(Object.entries(FONT_PRESETS) as Array<
            [FontPreset, { label: string; family: string }]
          >).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-4 rounded-2xl border border-(--card-border) bg-(--surface) p-4">
        <ColorControl label="Body background" value={template.bodyBackground} onChange={(value) => onChange({ bodyBackground: value })} />
        <ColorControl label="Content background" value={template.contentBackground} onChange={(value) => onChange({ contentBackground: value })} />
        <ColorControl label="Heading color" value={template.headingColor} onChange={(value) => onChange({ headingColor: value })} />
        <ColorControl label="Text color" value={template.textColor} onChange={(value) => onChange({ textColor: value })} />
        <ColorControl label="Link color" value={template.linkColor} onChange={(value) => onChange({ linkColor: value })} />
        <ColorControl label="Divider color" value={template.dividerColor} onChange={(value) => onChange({ dividerColor: value })} />
      </section>

      <section className="space-y-4 rounded-2xl border border-(--card-border) bg-(--surface) p-4">
        <ColorControl label="Primary button" value={template.buttonPrimaryBackground} onChange={(value) => onChange({ buttonPrimaryBackground: value })} />
        <ColorControl label="Primary button text" value={template.buttonPrimaryText} onChange={(value) => onChange({ buttonPrimaryText: value })} />
        <div>
          <label className="field-label text-xs">Secondary button style</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["outline", "dark"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onChange({ secondaryButtonStyle: style })}
                className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition-colors ${
                  template.secondaryButtonStyle === style
                    ? "border-(--accent) bg-(--accent)/10 text-foreground"
                    : "border-(--card-border) text-muted-dim hover:bg-(--surface-hover)"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="field-label text-xs">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-12 rounded-lg border border-(--card-border) bg-(--surface)"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-glass w-full text-sm"
        />
      </div>
    </div>
  );
}

function CanvasFooterPreview({
  template,
}: {
  template: CampaignTemplateSettings;
}) {
  return (
    <div
      className="border-t px-8 py-8"
      style={{
        borderColor: template.dividerColor,
        backgroundColor: template.contentBackground,
        color: template.textColor,
        fontFamily: getTemplateFontFamily(template),
      }}
    >
      <div className="grid gap-8 text-sm md:grid-cols-2">
        <div>
          <p className="font-semibold" style={{ color: template.headingColor }}>
            Klarnow
          </p>
          <p className="mt-3 leading-7">
            Pendleton Way, Salford, Greater Manchester, M6 5FW
            <br />
            United Kingdom
          </p>
          <p className="mt-4 flex items-center gap-3">
            <span style={{ color: template.linkColor }}>X</span>
            <span style={{ color: template.linkColor }}>Instagram</span>
            <span style={{ color: template.linkColor }}>LinkedIn</span>
          </p>
        </div>
        <div className="md:text-right">
          <p className="leading-7">
            You received this email because you signed up on our website or made a purchase from us.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{
              backgroundColor: template.buttonPrimaryBackground,
              color: template.buttonPrimaryText,
            }}
          >
            Unsubscribe
          </button>
        </div>
      </div>
    </div>
  );
}

function AlignmentPicker({
  value,
  onChange,
}: {
  value: Align;
  onChange: (a: Align) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-(--card-border) bg-(--surface) p-0.5">
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === a
              ? "bg-(--accent) text-white"
              : "text-muted-dim hover:text-foreground hover:bg-(--surface-hover)"
          }`}
          title={
            a === "left"
              ? "Align left"
              : a === "center"
                ? "Align center"
                : "Align right"
          }
        >
          {a === "left" ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h10M4 18h16"
              />
            </svg>
          ) : a === "center" ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M7 12h10M4 18h16"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M10 12h10M4 18h16"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

function BlockFields({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (p: Record<string, unknown>) => void;
}) {
  const props = block.props;
  const set = (key: string, value: unknown) =>
    onUpdate({ ...block.props, [key]: value });
  const navLogoInputRef = useRef<HTMLInputElement>(null);
  const [navLogoUploading, setNavLogoUploading] = useState(false);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const [heroImageUploading, setHeroImageUploading] = useState(false);

  switch (block.type) {
    case "navigation": {
      const logoType = (props.logoType as "text" | "image") || "text";
      const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (
          !file ||
          !(file.type.startsWith("image/") || file.type === "image/svg+xml")
        )
          return;
        setNavLogoUploading(true);
        try {
          const { url } = await campaignsApi.uploadImage(file);
          set("logoUrl", url);
        } catch {
          // Error surfaced by api
        } finally {
          setNavLogoUploading(false);
        }
      };
      return (
        <>
          <div>
            <label className="field-label text-xs">Style</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {NAVIGATION_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("style", s.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${(props.style as string) === s.id ? "bg-(--accent) text-white" : "bg-(--surface) text-muted-dim hover:bg-(--surface-hover)"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label text-xs">Logo type</label>
            <div className="flex gap-2 mt-1">
              {(["text", "image"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("logoType", t)}
                  className={`px-3 py-1.5 rounded-md text-sm capitalize ${logoType === t ? "bg-(--accent) text-white" : "bg-(--surface) text-muted-dim hover:bg-(--surface-hover)"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-4">
            {logoType === "text" ? (
              <div className="flex-1 min-w-0">
                <label className="field-label text-xs">Logo / brand text</label>
                <input
                  type="text"
                  value={(props.logoText as string) || ""}
                  onChange={(e) => set("logoText", e.target.value)}
                  className="input-glass w-full text-sm mt-1"
                  placeholder="Your Brand"
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <label className="field-label text-xs">
                    Logo image URL or import
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="url"
                      value={(props.logoUrl as string) || ""}
                      onChange={(e) => set("logoUrl", e.target.value)}
                      className="input-glass flex-1 text-sm min-w-0"
                      placeholder="https://... or import below"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      className="sr-only"
                      ref={navLogoInputRef}
                      onChange={handleLogoFile}
                    />
                    <button
                      type="button"
                      onClick={() => navLogoInputRef.current?.click()}
                      disabled={navLogoUploading}
                      className="shrink-0 rounded-lg border border-(--card-border) bg-(--surface) px-3 py-1.5 text-sm text-foreground hover:bg-(--surface-hover) disabled:opacity-50"
                    >
                      {navLogoUploading ? "Uploading…" : "Import image"}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-dim mt-0.5">
                    PNG, JPEG, GIF, WebP, or SVG
                  </p>
                </div>
                <div>
                  <label className="field-label text-xs">
                    Alt text (for accessibility)
                  </label>
                  <input
                    type="text"
                    value={(props.logoText as string) || ""}
                    onChange={(e) => set("logoText", e.target.value)}
                    className="input-glass w-full text-sm mt-1"
                    placeholder="Brand name"
                  />
                </div>
              </div>
            )}
            <div className="shrink-0">
              <label className="field-label text-xs block mb-1.5">Align</label>
              <AlignmentPicker
                value={(props.align as Align) || "center"}
                onChange={(a) => set("align", a)}
              />
            </div>
          </div>
          <div>
            <label className="field-label text-xs">
              Links (one per line: Label | URL — URL can be blank)
            </label>
            <textarea
              value={((props.links as { text: string; url: string }[]) || [])
                .map((l) => `${l.text}|${l.url ?? ""}`)
                .join("\n")}
              onChange={(e) => {
                const links = e.target.value
                  .split("\n")
                  .map((line) => {
                    const parts = line.split("|").map((s) => s.trim());
                    const text = parts[0] ?? "";
                    const url = parts[1] ?? "";
                    return { text, url };
                  })
                  .filter((l) => (l.text || "").trim());
                set("links", links.length ? links : []);
              }}
              rows={3}
              className="input-glass w-full text-sm font-mono mt-1"
              placeholder="Home | https://..."
            />
            <p className="text-[10px] text-muted-dim mt-1">
              Links appear below the brand, separated by a dot. Leave URL blank
              for no link.
            </p>
          </div>
        </>
      );
    }
    case "hero": {
      const handleHeroImageFile = async (
        e: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (
          !file ||
          !(file.type.startsWith("image/") || file.type === "image/svg+xml")
        )
          return;
        setHeroImageUploading(true);
        try {
          const { url } = await campaignsApi.uploadImage(file);
          set("imageUrl", url);
        } catch {
          // Error surfaced by api
        } finally {
          setHeroImageUploading(false);
        }
      };
      return (
        <>
          <div>
            <label className="field-label text-xs">Style</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {HERO_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("style", s.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${(props.style as string) === s.id ? "bg-(--accent) text-white" : "bg-(--surface) text-muted-dim hover:bg-(--surface-hover)"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="field-label text-xs">Heading</label>
              <input
                type="text"
                value={(props.heading as string) || ""}
                onChange={(e) => set("heading", e.target.value)}
                className="input-glass w-full text-sm mt-1"
              />
            </div>
            <div className="shrink-0">
              <label className="field-label text-xs block mb-1.5">Align</label>
              <AlignmentPicker
                value={(props.align as Align) || "center"}
                onChange={(a) => set("align", a)}
              />
            </div>
          </div>
          <div>
            <label className="field-label text-xs">Subtext</label>
            <textarea
              value={(props.subtext as string) || ""}
              onChange={(e) => set("subtext", e.target.value)}
              rows={2}
              className="input-glass w-full text-sm mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label text-xs">Button text</label>
              <input
                type="text"
                value={(props.buttonText as string) || ""}
                onChange={(e) => set("buttonText", e.target.value)}
                className="input-glass w-full text-sm mt-1"
              />
            </div>
            <div>
              <label className="field-label text-xs">Button URL</label>
              <input
                type="text"
                value={(props.buttonUrl as string) || ""}
                onChange={(e) => set("buttonUrl", e.target.value)}
                className="input-glass w-full text-sm mt-1"
              />
            </div>
          </div>
          <div>
            <label className="field-label text-xs">
              Image (optional) — URL or import
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="url"
                value={(props.imageUrl as string) || ""}
                onChange={(e) => set("imageUrl", e.target.value)}
                className="input-glass flex-1 text-sm min-w-0"
                placeholder="https://... or import below"
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="sr-only"
                ref={heroImageInputRef}
                onChange={handleHeroImageFile}
              />
              <button
                type="button"
                onClick={() => heroImageInputRef.current?.click()}
                disabled={heroImageUploading}
                className="shrink-0 rounded-lg border border-(--card-border) bg-(--surface) px-3 py-1.5 text-sm text-foreground hover:bg-(--surface-hover) disabled:opacity-50"
              >
                {heroImageUploading ? "Uploading…" : "Import image"}
              </button>
            </div>
            <p className="text-[10px] text-muted-dim mt-0.5">
              PNG, JPEG, GIF, WebP, or SVG
            </p>
          </div>
        </>
      );
    }
    case "section":
      return (
        <SectionColumnFields
          heading={(props.heading as string) || ""}
          columnCount={Math.min(3, Math.max(1, Number(props.columnCount) || 1))}
          align={(props.align as Align) || "left"}
          onAlignChange={(a) => set("align", a)}
          columns={(
            (props.columns as {
              heading?: string;
              content: string;
              imageUrl?: string;
              buttonText?: string;
              buttonUrl?: string;
            }[]) || []
          ).slice(0, 3)}
          onHeadingChange={(v) => set("heading", v)}
          onColumnCountChange={(n) => {
            const cols =
              (props.columns as {
                heading?: string;
                content: string;
                imageUrl?: string;
                buttonText?: string;
                buttonUrl?: string;
              }[]) || [];
            const next = Array.from(
              { length: n },
              (_, i) =>
                cols[i] || {
                  heading: "",
                  content: "",
                  imageUrl: "",
                  buttonText: "",
                  buttonUrl: "",
                },
            );
            set("columnCount", n);
            set("columns", next);
          }}
          onColumnsChange={(cols) => set("columns", cols)}
        />
      );
    case "button":
      return (
        <>
          <div>
            <label className="field-label text-xs">Style</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {BUTTON_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("style", s.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${(props.style as string) === s.id ? "bg-(--accent) text-white" : "bg-(--surface) text-muted-dim hover:bg-(--surface-hover)"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="field-label text-xs">Button text</label>
              <input
                type="text"
                value={(props.text as string) || ""}
                onChange={(e) => set("text", e.target.value)}
                className="input-glass w-full text-sm mt-1"
              />
            </div>
            <div className="shrink-0">
              <label className="field-label text-xs block mb-1.5">Align</label>
              <AlignmentPicker
                value={(props.align as Align) || "center"}
                onChange={(a) => set("align", a)}
              />
            </div>
          </div>
          <div>
            <label className="field-label text-xs">URL</label>
            <input
              type="text"
              value={(props.url as string) || ""}
              onChange={(e) => set("url", e.target.value)}
              className="input-glass w-full text-sm mt-1"
            />
          </div>
        </>
      );
    case "content":
      return (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="field-label text-xs">HTML content</label>
              <textarea
                value={(props.html as string) || ""}
                onChange={(e) => set("html", e.target.value)}
                rows={5}
                className="input-glass w-full text-sm font-mono mt-1"
                placeholder="<p>Hello {{name}},</p>"
              />
            </div>
            <div className="shrink-0">
              <label className="field-label text-xs block mb-1.5">Align</label>
              <AlignmentPicker
                value={(props.align as Align) || "left"}
                onChange={(a) => set("align", a)}
              />
            </div>
          </div>
          <div>
            <label className="field-label text-xs">Image URL (optional)</label>
            <input
              type="url"
              value={(props.imageUrl as string) || ""}
              onChange={(e) => set("imageUrl", e.target.value)}
              className="input-glass w-full text-sm mt-1"
            />
          </div>
          <div>
            <label className="field-label text-xs">Image alt</label>
            <input
              type="text"
              value={(props.imageAlt as string) || ""}
              onChange={(e) => set("imageAlt", e.target.value)}
              className="input-glass w-full text-sm mt-1"
            />
          </div>
        </>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <div>
            <label className="field-label text-xs">Style</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DIVIDER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("style", s.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${(props.style as string) === s.id ? "bg-(--accent) text-white" : "bg-(--surface) text-muted-dim hover:bg-(--surface-hover)"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-dim">A horizontal line.</p>
            <div>
              <label className="field-label text-xs block mb-1.5">Align</label>
              <AlignmentPicker
                value={(props.align as Align) || "center"}
                onChange={(a) => set("align", a)}
              />
            </div>
          </div>
        </div>
      );
    case "spacer":
      return (
        <div>
          <label className="field-label text-xs">Height (px)</label>
          <input
            type="number"
            min={8}
            max={120}
            value={Number(props.height) ?? 24}
            onChange={(e) => set("height", Number(e.target.value) || 24)}
            className="input-glass w-24 text-sm"
          />
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="field-label text-xs mb-0">Gallery images</p>
            <div>
              <label className="field-label text-xs block mb-1.5">Align</label>
              <AlignmentPicker
                value={(props.align as Align) || "center"}
                onChange={(a) => set("align", a)}
              />
            </div>
          </div>
          <GalleryImageFields
            images={(
              (props.images as { src: string; alt: string; url: string }[]) ||
              []
            ).slice(0, 6)}
            onImagesChange={(imgs) => set("images", imgs)}
          />
        </div>
      );
    default:
      return null;
  }
}

type SectionColumn = {
  heading?: string;
  content: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
};

function SectionColumnFields({
  heading,
  columnCount,
  align,
  onAlignChange,
  columns,
  onHeadingChange,
  onColumnCountChange,
  onColumnsChange,
}: {
  heading: string;
  columnCount: number;
  align: Align;
  onAlignChange: (a: Align) => void;
  columns: SectionColumn[];
  onHeadingChange: (v: string) => void;
  onColumnCountChange: (n: number) => void;
  onColumnsChange: (c: SectionColumn[]) => void;
}) {
  const list = Array.from(
    { length: columnCount },
    (_, i) =>
      columns[i] || {
        heading: "",
        content: "",
        imageUrl: "",
        buttonText: "",
        buttonUrl: "",
      },
  );

  const update = (index: number, patch: Partial<SectionColumn>) => {
    const next = list.map((col, i) =>
      i === index ? { ...col, ...patch } : col,
    );
    onColumnsChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="field-label text-xs">
            Section heading (optional)
          </label>
          <input
            type="text"
            value={heading}
            onChange={(e) => onHeadingChange(e.target.value)}
            className="input-glass w-full text-sm mt-1"
            placeholder="Section title"
          />
        </div>
        <div className="shrink-0">
          <label className="field-label text-xs block mb-1.5">Align</label>
          <AlignmentPicker value={align} onChange={onAlignChange} />
        </div>
      </div>
      <div>
        <label className="field-label text-xs">Columns</label>
        <div className="inline-flex gap-2 p-1 rounded-lg border border-(--card-border) bg-(--surface)">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onColumnCountChange(n)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${columnCount === n ? "bg-(--accent) text-white" : "text-muted-dim hover:text-foreground hover:bg-(--surface-hover)"}`}
            >
              {n} col{n > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border-2 border-(--card-border) overflow-hidden">
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {list.map((col, index) => (
            <div
              key={index}
              className="border-r last:border-r-0 border-(--card-border) bg-(--surface-elevated) p-4 min-h-[120px]"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--accent) mb-2">
                Column {index + 1}
              </div>
              <input
                type="text"
                value={col.heading || ""}
                onChange={(e) => update(index, { heading: e.target.value })}
                className="input-glass w-full text-sm mb-2"
                placeholder="Column heading"
              />
              <textarea
                value={col.content || ""}
                onChange={(e) => update(index, { content: e.target.value })}
                rows={3}
                className="input-glass w-full text-sm resize-y mb-2"
                placeholder="Content..."
              />
              <input
                type="url"
                value={col.imageUrl || ""}
                onChange={(e) => update(index, { imageUrl: e.target.value })}
                className="input-glass w-full text-xs mb-2"
                placeholder="Image URL"
              />
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  value={col.buttonText || ""}
                  onChange={(e) =>
                    update(index, { buttonText: e.target.value })
                  }
                  className="input-glass text-xs"
                  placeholder="Button"
                />
                <input
                  type="text"
                  value={col.buttonUrl || ""}
                  onChange={(e) => update(index, { buttonUrl: e.target.value })}
                  className="input-glass text-xs"
                  placeholder="Button URL"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type GalleryImage = { src: string; alt: string; url: string };

function GalleryImageFields({
  images,
  onImagesChange,
}: {
  images: GalleryImage[];
  onImagesChange: (imgs: GalleryImage[]) => void;
}) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const ensureLength = (imgs: GalleryImage[], minLen: number) => {
    const next = [...imgs];
    while (next.length < minLen)
      next.push({ src: "", alt: `Image ${next.length + 1}`, url: "#" });
    return next.slice(0, 6);
  };

  const list = ensureLength(images, 3);

  const update = (index: number, patch: Partial<GalleryImage>) => {
    const next = list.map((img, i) =>
      i === index ? { ...img, ...patch } : img,
    );
    onImagesChange(next);
  };

  const handleFile = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (
      !file ||
      !(file.type.startsWith("image/") || file.type === "image/svg+xml")
    )
      return;
    setUploadingIndex(index);
    try {
      const { url } = await campaignsApi.uploadImage(file);
      update(index, { src: url });
    } catch {
      // Error already thrown by api; could set local error state
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="field-label text-xs">
        Images — enter a URL or import a file (max 6)
      </p>
      {list.map((img, index) => (
        <div
          key={index}
          className="rounded-lg border border-(--card-border) bg-(--surface-elevated) p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={img.src}
              onChange={(e) => update(index, { src: e.target.value })}
              className="input-glass flex-1 text-sm"
              placeholder="Image URL"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="sr-only"
              ref={(el) => {
                fileInputRefs.current[index] = el;
              }}
              onChange={(e) => handleFile(index, e)}
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[index]?.click()}
              disabled={uploadingIndex === index}
              className="shrink-0 rounded-lg border border-(--card-border) bg-(--surface) px-3 py-1.5 text-sm text-foreground hover:bg-(--surface-hover) disabled:opacity-50"
            >
              {uploadingIndex === index ? "Uploading…" : "Import image"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={img.alt}
              onChange={(e) => update(index, { alt: e.target.value })}
              className="input-glass text-sm"
              placeholder="Alt text"
            />
            <input
              type="text"
              value={img.url}
              onChange={(e) => update(index, { url: e.target.value })}
              className="input-glass text-sm"
              placeholder="Link URL"
            />
          </div>
          {img.src ? (
            <div className="mt-2 rounded overflow-hidden border border-(--card-border) inline-block max-w-[120px]">
              <img
                src={img.src}
                alt={img.alt}
                className="max-w-full h-auto max-h-20 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : null}
        </div>
      ))}
      {list.length < 6 && (
        <button
          type="button"
          onClick={() => onImagesChange(ensureLength(list, list.length + 1))}
          className="text-sm text-(--accent) hover:underline"
        >
          + Add another image
        </button>
      )}
    </div>
  );
}

function parseHtmlToBlocks(html: string): Block[] {
  const trimmed = (html || "").trim();
  if (!trimmed || trimmed === "<p></p>") return [];
  const imageMatch = trimmed.match(
    /^<p[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>\s*<\/p>\s*/i,
  );
  const blocks: Block[] = [];
  let remainingHtml = trimmed;
  if (imageMatch) {
    remainingHtml = trimmed.slice(imageMatch[0].length).trim();
    blocks.push(
      createContentBlockFromHtml("", {
        imageUrl: imageMatch[1],
        imageAlt: "Image",
        align: "center" as Align,
      }),
    );
  }
  if (remainingHtml) {
    blocks.push(createContentBlockFromHtml(remainingHtml));
  }
  return blocks;
}
