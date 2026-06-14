"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("invoice_settings")
        .select("*")
        .limit(1)
        .single();
      setS(data);
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...s };
    delete (payload as { created_at?: unknown }).created_at;
    delete (payload as { updated_at?: unknown }).updated_at;
    const { error } = await supabase
      .from("invoice_settings")
      .update(payload)
      .eq("id", s.id);
    setSaving(false);
    if (error) {
      alert("Fehler: " + error.message);
      return;
    }
    setSaved(true);
  }

  if (loading || !s) return <p className="text-sm text-muted">Lädt…</p>;

  const field = (
    label: string,
    key: keyof Settings,
    type: "text" | "number" = "text"
  ) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        value={(s[key] as string | number | null) ?? ""}
        onChange={(e) =>
          set(
            key,
            (type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value) as Settings[keyof Settings]
          )
        }
      />
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Einstellungen</h1>
          <p className="text-sm text-muted mt-1">
            Diese Angaben erscheinen auf jeder Rechnung
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm font-semibold text-emerald-600">
              Gespeichert ✓
            </span>
          )}
          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-navy">Firma</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {field("Firmenname", "company_name")}
          {field("Inhaber", "owner_name")}
          {field("Straße & Nr.", "address")}
          <div className="grid grid-cols-2 gap-4">
            {field("PLZ", "zip")}
            {field("Ort", "city")}
          </div>
          {field("Land", "country")}
          {field("E-Mail", "email")}
          {field("Telefon", "phone")}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-navy">Steuer</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {field("USt-IdNr.", "ust_id")}
          {field("Steuernummer", "tax_number")}
        </div>
        <p className="text-xs text-muted">
          Hinweis: Wird eine Position mit 0&nbsp;% USt berechnet, weist die
          Rechnung automatisch die Kleinunternehmerregelung (§&nbsp;19&nbsp;UStG)
          aus.
        </p>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-navy">Bankverbindung</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {field("Kontoinhaber", "account_holder")}
          {field("Bank", "bank_name")}
          {field("IBAN", "iban")}
          {field("BIC", "bic")}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-navy">Rechnungsstellung</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {field("Rechnungs-Präfix", "invoice_prefix")}
          {field("Nächste Nummer", "next_invoice_number", "number")}
          {field("Zahlungsziel (Tage)", "default_payment_days", "number")}
          {field("Standard-USt (%)", "default_tax_rate", "number")}
        </div>
        <p className="text-xs text-muted">
          Nächste Rechnungsnummer:{" "}
          <span className="font-semibold text-navy">
            {(s.invoice_prefix || "ZMK")}-{new Date().getFullYear()}-
            {String(s.next_invoice_number ?? 1).padStart(4, "0")}
          </span>
        </p>
      </section>
    </form>
  );
}
