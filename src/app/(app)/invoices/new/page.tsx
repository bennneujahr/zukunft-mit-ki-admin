"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { eur } from "@/lib/format";
import type { Client, Service, Settings } from "@/lib/types";

interface Row {
  service_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [perfStart, setPerfStart] = useState("");
  const [perfEnd, setPerfEnd] = useState("");
  const [notes, setNotes] = useState(
    "Bitte überweisen Sie den Betrag ohne Abzug auf das angegebene Bankkonto."
  );
  const [rows, setRows] = useState<Row[]>([
    { service_id: null, description: "", quantity: 1, unit: "Stunde", unit_price: 0, tax_rate: 19 },
  ]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: cl }, { data: sv }, { data: st }] = await Promise.all([
        supabase.from("invoice_clients").select("*").order("company", { nullsFirst: false }).order("name"),
        supabase.from("invoice_services").select("*").eq("is_active", true).order("name"),
        supabase.from("invoice_settings").select("*").limit(1).single(),
      ]);
      setClients(cl || []);
      setServices(sv || []);
      setSettings(st || null);
      if (st?.default_payment_days != null)
        setDueDate(addDaysISO(st.default_payment_days));
      setLoading(false);
    })();
  }, []);

  const invoiceNumber = useMemo(() => {
    if (!settings) return "";
    const year = invoiceDate.slice(0, 4);
    const n = String(settings.next_invoice_number ?? 1).padStart(4, "0");
    return `${settings.invoice_prefix || "ZMK"}-${year}-${n}`;
  }, [settings, invoiceDate]);

  const totals = useMemo(() => {
    let net = 0;
    const groups = new Map<number, number>();
    for (const r of rows) {
      const line = (Number(r.quantity) || 0) * (Number(r.unit_price) || 0);
      net += line;
      const rate = Number(r.tax_rate) || 0;
      groups.set(rate, (groups.get(rate) || 0) + (line * rate) / 100);
    }
    let tax = 0;
    groups.forEach((v) => (tax += v));
    return { net, tax, gross: net + tax, groups };
  }, [rows]);

  function pickService(idx: number, serviceId: string) {
    const s = services.find((x) => x.id === serviceId);
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? s
            ? {
                service_id: s.id,
                description: s.description ? `${s.name} – ${s.description}` : s.name,
                quantity: r.quantity || 1,
                unit: s.unit,
                unit_price: Number(s.unit_price),
                tax_rate: Number(s.tax_rate ?? 19),
              }
            : { ...r, service_id: null }
          : r
      )
    );
  }

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { service_id: null, description: "", quantity: 1, unit: "Stunde", unit_price: 0, tax_rate: 19 },
    ]);
  const removeRow = (idx: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  async function save(downloadAfter: boolean) {
    if (!clientId) {
      alert("Bitte einen Kunden auswählen.");
      return;
    }
    if (!settings) return;
    const valid = rows.filter((r) => r.description.trim() !== "");
    if (valid.length === 0) {
      alert("Bitte mindestens eine Position mit Beschreibung erfassen.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const { data: inv, error: invErr } = await supabase
      .from("invoice_invoices")
      .insert({
        invoice_number: invoiceNumber,
        client_id: clientId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        performance_period_start: perfStart || null,
        performance_period_end: perfEnd || null,
        status: "draft",
        notes: notes || null,
        total_net: Number(totals.net.toFixed(2)),
        total_tax: Number(totals.tax.toFixed(2)),
        total_gross: Number(totals.gross.toFixed(2)),
      })
      .select()
      .single();

    if (invErr || !inv) {
      setSaving(false);
      alert("Fehler beim Speichern der Rechnung: " + (invErr?.message || ""));
      return;
    }

    const items = valid.map((r, i) => ({
      invoice_id: inv.id,
      service_id: r.service_id,
      position: i + 1,
      description: r.description,
      quantity: Number(r.quantity) || 0,
      unit: r.unit,
      unit_price: Number(r.unit_price) || 0,
      tax_rate: Number(r.tax_rate) || 0,
      line_total: Number(((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)).toFixed(2)),
    }));
    const { error: itemsErr } = await supabase.from("invoice_items").insert(items);
    if (itemsErr) {
      setSaving(false);
      alert("Fehler beim Speichern der Positionen: " + itemsErr.message);
      return;
    }

    await supabase
      .from("invoice_settings")
      .update({ next_invoice_number: (settings.next_invoice_number ?? 1) + 1 })
      .eq("id", settings.id);

    if (downloadAfter) {
      try {
        const client = clients.find((c) => c.id === clientId)!;
        const { buildInvoicePdf, invoiceFileName } = await import(
          "@/lib/pdf/invoice-pdf"
        );
        const doc = buildInvoicePdf({
          settings,
          client,
          invoice: inv,
          items,
        });
        doc.save(invoiceFileName(inv));
      } catch (e) {
        console.error(e);
      }
    }

    router.push("/invoices");
    router.refresh();
  }

  if (loading) return <p className="text-sm text-muted">Lädt…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/invoices" className="text-sm text-muted hover:text-navy">
            ← Zurück
          </Link>
          <h1 className="text-2xl font-extrabold text-navy mt-1">
            Neue Rechnung
          </h1>
        </div>
        <span className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
          {invoiceNumber}
        </span>
      </div>

      {clients.length === 0 && (
        <div className="card p-4 text-sm">
          Noch keine Kunden angelegt.{" "}
          <Link href="/clients" className="font-semibold text-gold">
            Jetzt Kunden anlegen →
          </Link>
        </div>
      )}

      {/* Kopf */}
      <div className="card p-6 grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="label">Kunde *</label>
          <select
            className="input"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Bitte wählen…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company ? `${c.company} (${c.name})` : c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Rechnungsdatum</label>
          <input
            type="date"
            className="input"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Fällig am</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Leistungszeitraum von</label>
          <input
            type="date"
            className="input"
            value={perfStart}
            onChange={(e) => setPerfStart(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Leistungszeitraum bis</label>
          <input
            type="date"
            className="input"
            value={perfEnd}
            onChange={(e) => setPerfEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Positionen */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-navy">Positionen</h2>
          <button className="btn-ghost" onClick={addRow}>
            + Position
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((r, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-line p-4 space-y-3 bg-slate-50/40"
            >
              <div className="grid md:grid-cols-[1fr_auto] gap-3 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="label">Leistung aus Katalog</label>
                    <select
                      className="input"
                      value={r.service_id || ""}
                      onChange={(e) => pickService(idx, e.target.value)}
                    >
                      <option value="">— frei eingeben —</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({eur(s.unit_price)}/{s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Beschreibung *</label>
                    <textarea
                      className="input min-h-[60px]"
                      value={r.description}
                      onChange={(e) =>
                        update(idx, { description: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  className="text-sm font-semibold text-red-500 hover:text-red-600 md:mt-7"
                  onClick={() => removeRow(idx)}
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="label">Menge</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={r.quantity}
                    onChange={(e) =>
                      update(idx, { quantity: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label">Einheit</label>
                  <input
                    className="input"
                    value={r.unit}
                    onChange={(e) => update(idx, { unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Einzelpreis €</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={r.unit_price}
                    onChange={(e) =>
                      update(idx, { unit_price: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label">USt %</label>
                  <input
                    type="number"
                    step="1"
                    className="input"
                    value={r.tax_rate}
                    onChange={(e) =>
                      update(idx, { tax_rate: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label">Summe</label>
                  <div className="input bg-white font-semibold flex items-center">
                    {eur((Number(r.quantity) || 0) * (Number(r.unit_price) || 0))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anmerkungen + Summen */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <label className="label">Anmerkungen</label>
          <textarea
            className="input min-h-[100px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="card p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Zwischensumme (netto)</span>
              <span className="font-semibold">{eur(totals.net)}</span>
            </div>
            {[...totals.groups.entries()]
              .filter(([rate]) => rate > 0)
              .sort((a, b) => a[0] - b[0])
              .map(([rate, val]) => (
                <div key={rate} className="flex justify-between">
                  <span className="text-muted">zzgl. {rate} % USt</span>
                  <span className="font-semibold">{eur(val)}</span>
                </div>
              ))}
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-line">
              <span className="font-bold text-navy">Gesamtbetrag</span>
              <span className="text-xl font-extrabold text-gold">
                {eur(totals.gross)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/invoices" className="btn-ghost">
          Abbrechen
        </Link>
        <button
          className="btn-ghost"
          disabled={saving}
          onClick={() => save(false)}
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
        <button
          className="btn-gold"
          disabled={saving}
          onClick={() => save(true)}
        >
          Speichern & PDF
        </button>
      </div>
    </div>
  );
}
