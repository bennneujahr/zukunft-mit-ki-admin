import { buildInvoicePdf, InvoicePdfData } from "../src/lib/pdf/invoice-pdf";
import { writeFileSync } from "fs";

const settings = {
  company_name: "Zukunft mit KI",
  owner_name: "Benn Neujahr",
  address: "Am Markt 1",
  zip: "19089",
  city: "Crivitz",
  country: "Deutschland",
  email: "benn.neujahr@zukunft-mit-ki.com",
  phone: "017656161763",
  ust_id: null,
  tax_number: null,
  bank_name: null,
  iban: "DE86 1001 8000 0649 3224 18",
  bic: null,
  account_holder: "BENN LOUIS NEUJAHR",
  default_payment_days: 14,
};

// 1) faithful real invoice
const real: InvoicePdfData = {
  settings,
  client: {
    company: "TFP Bau - Mietpark Hagenow",
    name: "Djamel",
    address: "Rudolf-Diesel-Straße 8",
    zip: "19230",
    city: "Hagenow",
    country: "Deutschland",
    ust_id: "",
  },
  invoice: {
    invoice_number: "ZMK-2026-0001",
    invoice_date: "2026-06-14",
    due_date: "2026-06-28",
    performance_period_start: "2026-06-14",
    performance_period_end: "2026-06-30",
    notes: "Bitte überweisen Sie den Betrag ohne Abzug auf das angegebene Bankkonto.",
    total_net: 300,
    total_tax: 57,
    total_gross: 357,
  },
  items: [
    {
      position: 1,
      description: "Webseitenerstellung – Aufbau einer neuen und modernisierten Webseite",
      quantity: 1,
      unit: "Stück",
      unit_price: 300,
      tax_rate: 19,
      line_total: 300,
    },
  ],
};

// 2) richer demo to show the full layout (multiple items)
const demo: InvoicePdfData = {
  settings,
  client: {
    company: "Smoke at the Water GmbH",
    name: "Herr Lennart Brandt",
    address: "Strandpromenade 14",
    zip: "18119",
    city: "Rostock-Warnemünde",
    country: "Deutschland",
    ust_id: "DE329114857",
  },
  invoice: {
    invoice_number: "ZMK-2026-0002",
    invoice_date: "2026-06-14",
    due_date: "2026-06-28",
    performance_period_start: "2026-05-01",
    performance_period_end: "2026-05-31",
    notes:
      "Vielen Dank für die Beauftragung. Die Lösung wurde gemäß Pilotvereinbarung produktiv ausgerollt und ist DSGVO-konform dokumentiert.",
    total_net: null,
    total_tax: null,
    total_gross: null,
  },
  items: [
    { position: 1, description: "Quick-Win-Audit – vollständige Prozess- und Workflow-Analyse", quantity: 1, unit: "Pauschale", unit_price: 499, tax_rate: 19 },
    { position: 2, description: "KI-Pilotprojekt – Entwicklung & produktiver Rollout (30 Tage)", quantity: 30, unit: "Std", unit_price: 95, tax_rate: 19 },
    { position: 3, description: "Workshop KI im Team – Schulung der Mitarbeitenden vor Ort", quantity: 2, unit: "Tage", unit_price: 780, tax_rate: 19 },
    { position: 4, description: "Laufende Betreuung & Optimierung (Monatspauschale)", quantity: 1, unit: "Monat", unit_price: 240, tax_rate: 19 },
  ],
};

for (const [name, data] of [["real", real], ["demo", demo]] as const) {
  const doc = buildInvoicePdf(data);
  const buf = Buffer.from(doc.output("arraybuffer"));
  writeFileSync(`out/${name}.pdf`, buf);
  console.log(`wrote out/${name}.pdf (${buf.length} bytes)`);
}
