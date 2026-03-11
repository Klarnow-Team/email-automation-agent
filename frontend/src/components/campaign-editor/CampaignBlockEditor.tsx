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

const BLOCK_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  navigation: {
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
  divider: { align: "center" as Align },
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

const BASE_CELL_STYLE =
  "padding: 16px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.5; color: #1f2937;";

function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  const containerStyle = 'style="max-width: 600px; margin: 0 auto;"';

  for (const b of blocks) {
    switch (b.type) {
      case "navigation": {
        const logoType = (b.props.logoType as "text" | "image") || "text";
        const logoText = (b.props.logoText as string) || "Brand";
        const logoUrl = (b.props.logoUrl as string) || "";
        const links = (b.props.links as { text: string; url: string }[]) || [];
        const align = (b.props.align as Align) || "center";
        const linkItems = links
          .filter((l) => (l.text || "").trim())
          .map((l) => {
            const label = escapeHtml((l.text || "").trim());
            const url = (l.url || "").trim();
            if (url) {
              return `<a href="${escapeHtml(url)}" style="color: #6366f1; text-decoration: none; font-size: 14px;">${label}</a>`;
            }
            return `<span style="font-size: 14px; color: #6b7280;">${label}</span>`;
          })
          .join(" &nbsp;·&nbsp; ");
        const isSvg = /\.svg(\?|$)/i.test(logoUrl);
        const logoImgStyle = isSvg
          ? "max-width: 180px; width: 180px; height: auto; display: block; border: 0;"
          : "max-width: 180px; height: auto; display: block; border: 0;";
        const logoHtml =
          logoType === "image" && logoUrl
            ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(logoText || "Logo")}" style="${logoImgStyle}" ${isSvg ? 'width="180"' : ""} />`
            : `<strong style="font-size: 18px; letter-spacing: -0.02em;">${escapeHtml(logoText || "Brand")}</strong>`;
        const hasLinks = linkItems.length > 0;
        const tdStyle = `style="${BASE_CELL_STYLE} text-align: ${align}; padding: 20px 24px;"`;
        parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              <div style="margin-bottom: ${hasLinks ? "12px" : "0"};">${logoHtml}</div>
              ${hasLinks ? `<div style="font-size: 14px; line-height: 1.6;">${linkItems}</div>` : ""}
            </td></tr>
          </table>`);
        break;
      }
      case "hero": {
        const heading = (b.props.heading as string) || "";
        const subtext = (b.props.subtext as string) || "";
        const btnText = (b.props.buttonText as string) || "";
        const btnUrl = (b.props.buttonUrl as string) || "#";
        const imgUrl = (b.props.imageUrl as string) || "";
        const align = (b.props.align as Align) || "center";
        const tdStyle = `style="${BASE_CELL_STYLE} text-align: ${align}; padding: 32px 24px;"`;
        parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />` : ""}
              <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 700;">${escapeHtml(heading)}</h1>
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 16px;">${escapeHtml(subtext)}</p>
              ${btnText ? `<a href="${escapeHtml(btnUrl)}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">${escapeHtml(btnText)}</a>` : ""}
            </td></tr>
          </table>`);
        break;
      }
      case "section": {
        const columnCount = Math.min(
          3,
          Math.max(1, Number(b.props.columnCount) || 1),
        );
        const heading = (b.props.heading as string) || "";
        const align = (b.props.align as Align) || "left";
        const columns =
          (b.props.columns as {
            heading?: string;
            content: string;
            imageUrl?: string;
            buttonText?: string;
            buttonUrl?: string;
          }[]) || [];
        const widthPct = Math.floor(100 / columnCount);
        const cellStyleCol = `style="${BASE_CELL_STYLE} padding: 16px 12px; vertical-align: top; width: ${widthPct}%; text-align: ${align};"`;
        const cells = Array.from({ length: columnCount }, (_, i) => {
          const col = columns[i] || {
            heading: "",
            content: "",
            imageUrl: "",
            buttonText: "",
            buttonUrl: "",
          };
          const contentHtml = (col.content || "").replace(/\n/g, "</p><p>");
          const img = (col.imageUrl as string)?.trim();
          const btn = (col.buttonText as string)?.trim();
          const btnUrl = (col.buttonUrl as string) || "#";
          return `<td ${cellStyleCol}>
            ${(col.heading as string) ? `<h3 style="margin: 0 0 8px; font-size: 18px;">${escapeHtml(String(col.heading))}</h3>` : ""}
            ${img ? `<img src="${escapeHtml(img)}" alt="" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 12px;" />` : ""}
            <p style="margin: 0 0 12px;">${escapeHtml(contentHtml)}</p>
            ${btn ? `<a href="${escapeHtml(btnUrl)}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">${escapeHtml(btn)}</a>` : ""}
          </td>`;
        }).join("");
        const headingTdStyle = `style="${BASE_CELL_STYLE} text-align: ${align};"`;
        const headingAlign = `style="margin: 0 0 16px; font-size: 22px; text-align: ${align};"`;
        parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            ${heading ? `<tr><td ${headingTdStyle} colspan="${columnCount}"><h2 ${headingAlign}>${escapeHtml(heading)}</h2></td></tr>` : ""}
            <tr>${cells}</tr>
          </table>`);
        break;
      }
      case "button": {
        const text = (b.props.text as string) || "Button";
        const url = (b.props.url as string) || "#";
        const align = (b.props.align as Align) || "center";
        const tdStyle = `style="${BASE_CELL_STYLE} text-align: ${align};"`;
        parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              <a href="${escapeHtml(url)}" style="display: inline-block; padding: 12px 28px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">${escapeHtml(text)}</a>
            </td></tr>
          </table>`);
        break;
      }
      case "content": {
        const html = (b.props.html as string) || "";
        const imageUrl = (b.props.imageUrl as string) || "";
        const imageAlt = (b.props.imageAlt as string) || "Image";
        const align = (b.props.align as Align) || "left";
        const tdStyle = `style="${BASE_CELL_STYLE} text-align: ${align};"`;
        parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}>
              ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />` : ""}
              <div>${html}</div>
            </td></tr>
          </table>`);
        break;
      }
      case "divider": {
        const align = (b.props.align as Align) || "center";
        const alignStyle =
          align === "center"
            ? "margin: 0 auto"
            : align === "right"
              ? "margin: 0 0 0 auto"
              : "margin: 0";
        const tdStyle = `style="${BASE_CELL_STYLE} text-align: ${align};"`;
        parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr><td ${tdStyle}><hr style="border: none; border-top: 1px solid #e5e7eb; ${alignStyle}; max-width: 100%;" /></td></tr>
          </table>`);
        break;
      }
      case "spacer": {
        const h = Math.max(0, Number(b.props.height) ?? 24);
        parts.push(`<div style="height: ${h}px;"></div>`);
        break;
      }
      case "gallery": {
        const images =
          (b.props.images as { src: string; alt: string; url: string }[]) || [];
        const align = (b.props.align as Align) || "center";
        const cols = 3;
        const width = Math.floor(100 / cols);
        const galleryTdStyle = `style="${BASE_CELL_STYLE} text-align: ${align}; width: ${width}%; vertical-align: top;"`;
        const cells = images
          .filter((i) => i.src)
          .map(
            (i) =>
              `<td ${galleryTdStyle}><a href="${escapeHtml(i.url || "#")}"><img src="${escapeHtml(i.src)}" alt="${escapeHtml(i.alt || "")}" style="max-width: 100%; height: auto; border-radius: 8px;" /></a></td>`,
          )
          .join("");
        if (cells)
          parts.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${containerStyle}>
            <tr>${cells}</tr>
          </table>`);
        break;
      }
    }
  }

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
function buildPreviewWrapper(innerBody: string, topImageUrl: string): string {
  const trimmed = (topImageUrl || "").trim();
  const body = trimmed
    ? `<p><img src="${trimmed.replace(/"/g, "&quot;")}" alt="Image" style="max-width:100%; height:auto;" /></p>\n${innerBody}`
    : innerBody;
  const withPlaceholders = body
    .replace(/\{\{name\}\}/g, "John")
    .replace(/\{\{email\}\}/g, "john@example.com")
    .replace(/\{\{id\}\}/g, "123")
    .replace(/\{\{unsubscribe_url\}\}/g, "#");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>a{color:#6d5ee8;text-decoration:none;}a:hover{text-decoration:underline;}p{margin:0 0 1em;}p:last-child{margin-bottom:0;}h1,h2,h3{color:#141216;margin:0 0 0.5em;font-weight:600;}</style>
</head>
<body style="margin:0;padding:0;background:linear-gradient(180deg,#f0eef4 0%,#f4f3f6 100%);font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;color:#141216;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:transparent;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04);background-color:#ffffff;border:1px solid #e8e6ec;">
          <tr>
            <td style="padding:24px 32px 32px;">
              <div style="color:#141216;">
${withPlaceholders}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 36px;border-top:1px solid #e8e6ec;background-color:#faf9fc;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:50%;vertical-align:top;text-align:left;padding-right:24px;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#141216;">Klarnow</p>
                    <p style="margin:0 0 4px;font-size:13px;color:#6b6775;line-height:1.5;">Pendleton Way, Salford, Greater Manchester, M6 5FW</p>
                    <p style="margin:0 0 12px;font-size:13px;color:#6b6775;line-height:1.5;">United Kingdom</p>
                    <p style="margin:0;font-size:13px;color:#6b6775;"><a href="https://x.com/klarnow" style="color:#6d5ee8;text-decoration:none;">X</a> &nbsp; <a href="https://www.instagram.com/klarnow/" style="color:#6d5ee8;text-decoration:none;">Instagram</a> &nbsp; <a href="https://www.linkedin.com/company/klarnow/" style="color:#6d5ee8;text-decoration:none;">LinkedIn</a></p>
                  </td>
                  <td style="width:50%;vertical-align:top;text-align:right;">
                    <p style="margin:0 0 12px;font-size:13px;color:#6b6775;">You received this email because you signed up on our website or made a purchase from us.</p>
                    <p style="margin:0;"><a href="#" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;color:#fff;background-color:#6d5ee8;border-radius:8px;text-decoration:none;">Unsubscribe</a></p>
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
  onChange: (html: string) => void;
  className?: string;
  /** When set, shows live preview panel with this image as the optional top image. */
  previewImageUrl?: string;
};

export function CampaignBlockEditor({
  value,
  onChange,
  className = "",
  previewImageUrl = "",
}: CampaignBlockEditorProps) {
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewportId>("laptop");
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (value && value.trim() && value !== "<p></p>") {
      try {
        const parsed = parseHtmlToBlocks(value);
        if (parsed.length > 0) return parsed;
      } catch {
        /* ignore */
      }
    }
    return [];
  });

  const currentHtml = React.useMemo(() => blocksToHtml(blocks), [blocks]);
  const previewSrcDoc = React.useMemo(
    () =>
      buildPreviewWrapper(
        currentHtml.trim() || "<p><em>Add blocks to see preview.</em></p>",
        previewImageUrl,
      ),
    [currentHtml, previewImageUrl],
  );

  const addBlock = (type: BlockType) => {
    const next = [
      ...blocks,
      { id: genId(), type, props: { ...BLOCK_DEFAULTS[type] } },
    ];
    setBlocks(next);
    onChange(blocksToHtml(next));
  };

  const updateBlock = (id: string, props: Record<string, unknown>) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, props } : b));
    setBlocks(next);
    onChange(blocksToHtml(next));
  };

  const removeBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    onChange(blocksToHtml(next));
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
    onChange(blocksToHtml(next));
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;
    const next = [...blocks];
    const [removed] = next.splice(dragIndex, 1);
    const insertAt = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
    next.splice(insertAt, 0, removed);
    setBlocks(next);
    onChange(blocksToHtml(next));
  };

  return (
    <div
      className={`campaign-editor-root grid gap-4 ${previewImageUrl !== undefined ? "lg:grid-cols-[1fr,minmax(320px,1fr)]" : ""} ${className}`}
    >
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex gap-4">
          <aside className="w-52 shrink-0 rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-3 px-1">
              Blocks
            </p>
            <div className="space-y-1.5">
              {(Object.keys(BLOCK_DEFAULTS) as BlockType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex items-center gap-2.5 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:border-[var(--accent)]/30 transition-colors"
                >
                  <span className="text-[var(--muted-dim)]">
                    {BLOCK_ICONS[type]}
                  </span>
                  {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted-dim)] mt-3 px-1">
              Drag blocks to reorder.
            </p>
          </aside>
          <div className="min-h-[320px] flex-1 rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card-bg-subtle)] p-5">
            {blocks.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center text-center text-sm text-[var(--muted-dim)]">
                <div className="rounded-full bg-[var(--surface-elevated)] p-4 mb-3 text-[var(--muted)]">
                  <svg
                    className="h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-[var(--muted)]">
                  No blocks yet
                </p>
                <p className="mt-1 max-w-[240px]">
                  Add a block from the palette. Drag to reorder, then edit each
                  block.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {blocks.map((block, index) => (
                  <li
                    key={block.id}
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] overflow-hidden shadow-sm transition-shadow hover:shadow-md"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(e, index);
                    }}
                  >
                    <BlockRow
                      block={block}
                      index={index}
                      total={blocks.length}
                      onUpdate={(props) => updateBlock(block.id, props)}
                      onRemove={() => removeBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, "up")}
                      onMoveDown={() => moveBlock(block.id, "down")}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(index))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {previewImageUrl !== undefined && (
        <div className="lg:sticky lg:top-4 flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] overflow-hidden shadow-lg h-fit max-h-[calc(100vh-8rem)]">
          <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Live preview
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted-dim)] hidden sm:inline">
                Updates as you build
              </span>
            </div>
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--card-bg-subtle)] border border-[var(--card-border)]"
              role="group"
              aria-label="Preview size"
            >
              {PREVIEW_VIEWPORTS.map((v) => {
                const active = previewViewport === v.id;
                const w = v.width ?? "100%";
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setPreviewViewport(v.id)}
                    title={`${v.label}${v.width ? ` (${v.width}px)` : ""}`}
                    className={`p-2 rounded-md transition-colors ${active ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted-dim)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"}`}
                  >
                    {v.icon === "phone" && (
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
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {v.icon === "tablet" && (
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
                          d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {v.icon === "laptop" && (
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
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {v.icon === "desktop" && (
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
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 17v4"
                        />
                      </svg>
                    )}
                    {v.icon === "full" && (
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
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 min-h-[400px] bg-[var(--card-bg-subtle)] overflow-auto p-4 flex justify-center">
            <div
              className="rounded-lg border border-[var(--card-border)] bg-[var(--surface)] shadow-inner overflow-hidden transition-all duration-200"
              style={{
                width:
                  previewViewport === "full"
                    ? "100%"
                    : (PREVIEW_VIEWPORTS.find((p) => p.id === previewViewport)
                        ?.width ?? 1024),
                maxWidth: "100%",
              }}
            >
              <iframe
                title="Live email preview"
                srcDoc={previewSrcDoc}
                className="border-0 block w-full bg-white"
                style={{ minHeight: "520px", height: "520px" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type BlockRowProps = {
  block: Block;
  index: number;
  total: number;
  onUpdate: (props: Record<string, unknown>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
};

function BlockRow({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
}: BlockRowProps) {
  const [expanded, setExpanded] = useState(false);
  const props = block.props;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[var(--card-border)] bg-[var(--surface-elevated)] px-3 py-2">
        <span
          draggable
          onDragStart={onDragStart}
          className="cursor-grab touch-none text-[var(--muted-dim)] hover:text-[var(--muted)]"
          aria-label="Drag to reorder"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </span>
        <span className="text-sm font-medium text-[var(--foreground)]">
          {block.type === "section"
            ? `${BLOCK_LABELS[block.type]} · ${Math.min(3, Math.max(1, Number(block.props.columnCount) || 1))} col${Number(block.props.columnCount) === 2 || Number(block.props.columnCount) === 3 ? "s" : ""}`
            : BLOCK_LABELS[block.type]}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 text-[var(--muted-dim)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-1 text-[var(--muted-dim)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded px-2 py-1 text-xs text-[var(--accent)] hover:underline"
          >
            {expanded ? "Collapse" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-[var(--danger)] hover:bg-[var(--danger-muted)]"
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      </div>
      {expanded && (
        <div className="p-4 space-y-3">
          <BlockFields block={block} onUpdate={onUpdate} />
        </div>
      )}
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
    <div className="inline-flex rounded-lg border border-[var(--card-border)] bg-[var(--surface)] p-0.5">
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === a
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted-dim)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
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
            <label className="field-label text-xs">Logo type</label>
            <div className="flex gap-2 mt-1">
              {(["text", "image"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("logoType", t)}
                  className={`px-3 py-1.5 rounded-md text-sm capitalize ${logoType === t ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted-dim)] hover:bg-[var(--surface-hover)]"}`}
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
                      className="shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                      {navLogoUploading ? "Uploading…" : "Import image"}
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--muted-dim)] mt-0.5">
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
            <p className="text-[10px] text-[var(--muted-dim)] mt-1">
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
                className="shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                {heroImageUploading ? "Uploading…" : "Import image"}
              </button>
            </div>
            <p className="text-[10px] text-[var(--muted-dim)] mt-0.5">
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
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--muted-dim)]">A horizontal line.</p>
          <div>
            <label className="field-label text-xs block mb-1.5">Align</label>
            <AlignmentPicker
              value={(props.align as Align) || "center"}
              onChange={(a) => set("align", a)}
            />
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
        <div className="inline-flex gap-2 p-1 rounded-lg border border-[var(--card-border)] bg-[var(--surface)]">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onColumnCountChange(n)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${columnCount === n ? "bg-[var(--accent)] text-white" : "text-[var(--muted-dim)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"}`}
            >
              {n} col{n > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden">
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {list.map((col, index) => (
            <div
              key={index}
              className="border-r last:border-r-0 border-[var(--card-border)] bg-[var(--surface-elevated)] p-4 min-h-[120px]"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">
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
          className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-elevated)] p-3 space-y-2"
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
              className="shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
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
            <div className="mt-2 rounded overflow-hidden border border-[var(--card-border)] inline-block max-w-[120px]">
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
          className="text-sm text-[var(--accent)] hover:underline"
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
  // When loading saved campaign HTML we may not have block markers; treat whole body as one content block
  // so the email body is visible and editable when reopening a draft.
  return [
    {
      id: genId(),
      type: "content",
      props: {
        html: trimmed,
        imageUrl: "",
        imageAlt: "Image",
        align: "left" as Align,
      },
    },
  ];
}
