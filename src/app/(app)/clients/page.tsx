"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/lib/types";

const EMPTY: Partial<Client> = {
  company: "",
  name: "",
  address: "",
  zip: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
  ust_id: "",
  notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("invoice_clients")
      .select("*")
      .order("company", { nullsFirst: false })
      .order("name");
    setClients(data || []);
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
    const payload = { ...editing };
    delete (payload as { created_at?: unknown }).created_at;
    delete (payload as { updated_at?: unknown }).updated_at;
    let error;
    if (editing.id) {
      ({ error } = await supabase
        .from("invoice_clients")
        .update(payload)
        .eq("id", editing.id));
    } else {
      delete (payload as { id?: unknown }).id;
      ({ error } = await supabase.from("invoice_clients").insert(payload));
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
    if (!confirm("Diesen Kunden wirklich löschen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("invoice_clients").delete().eq("id", id);
    if (error) {
      alert("Löschen nicht möglich (evtl. mit Rechnungen verknüpft).");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Kunden</h1>
          <p className="text-sm text-muted mt-1">Kundenstammdaten verwalten</p>
        </div>
        <button className="btn-gold" onClick={() => setEditing({ ...EMPTY })}>
          + Neuer Kunde
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-muted">Lädt…</p>
        ) : clients.length === 0 ? (
          <p className="p-10 text-center text-muted">Noch keine Kunden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="th">Firma / Name</th>
                  <th className="th">Ort</th>
                  <th className="th">E-Mail</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="td">
                      <div className="font-semibold">{c.company || c.name}</div>
                      {c.company && (
                        <div className="text-muted text-xs">{c.name}</div>
                      )}
                    </td>
                    <td className="td text-muted">
                      {[c.zip, c.city].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="td text-muted">{c.email || "—"}</td>
                    <td className="td text-right whitespace-nowrap">
                      <button
                        className="text-sm font-semibold text-navy hover:text-gold mr-4"
                        onClick={() => setEditing(c)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="text-sm font-semibold text-red-500 hover:text-red-600"
                        onClick={() => remove(c.id)}
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
          <form
            onSubmit={save}
            className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold text-navy">
              {editing.id ? "Kunde bearbeiten" : "Neuer Kunde"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Firma</label>
                <input
                  className="input"
                  value={editing.company || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, company: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="label">Ansprechpartner / Name *</label>
                <input
                  required
                  className="input"
                  value={editing.name || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="label">Adresse</label>
                <input
                  className="input"
                  value={editing.address || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">PLZ</label>
                <input
                  className="input"
                  value={editing.zip || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, zip: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Ort</label>
                <input
                  className="input"
                  value={editing.city || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, city: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">E-Mail</label>
                <input
                  className="input"
                  value={editing.email || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  className="input"
                  value={editing.phone || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="label">USt-IdNr.</label>
                <input
                  className="input"
                  value={editing.ust_id || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, ust_id: e.target.value })
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
