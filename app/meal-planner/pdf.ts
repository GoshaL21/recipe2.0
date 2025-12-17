

import type { ShoppingLine } from "./shoppingListUtils";

export async function downloadShoppingListPdf(opts: {
  title: string;
  lines: ShoppingLine[];
  filename?: string;
}) {
  const { title, lines, filename } = opts;

  // Dynamic import so it only loads in the browser.
  const mod = await import("jspdf");
  const jsPDF = (mod as any).jsPDF as new () => any;

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFontSize(11);

  let y = 28;
  const lineHeight = 7;

  const safeLines = (lines || []).map((l) => {
    const qty = Math.round(l.qty * 10) / 10;
    if (!l.unit || l.unit === "pc") return qty > 1 ? `${l.name} — ${qty}` : l.name;
    return `${qty} ${l.unit} ${l.name}`.trim();
  });

  if (!safeLines.length) {
    doc.text("No shopping items.", 14, y);
  } else {
    for (const text of safeLines) {
      // Split long lines
      const wrapped = doc.splitTextToSize(text, 180);
      for (const w of wrapped) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(w), 14, y);
        y += lineHeight;
      }
    }
  }

  const defaultName = (filename || "shopping-list.pdf").replace(/\s+/g, "-");
  doc.save(defaultName);
}