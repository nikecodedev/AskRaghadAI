import { jsPDF } from "jspdf";
import type { Locale } from "@/lib/i18n/types";
import { prepareChatDisplayText } from "@/lib/text/normalize";

export type PdfChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PdfChatLabels = {
  title: string;
  user: string;
  assistant: string;
};

/** Arabic-capable stack. Avoid CSS variables — html2canvas often misses them. */
const PDF_FONT =
  '"Noto Sans Arabic","Segoe UI",Tahoma,"Arabic Typesetting",Arial,sans-serif';

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/** Strip bidi marks that can confuse canvas rasterizers on short RTL strings. */
function stripBidiMarks(text: string): string {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

function buildFilename(locale: Locale): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  return locale === "ar"
    ? `raghad-ai-chat-ar_${stamp}.pdf`
    : `raghad-ai-chat_${stamp}.pdf`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convert a single logical line to safe HTML.
 * Keeps **bold**; everything else is escaped.
 */
function renderInline(line: string): string {
  const escaped = escapeHtml(line);
  return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** Build the styled HTML block for one message using inline styles only. */
function renderMessage(
  msg: PdfChatMessage,
  labels: PdfChatLabels,
  locale: Locale,
): string {
  const isUser = msg.role === "user";
  const label = stripBidiMarks(isUser ? labels.user : labels.assistant);
  const bg = isUser ? "#e9f1ec" : "#ffffff";
  const border = isUser ? "#cfe0d6" : "#e6ddc9";
  const labelColor = isUser ? "#1f5240" : "#8a7550";

  const clean = stripBidiMarks(prepareChatDisplayText(msg.content, locale));
  const isRtl = containsArabic(clean) || containsArabic(label);
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";

  const lines = clean.split("\n");
  const bodyHtml = lines
    .map((raw) => {
      const line = raw.replace(/^\s*[-*]\s+/, "\u2022 ");
      if (line.trim() === "") return '<div style="height:8px"></div>';
      const isHeading = /\*\*/.test(raw) && raw.trim().startsWith("**");
      const weight = isHeading ? "font-weight:700;" : "font-weight:500;";
      return `<div dir="${dir}" lang="${isRtl ? "ar" : "en"}" style="margin:0 0 4px 0;letter-spacing:0;word-spacing:normal;white-space:pre-wrap;${weight};direction:${dir};text-align:${align};font-family:${PDF_FONT};">${renderInline(line)}</div>`;
    })
    .join("");

  return `
    <div dir="${dir}" lang="${isRtl ? "ar" : "en"}" style="direction:${dir};text-align:${align};background:${bg};border:1px solid ${border};border-radius:14px;padding:16px 20px;margin:0 0 16px 0;box-shadow:0 1px 2px rgba(0,0,0,0.04);font-family:${PDF_FONT};letter-spacing:0;">
      <div dir="${dir}" style="direction:${dir};text-align:${align};font-size:13px;font-weight:700;letter-spacing:0;word-spacing:normal;color:${labelColor};margin:0 0 8px 0;font-family:${PDF_FONT};">${escapeHtml(label)}</div>
      <div dir="${dir}" style="direction:${dir};text-align:${align};font-size:16px;line-height:1.95;letter-spacing:0;word-spacing:normal;color:#24332c;font-weight:500;font-family:${PDF_FONT};">${bodyHtml}</div>
    </div>`;
}

/**
 * Build an off-screen container that mirrors the on-screen chat.
 *
 * Why HTML → canvas instead of jsPDF text:
 * jsPDF cannot shape Arabic (isolated/reversed letters). Rendering real HTML
 * lets the browser shape Arabic, then we rasterize into the PDF.
 */
function buildExportNode(options: {
  history: PdfChatMessage[];
  locale: Locale;
  labels: PdfChatLabels;
  dir: "rtl" | "ltr";
}): HTMLElement {
  const { history, locale, labels, dir } = options;
  const container = document.createElement("div");
  container.setAttribute("dir", dir);
  container.setAttribute("lang", dir === "rtl" ? "ar" : "en");
  container.style.cssText = [
    "position:fixed",
    "top:0",
    "left:-10000px",
    "width:794px",
    "box-sizing:border-box",
    "padding:44px 40px",
    "background:#faf6ef",
    "color:#24332c",
    `font-family:${PDF_FONT}`,
    "font-size:16px",
    "line-height:1.9",
    "letter-spacing:0",
    "word-spacing:normal",
    `direction:${dir}`,
    `text-align:${dir === "rtl" ? "right" : "left"}`,
  ].join(";");

  const dateStr = new Date().toLocaleDateString(
    locale === "ar" ? "ar" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" },
  );

  const header = `
    <div style="text-align:center;margin:0 0 24px 0;padding:0 0 16px 0;border-bottom:2px solid #d8c9a6;font-family:${PDF_FONT};letter-spacing:0;">
      <div dir="auto" style="font-size:26px;font-weight:700;color:#2c3e35;letter-spacing:0;font-family:${PDF_FONT};">${escapeHtml(stripBidiMarks(labels.title))}</div>
      <div style="font-size:13px;color:#8a7550;margin-top:6px;letter-spacing:0;">Askraghadai.com &middot; ${escapeHtml(dateStr)}</div>
    </div>`;

  const body = history.map((m) => renderMessage(m, labels, locale)).join("");

  container.innerHTML = header + body;
  return container;
}

/**
 * Fallback: plain jsPDF text export (used only if canvas capture fails).
 * Never ideal for Arabic — prefer the canvas path.
 */
function exportPlainText(options: {
  history: PdfChatMessage[];
  locale: Locale;
  labels: PdfChatLabels;
}): void {
  const { history, locale, labels } = options;
  const useRtl =
    locale === "ar" || history.some((m) => containsArabic(m.content));
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageW - margin * 2;
  const x = useRtl ? pageW - margin : margin;
  let y = margin + 4;

  doc.setFontSize(16);
  doc.text(labels.title, x, y, { align: useRtl ? "right" : "left" });
  y += 12;

  for (const msg of history) {
    const prefix = msg.role === "user" ? `${labels.user}: ` : `${labels.assistant}: `;
    const text = `${prefix}${prepareChatDisplayText(msg.content, locale)}`;
    const lines: string[] = doc.splitTextToSize(text, maxWidth);
    doc.setFontSize(11);
    for (const line of lines) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin + 4;
      }
      doc.text(line, x, y, { align: useRtl ? "right" : "left" });
      y += 6;
    }
    y += 4;
  }
  doc.save(buildFilename(locale));
}

function forceArabicFonts(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    el.style.fontFamily = PDF_FONT;
    el.style.letterSpacing = "0";
    el.style.wordSpacing = "normal";
  });
}

/**
 * Export chat history to a readable, correctly-shaped Arabic/English PDF.
 */
export async function exportChatToPdf(options: {
  history: PdfChatMessage[];
  locale: Locale;
  labels: PdfChatLabels;
}): Promise<void> {
  const { history, locale, labels } = options;
  const hasArabic =
    locale === "ar" ||
    containsArabic(labels.title) ||
    containsArabic(labels.user) ||
    containsArabic(labels.assistant) ||
    history.some((m) => containsArabic(m.content));
  const dir: "rtl" | "ltr" = hasArabic ? "rtl" : "ltr";
  const filename = buildFilename(locale);

  const node = buildExportNode({ history, locale, labels, dir });
  document.body.appendChild(node);

  try {
    // Warm the Arabic font with the exact user/assistant strings shown in PDF.
    if (document.fonts?.load) {
      const samples = [
        labels.title,
        labels.user,
        labels.assistant,
        ...history.map((m) => m.content).filter(Boolean),
        "هدية لطفل",
        "المستخدم",
      ];
      await Promise.all(
        samples.flatMap((sample) => [
          document.fonts.load(`700 26px ${PDF_FONT}`, sample),
          document.fonts.load(`500 16px ${PDF_FONT}`, sample),
          document.fonts.load(`700 13px ${PDF_FONT}`, sample),
        ]),
      );
    }
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // Give layout a beat so shaping settles before rasterize (esp. Android).
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 180)));

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#faf6ef",
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      onclone: (_doc, cloned) => {
        forceArabicFonts(cloned as HTMLElement);
      },
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    try {
      doc.setDisplayMode("fullwidth", "continuous", "FullScreen");
    } catch {
      /* older builds */
    }
    doc.setProperties({
      title: labels.title,
      subject: "Raghad AI chat export",
      creator: "Raghad AI",
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    const usablePage = pageH - margin * 2;
    let heightLeft = imgH;
    let position = margin;

    doc.addImage(imgData, "PNG", margin, position, imgW, imgH, undefined, "FAST");
    heightLeft -= usablePage;

    while (heightLeft > 0) {
      position = margin - (imgH - heightLeft);
      doc.addPage();
      doc.addImage(imgData, "PNG", margin, position, imgW, imgH, undefined, "FAST");
      heightLeft -= usablePage;
    }

    doc.save(filename);
  } catch (error) {
    console.error("[pdf] canvas export failed, using text fallback", error);
    // Arabic must stay on the canvas path when possible; plain fallback reverses
    // letters. Only use it for English-only threads or as last resort.
    if (!hasArabic) {
      exportPlainText({ history, locale, labels });
    } else {
      throw error;
    }
  } finally {
    if (node.parentNode) {
      document.body.removeChild(node);
    }
  }
}
