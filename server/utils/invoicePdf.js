const PDFDocument = require("pdfkit");

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(n) {
  return "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`;
}

/**
 * Generates a PDF invoice and pipes it into `res`.
 * @param {Object} invoice  — populated Invoice document (clientId, lineItems, etc.)
 * @param {Object} res      — Express response object
 */
function generateInvoicePdf(invoice, res) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });

  // ── Stream straight to response ──────────────────────────
  const rawName = invoice.invoiceNumber || invoice.invoiceId || "invoice";
  const safeFileName = String(rawName).replace(/[^\w\-]/g, "_") + ".pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
  doc.pipe(res);

  // ── Colours ──────────────────────────────────────────────
  const ACCENT  = "#4F46E5";
  const DARK    = "#111827";
  const MUTED   = "#6B7280";
  const BORDER  = "#E5E7EB";
  const ROW_ALT = "#F9FAFB";

  const W = doc.page.width - 100; // usable width (margin 50 each side)

  // ── Header band ──────────────────────────────────────────
  doc.rect(50, 50, W, 72).fill(ACCENT);

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(22)
     .text("INVOICE", 70, 65);

  doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.75)")
     .text(invoice.invoiceNumber || invoice.invoiceId || "", 70, 92);

  // Status badge
  const statusLabel = (invoice.status || "draft").toUpperCase();
  const statusX = doc.page.width - 130;
  doc.roundedRect(statusX, 62, 80, 20, 4).fill("rgba(255,255,255,0.2)");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8)
     .text(statusLabel, statusX, 67, { width: 80, align: "center" });

  // ── From / To ────────────────────────────────────────────
  const col2X = 50 + W / 2 + 10;
  let y = 140;

  doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("FROM", 50, y);
  doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("TO", col2X, y);

  y += 14;
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text("ZRC Media", 50, y);

  const clientName = invoice.clientId?.companyName || invoice.clientId?.displayName || "Client";
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text(clientName, col2X, y);

  y += 15;
  doc.fillColor(MUTED).font("Helvetica").fontSize(9)
     .text("Network CRM Platform", 50, y)
     .text(invoice.clientId?.contactName || "", col2X, y);

  y += 12;
  if (invoice.clientId?.contactEmail) {
    doc.text(invoice.clientId.contactEmail, col2X, y);
  }

  // ── Meta row ─────────────────────────────────────────────
  y += 36;
  doc.moveTo(50, y).lineTo(50 + W, y).strokeColor(BORDER).lineWidth(1).stroke();
  y += 12;

  const metaCols = [
    { label: "Invoice Date", value: fmtDate(invoice.createdAt) },
    { label: "Due Date",     value: fmtDate(invoice.dueDate) },
    { label: "Period",       value: invoice.month ? `${MONTHS[invoice.month]} ${invoice.year}` : "—" },
    { label: "Paid",         value: fmt(invoice.paidAmount) },
  ];

  const metaColW = W / metaCols.length;
  metaCols.forEach((m, i) => {
    const mx = 50 + i * metaColW;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(m.label, mx, y);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10).text(m.value, mx, y + 12);
  });

  y += 38;
  doc.moveTo(50, y).lineTo(50 + W, y).strokeColor(BORDER).lineWidth(1).stroke();

  // ── Line items table header ───────────────────────────────
  y += 14;
  const cols = { desc: 50, qty: 290, unit: 360, amount: 440 };

  doc.rect(50, y, W, 20).fill("#F3F4F6");
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8);
  doc.text("DESCRIPTION", cols.desc + 6, y + 6);
  doc.text("QTY",    cols.qty,    y + 6);
  doc.text("UNIT",   cols.unit,   y + 6);
  doc.text("AMOUNT", cols.amount, y + 6, { width: 60, align: "right" });

  // ── Line items ───────────────────────────────────────────
  y += 22;
  (invoice.lineItems || []).forEach((item, idx) => {
    const rowH = 24;
    if (idx % 2 === 1) {
      doc.rect(50, y - 2, W, rowH).fill(ROW_ALT);
    }
    doc.fillColor(DARK).font("Helvetica").fontSize(9);
    doc.text(item.description || "—", cols.desc + 6, y + 4, { width: 225, ellipsis: true });

    const svcLabel = (item.serviceType || "").replace(/_/g, " ");
    if (svcLabel) {
      doc.fillColor(MUTED).fontSize(7.5)
         .text(svcLabel, cols.desc + 6, y + 14, { width: 225 });
    }

    doc.fillColor(DARK).font("Helvetica").fontSize(9);
    doc.text(String(item.quantity ?? 1), cols.qty, y + 4);
    doc.text(fmt(item.unitPrice), cols.unit, y + 4);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
       .text(fmt(item.amount), cols.amount, y + 4, { width: 60, align: "right" });

    y += rowH;
  });

  // ── Totals block ─────────────────────────────────────────
  y += 8;
  doc.moveTo(50, y).lineTo(50 + W, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 12;

  const totalsX = 50 + W - 170;
  const totals = [
    { label: "Subtotal",                    value: fmt(invoice.subtotal) },
    { label: `GST (${invoice.taxRate || 18}%)`, value: fmt(invoice.taxAmount) },
  ];

  totals.forEach(row => {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(row.label, totalsX, y);
    doc.fillColor(DARK).font("Helvetica").fontSize(9).text(row.value, totalsX + 80, y, { width: 90, align: "right" });
    y += 16;
  });

  // Total due
  y += 2;
  doc.rect(totalsX - 10, y - 4, 180, 28).fill("#EEF2FF");
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(11)
     .text("Total", totalsX, y + 4)
     .text(fmt(invoice.totalAmount), totalsX + 80, y + 4, { width: 90, align: "right" });

  // Amount due
  const amtDue = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  if (amtDue > 0) {
    y += 36;
    doc.rect(totalsX - 10, y - 4, 180, 24).fill(ACCENT);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10)
       .text("Amount Due", totalsX, y + 3)
       .text(fmt(amtDue), totalsX + 80, y + 3, { width: 90, align: "right" });
  }

  // ── Notes ────────────────────────────────────────────────
  if (invoice.notes) {
    y += 50;
    doc.moveTo(50, y).lineTo(50 + W, y).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 12;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text("NOTES", 50, y);
    y += 12;
    doc.fillColor(DARK).font("Helvetica").fontSize(9)
       .text(invoice.notes, 50, y, { width: W });
  }

  // ── Footer ───────────────────────────────────────────────
  const footerY = doc.page.height - 50;
  doc.rect(50, footerY - 10, W, 1).fill(BORDER);
  doc.fillColor(MUTED).font("Helvetica").fontSize(8)
     .text("Thank you for your business. — ZRC Media", 50, footerY, { width: W, align: "center" });

  doc.end();
}

module.exports = { generateInvoicePdf };
