import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PJS_Regular,
  PJS_SemiBold,
  PJS_Bold,
  PJS_ExtraBold,
  LOGO_NAVY_PNG,
} from "./assets";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PdfSettings {
  company_name: string;
  owner_name?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  ust_id?: string | null;
  tax_number?: string | null;
  bank_name?: string | null;
  iban?: string | null;
  bic?: string | null;
  account_holder?: string | null;
  default_payment_days?: number | null;
}

export interface PdfClient {
  company?: string | null;
  name: string;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  ust_id?: string | null;
}

export interface PdfItem {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  line_total?: number | null;
}

export interface PdfInvoice {
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  performance_period_start?: string | null;
  performance_period_end?: string | null;
  notes?: string | null;
  total_net?: number | null;
  total_tax?: number | null;
  total_gross?: number | null;
}

export interface InvoicePdfData {
  settings: PdfSettings;
  client: PdfClient;
  invoice: PdfInvoice;
  items: PdfItem[];
}

/* ------------------------------------------------------------------ */
/*  Brand palette                                                      */
/* ------------------------------------------------------------------ */

const NAVY: [number, number, number] = [26, 32, 53]; // #1a2035
const NAVY_DEEP: [number, number, number] = [15, 22, 40]; // #0f1628
const GOLD: [number, number, number] = [201, 168, 76]; // #C9A84C
const GOLD_LIGHT: [number, number, number] = [232, 200, 112]; // #E8C870
const INK: [number, number, number] = [30, 37, 54];
const MUTED: [number, number, number] = [125, 134, 158];
const LIGHT: [number, number, number] = [247, 248, 250];
const PANEL: [number, number, number] = [248, 249, 251];
const BORDER: [number, number, number] = [226, 230, 238];
const GOLD_TINT: [number, number, number] = [250, 246, 234];
const WHITE: [number, number, number] = [255, 255, 255];

const FONT = "PlusJakarta";
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BAND_H = 42;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(n) ? n : 0);

const num = (n: number, d = 2) =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  }).format(Number.isFinite(n) ? n : 0);

function deDate(d?: string | null): string {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) {
    return `${String(dt.getDate()).padStart(2, "0")}.${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}.${dt.getFullYear()}`;
  }
  return d;
}

let fontsReady = false;
function registerFonts(doc: jsPDF) {
  // VFS is shared across instances; register the family once per runtime.
  doc.addFileToVFS("PJS-Regular.ttf", PJS_Regular);
  doc.addFont("PJS-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("PJS-SemiBold.ttf", PJS_SemiBold);
  doc.addFont("PJS-SemiBold.ttf", FONT, "semibold");
  doc.addFileToVFS("PJS-Bold.ttf", PJS_Bold);
  doc.addFont("PJS-Bold.ttf", FONT, "bold");
  doc.addFileToVFS("PJS-ExtraBold.ttf", PJS_ExtraBold);
  doc.addFont("PJS-ExtraBold.ttf", FONT, "extrabold");
  fontsReady = true;
}

function setText(
  doc: jsPDF,
  size: number,
  style: "normal" | "semibold" | "bold" | "extrabold",
  color: [number, number, number]
) {
  doc.setFont(FONT, style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

// letter-spaced uppercase label
function labelCaps(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  color: [number, number, number],
  size = 7.5,
  align: "left" | "right" = "left"
) {
  setText(doc, size, "bold", color);
  doc.setCharSpace(0.6);
  doc.text(text.toUpperCase(), x, y, { align, baseline: "top" });
  doc.setCharSpace(0);
}

/* ------------------------------------------------------------------ */
/*  Main builder                                                       */
/* ------------------------------------------------------------------ */

export function buildInvoicePdf(data: InvoicePdfData): jsPDF {
  const { settings, client, invoice, items } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  registerFonts(doc);

  /* ---- VAT grouping & totals (recomputed, robust to missing values) ---- */
  const lines = items.map((it) => {
    const lineNet =
      it.line_total != null ? Number(it.line_total) : it.quantity * it.unit_price;
    return { ...it, lineNet };
  });
  const groups = new Map<number, { net: number; tax: number }>();
  let net = 0;
  for (const l of lines) {
    net += l.lineNet;
    const rate = Number(l.tax_rate) || 0;
    const g = groups.get(rate) || { net: 0, tax: 0 };
    g.net += l.lineNet;
    g.tax += (l.lineNet * rate) / 100;
    groups.set(rate, g);
  }
  let tax = 0;
  groups.forEach((g) => (tax += g.tax));
  const gross = net + tax;
  const totalNet = invoice.total_net != null ? Number(invoice.total_net) : net;
  const totalTax = invoice.total_tax != null ? Number(invoice.total_tax) : tax;
  const totalGross =
    invoice.total_gross != null ? Number(invoice.total_gross) : gross;
  const isSmallBusiness =
    groups.size > 0 && Array.from(groups.keys()).every((r) => r === 0);

  /* ----------------------------- FOOTER ----------------------------- */
  const drawFooter = (pageNumber: number, pageCount: number) => {
    const fy = PAGE_H - 20;
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, fy, PAGE_W - MARGIN, fy);

    const colW = CONTENT_W / 3;
    const cy = fy + 3;
    setText(doc, 7, "bold", NAVY);
    doc.text(settings.company_name, MARGIN, cy, { baseline: "top" });
    doc.text("Kontakt", MARGIN + colW, cy, { baseline: "top" });
    doc.text("Bankverbindung", MARGIN + colW * 2, cy, { baseline: "top" });

    setText(doc, 7, "normal", MUTED);
    const addr = [
      settings.owner_name,
      [settings.address].filter(Boolean).join(""),
      [settings.zip, settings.city].filter(Boolean).join(" "),
    ].filter(Boolean) as string[];
    const contact = [
      settings.email || undefined,
      settings.phone ? `Tel. ${settings.phone}` : undefined,
      settings.ust_id ? `USt-IdNr. ${settings.ust_id}` : undefined,
      settings.tax_number && !settings.ust_id
        ? `St-Nr. ${settings.tax_number}`
        : undefined,
    ].filter(Boolean) as string[];
    const bank = [
      settings.account_holder || undefined,
      settings.iban ? `IBAN ${settings.iban}` : undefined,
      settings.bic ? `BIC ${settings.bic}` : undefined,
      settings.bank_name || undefined,
    ].filter(Boolean) as string[];

    const writeCol = (arr: string[], x: number) => {
      let yy = cy + 4.5;
      for (const t of arr) {
        const wrapped = doc.splitTextToSize(t, colW - 4);
        doc.text(wrapped, x, yy, { baseline: "top" });
        yy += 3.4 * wrapped.length;
      }
    };
    writeCol(addr, MARGIN);
    writeCol(contact, MARGIN + colW);
    writeCol(bank, MARGIN + colW * 2);

    setText(doc, 7, "normal", MUTED);
    doc.text(`Seite ${pageNumber} von ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, {
      align: "right",
      baseline: "bottom",
    });
  };

  /* --------------------------- HEADER BAND -------------------------- */
  // top navy band
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, PAGE_W, BAND_H, "F");
  // subtle deeper strip at very top for depth
  doc.setFillColor(NAVY_DEEP[0], NAVY_DEEP[1], NAVY_DEEP[2]);
  doc.rect(0, 0, PAGE_W, 2.2, "F");
  // gold underline of band
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, BAND_H, PAGE_W, 0.9, "F");

  // logo (already on flat navy, blends into band). aspect ~211:86
  const logoH = 15;
  const logoW = logoH * (211 / 86);
  doc.addImage(LOGO_NAVY_PNG, "PNG", MARGIN, (BAND_H - logoH) / 2 - 1, logoW, logoH);

  // document title right
  setText(doc, 23, "extrabold", WHITE);
  doc.text("RECHNUNG", PAGE_W - MARGIN, 16, { align: "right", baseline: "top" });
  setText(doc, 10.5, "semibold", GOLD_LIGHT);
  doc.text(invoice.invoice_number, PAGE_W - MARGIN, 28.5, {
    align: "right",
    baseline: "top",
  });

  /* --------------------- SENDER + RECIPIENT ------------------------- */
  let y = BAND_H + 12;

  // small sender line (window-envelope convention)
  const senderLine = [
    settings.company_name,
    settings.owner_name,
    settings.address,
    [settings.zip, settings.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join("  ·  ");
  setText(doc, 7.5, "normal", MUTED);
  doc.text(senderLine, MARGIN, y, { baseline: "top" });
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 4.5, MARGIN + 95, y + 4.5);

  // recipient
  let ry = y + 10;
  labelCaps(doc, "Rechnungsempfänger", MARGIN, ry, GOLD, 7.5);
  ry += 6.5;
  if (client.company) {
    setText(doc, 12, "bold", INK);
    doc.text(client.company, MARGIN, ry, { baseline: "top" });
    ry += 6;
  }
  setText(doc, 10.5, client.company ? "normal" : "bold", INK);
  const recipLines: string[] = [];
  if (client.name) recipLines.push(client.name);
  if (client.address) recipLines.push(client.address);
  const cityLine = [client.zip, client.city].filter(Boolean).join(" ");
  if (cityLine) recipLines.push(cityLine);
  if (client.country && client.country !== "Deutschland")
    recipLines.push(client.country);
  for (const l of recipLines) {
    doc.text(l, MARGIN, ry, { baseline: "top" });
    ry += 5.2;
  }
  if (client.ust_id) {
    setText(doc, 9, "normal", MUTED);
    doc.text(`USt-IdNr. ${client.ust_id}`, MARGIN, ry, { baseline: "top" });
    ry += 5;
  }

  // meta panel (right)
  const panelX = PAGE_W - MARGIN - 70;
  const panelW = 70;
  const panelY = y + 6;
  const metaRows: [string, string][] = [
    ["Rechnungsnummer", invoice.invoice_number],
    ["Rechnungsdatum", deDate(invoice.invoice_date)],
  ];
  if (invoice.performance_period_start || invoice.performance_period_end) {
    const a = deDate(invoice.performance_period_start);
    const b = deDate(invoice.performance_period_end);
    metaRows.push([
      "Leistungszeitraum",
      a === b ? a : `${a} – ${b}`,
    ]);
  }
  if (invoice.due_date) metaRows.push(["Fällig am", deDate(invoice.due_date)]);

  const rowH = 11;
  const panelH = metaRows.length * rowH + 5;
  doc.setFillColor(PANEL[0], PANEL[1], PANEL[2]);
  doc.roundedRect(panelX, panelY, panelW, panelH, 2.2, 2.2, "F");
  // gold left accent
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(panelX, panelY + 2, 1.4, panelH - 4, "F");
  let my = panelY + 4.5;
  metaRows.forEach(([k, v], i) => {
    setText(doc, 7, "semibold", MUTED);
    doc.setCharSpace(0.4);
    doc.text(k.toUpperCase(), panelX + 6, my, { baseline: "top" });
    doc.setCharSpace(0);
    setText(doc, 9.5, "bold", NAVY);
    doc.text(v, panelX + 6, my + 3.7, { baseline: "top" });
    if (i < metaRows.length - 1) {
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      doc.setLineWidth(0.2);
      doc.line(panelX + 6, my + rowH - 2.6, panelX + panelW - 5, my + rowH - 2.6);
    }
    my += rowH;
  });

  /* ----------------------------- TABLE ------------------------------ */
  const tableTop = Math.max(ry, panelY + panelH) + 10;

  autoTable(doc, {
    startY: tableTop,
    margin: { left: MARGIN, right: MARGIN, bottom: 30 },
    head: [
      ["Pos.", "Beschreibung", "Menge", "Einzelpreis", "USt", "Gesamt (netto)"],
    ],
    body: lines.map((l) => [
      String(l.position),
      l.description,
      `${num(l.quantity)} ${l.unit}`,
      eur(l.unit_price),
      `${num(l.tax_rate, 0)} %`,
      eur(l.lineNet),
    ]),
    theme: "plain",
    styles: {
      font: FONT,
      fontStyle: "normal",
      fontSize: 9,
      textColor: INK,
      cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
      lineColor: BORDER,
      lineWidth: 0,
      valign: "middle",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 3.4, right: 3, bottom: 3.4, left: 3 },
    },
    alternateRowStyles: {
      fillColor: [251, 251, 253] as [number, number, number],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12, textColor: MUTED },
      1: { halign: "left", cellWidth: 62, fontStyle: "semibold" as any },
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "right", cellWidth: 27 },
      4: { halign: "right", cellWidth: 15, textColor: MUTED },
      5: { halign: "right", cellWidth: 34, fontStyle: "bold" },
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        d.cell.styles.textColor = INK;
      }
    },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const current = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
      drawFooter(current, pageCount);
    },
  });

  // thin gold rule under the table header (drawn over plain theme)
  // (handled visually by navy head fill; add a closing rule under table)
  const afterTable =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, afterTable + 0.5, PAGE_W - MARGIN, afterTable + 0.5);

  /* ----------------------------- TOTALS ----------------------------- */
  let ty = afterTable + 8;
  const boxW = 78;
  const boxX = PAGE_W - MARGIN - boxW;
  const labelX = boxX + 3;
  const valX = PAGE_W - MARGIN - 3;

  const totalRow = (
    label: string,
    value: string,
    opts: { strong?: boolean } = {}
  ) => {
    setText(
      doc,
      opts.strong ? 10 : 9.5,
      opts.strong ? "bold" : "normal",
      opts.strong ? NAVY : MUTED
    );
    doc.text(label, labelX, ty, { baseline: "top" });
    setText(doc, opts.strong ? 10 : 9.5, opts.strong ? "bold" : "semibold", INK);
    doc.text(value, valX, ty, { align: "right", baseline: "top" });
    ty += 6.2;
  };

  totalRow("Zwischensumme (netto)", eur(totalNet));
  if (!isSmallBusiness) {
    const rates = Array.from(groups.keys()).sort((a, b) => a - b);
    for (const r of rates) {
      const g = groups.get(r)!;
      if (r === 0) continue;
      totalRow(`zzgl. ${num(r, 0)} % USt`, eur(g.tax));
    }
  }
  ty += 1.5;

  // grand total bar
  const barH = 12;
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(boxX, ty, boxW, barH, 2.2, 2.2, "F");
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(boxX, ty + 2.4, 1.6, barH - 4.8, "F");
  setText(doc, 10.5, "bold", WHITE);
  doc.text("Gesamtbetrag", labelX + 1.5, ty + barH / 2, { baseline: "middle" });
  setText(doc, 12.5, "extrabold", GOLD_LIGHT);
  doc.text(eur(totalGross), valX, ty + barH / 2, {
    align: "right",
    baseline: "middle",
  });
  ty += barH + 4;

  if (isSmallBusiness) {
    setText(doc, 8.5, "normal", MUTED);
    const sb = doc.splitTextToSize(
      "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).",
      boxW
    );
    doc.text(sb, valX, ty, { align: "right", baseline: "top" });
    ty += sb.length * 4 + 2;
  }

  /* ------------------- NOTES + PAYMENT (left col) ------------------- */
  let ly = afterTable + 8;
  const leftW = CONTENT_W - boxW - 8;

  if (invoice.notes) {
    labelCaps(doc, "Anmerkungen", MARGIN, ly, GOLD, 7.5);
    ly += 6;
    setText(doc, 9, "normal", INK);
    const notes = doc.splitTextToSize(invoice.notes, leftW);
    doc.text(notes, MARGIN, ly, { baseline: "top" });
    ly += notes.length * 4.2 + 6;
  }

  // payment panel
  const payTop = Math.max(ly, ty + 2);
  const payDays =
    invoice.due_date != null
      ? null
      : settings.default_payment_days ?? null;
  const payParts: string[] = [];
  if (settings.iban) payParts.push(`IBAN: ${settings.iban}`);
  if (settings.account_holder)
    payParts.push(`Kontoinhaber: ${settings.account_holder}`);
  if (settings.bic) payParts.push(`BIC: ${settings.bic}`);
  if (settings.bank_name) payParts.push(`Bank: ${settings.bank_name}`);

  const dueText = invoice.due_date
    ? `Zahlbar ohne Abzug bis zum ${deDate(invoice.due_date)}.`
    : payDays
    ? `Zahlbar ohne Abzug innerhalb von ${payDays} Tagen.`
    : "Zahlbar ohne Abzug nach Erhalt der Rechnung.";

  const payH = 16 + payParts.length * 4.6;
  doc.setFillColor(GOLD_TINT[0], GOLD_TINT[1], GOLD_TINT[2]);
  doc.roundedRect(MARGIN, payTop, CONTENT_W, payH, 2.2, 2.2, "F");
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(MARGIN, payTop + 2, 1.6, payH - 4, "F");
  labelCaps(doc, "Zahlungshinweise", MARGIN + 6, payTop + 4, GOLD, 7.5);
  setText(doc, 9, "semibold", NAVY);
  doc.text(dueText, MARGIN + 6, payTop + 9.5, { baseline: "top" });
  setText(doc, 9, "normal", INK);
  let pY = payTop + 14.5;
  // lay bank parts in up to two columns
  const half = Math.ceil(payParts.length / 2);
  payParts.forEach((p, i) => {
    const col = i < half ? 0 : 1;
    const px = MARGIN + 6 + col * (CONTENT_W / 2);
    const row = i < half ? i : i - half;
    doc.text(p, px, pY + row * 4.6, { baseline: "top" });
  });

  // closing thank-you line
  const thankY = payTop + payH + 7;
  if (thankY < PAGE_H - 26) {
    setText(doc, 9.5, "semibold", NAVY);
    doc.text(
      "Vielen Dank für Ihr Vertrauen und die gute Zusammenarbeit.",
      MARGIN,
      thankY,
      { baseline: "top" }
    );
  }

  // ensure footer on the (single) page if table didn't trigger didDrawPage edge
  // (autotable always fires didDrawPage at least once, so footer is present)

  return doc;
}

export function invoiceFileName(invoice: PdfInvoice): string {
  return `Rechnung_${invoice.invoice_number}.pdf`;
}
