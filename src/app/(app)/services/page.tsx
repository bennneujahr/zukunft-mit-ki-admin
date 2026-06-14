"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { eur } from "@/lib/format";
import type { Service } from "@/lib/types";

const EMPTY: Partial<Service> = {
  name: "",
  description: "",
  unit_price: 0,
  unit: "Stunde",
  tax_rate: 19,
  is_active: true,
};

const UNITS = ["Stunde", "Tag", "Stück", "Pauschale", "Monat", "Projekt"];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("invoice_services")
      .select("*")
      .order("name");
    setServices(data || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      ...editing,
      unit_price: Number(editing.unit_price) || 0,
      tax_rate: Number(editing.tax_rate) || 0,
    };
    delete (payload as { created_at?: unknown }).created_at;
    delete (payload as { updated_at?: unknown }).updated_at;
    let error;
    if (editing.id) {
      ({ error } = await supabase
        .from("invoice_services")
        .update(payload)
        .eq("id", editing.id));
    } else {
      delete (payload as { id?: unknown }).id;
      ({ error } = await supabase.from("invoice_services").insert(payload));
    }
    setSaving(false);
    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Diese Leistung wirklich löschen?")) return;
    const supabase = createClient();
    await supabase.from("invoice_services").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Leistungen</h1>
          <p className="text-sm text-muted mt-1">
            Leistungskatalog für die Rechnungserstellung
          </p>
        </div>
        <button className="btn-gold" onClick={() => setEditing({ ...EMPTY })}>
          + Neue Leistung
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-muted">Lädt…</p>
        ) : services.length === 0 ? (
          <p className="p-10 text-center text-muted">Noch keine Leistungen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="th">Bezeichnung</th>
                  <th className="th">Einheit</th>
                  <th className="th text-right">Preis (netto)</th>
                  <th className="th text-right">USt</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="td">
                      <div className="font-semibold">{s.name}</div>
                      {s.description && (
                        <div className="text-muted text-xs">{s.description}</div>
                      )}
                    </td>
                    <td className="td text-muted">{s.unit}</td>
                    <td className="td text-right font-semibold">
                      {eur(s.unit_price)}
                    </td>
                    <td className="td text-right text-muted">{s.tax_rate} %</td>
                    <td className="td text-right whitespace-nowrap">
                      <button
                        className="text-sm font-semibold text-navy hover:text-gold mr-4"
                        onClick={() => setEditing(s)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="text-sm font-semibold text-red-500 hover:text-red-600"
                        onClick={() => remove(s.id)}
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={save} className="card w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-navy">
              {editing.id ? "Leistung bearbeiten" : "Neue Leistung"}
            </h2>
            <div>
              <label className="label">Bezeichnung *</label>
              <input
                required
                className="input"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Beschreibung</label>
              <input
                className="input"
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Preis netto (€)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editing.unit_price ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, unit_price: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="label">Einheit</label>
                <select
                  className="input"
                  value={editing.unit || "Stunde"}
                  onChange={(e) =>
                    setEditing({ ...editing, unit: e.target.value })
                  }
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">USt (%)</label>
                <input
                  type="number"
                  step="1"
                  className="input"
                  value={editing.tax_rate ?? 19}
                  onChange={(e) =>
                    setEditing({ ...editing, tax_rate: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditing(null)}
              >
                Abbrechen
              </button>
              <button type="submit" className="btn-gold" disabled={saving}>
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
