"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { eur, deDate, STATUS_LABELS, STATUS_CLASSES } from "@/lib/format";
import type { Invoice, Client, InvoiceStatus } from "@/lib/types";
import DownloadPdfButton from "@/components/DownloadPdfButton";

const STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data: inv } = await supabase
      .from("invoice_invoices")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: cl } = await supabase.from("invoice_clients").select("*");
    const map: Record<string, Client> = {};
    (cl || []).forEach((c) => (map[c.id] = c));
    setClients(map);
    setInvoices(inv || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: InvoiceStatus) {
    const supabase = createClient();
    await supabase.from("invoice_invoices").update({ status }).eq("id", id);
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  async function remove(id: string) {
    if (!confirm("Diese Rechnung wirklich löschen?")) return;
    const supabase = createClient();
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    await supabase.from("invoice_invoices").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Rechnungen</h1>
          <p className="text-sm text-muted mt-1">
            Alle Rechnungen verwalten und als PDF herunterladen
          </p>
        </div>
        <Link href="/invoices/new" className="btn-gold">
          + Neue Rechnung
        </Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-muted">Lädt…</p>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted">Noch keine Rechnungen vorhanden.</p>
            <Link href="/invoices/new" className="btn-gold mt-4">
              Erste Rechnung erstellen
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="th">Nummer</th>
                  <th className="th">Kunde</th>
                  <th className="th">Datum</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Betrag</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/50">
                    <td className="td font-semibold">{i.invoice_number}</td>
                    <td className="td">
                      {clients[i.client_id]?.company ||
                        clients[i.client_id]?.name ||
                        "—"}
                    </td>
                    <td className="td text-muted">{deDate(i.invoice_date)}</td>
                    <td className="td">
                      <select
                        value={i.status}
                        onChange={(e) =>
                          setStatus(i.id, e.target.value as InvoiceStatus)
                        }
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-gold/30 ${
                          STATUS_CLASSES[i.status]
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="td text-right font-bold">
                      {eur(i.total_gross)}
                    </td>
                    <td className="td text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <DownloadPdfButton invoiceId={i.id} />
                        <button
                          className="text-sm font-semibold text-red-500 hover:text-red-600"
                          onClick={() => remove(i.id)}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
