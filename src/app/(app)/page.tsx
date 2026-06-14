"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { eur, deDate, STATUS_LABELS, STATUS_CLASSES } from "@/lib/format";
import type { Invoice, Client } from "@/lib/types";
import DownloadPdfButton from "@/components/DownloadPdfButton";

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const revenuePaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (Number(i.total_gross) || 0), 0);
  const open = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const openSum = open.reduce((s, i) => s + (Number(i.total_gross) || 0), 0);

  const kpis = [
    { label: "Umsatz (bezahlt)", value: eur(revenuePaid), accent: true },
    { label: "Offene Beträge", value: eur(openSum) },
    { label: "Rechnungen", value: String(invoices.length) },
    { label: "Kunden", value: String(Object.keys(clients).length) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Dashboard</h1>
          <p className="text-sm text-muted mt-1">
            Überblick über Umsatz und Rechnungen
          </p>
        </div>
        <Link href="/invoices/new" className="btn-gold">
          + Neue Rechnung
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {k.label}
            </p>
            <p
              className={`mt-2 text-2xl font-extrabold ${
                k.accent ? "text-gold" : "text-navy"
              }`}
            >
              {loading ? "…" : k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-bold text-navy">Letzte Rechnungen</h2>
          <Link href="/invoices" className="text-sm font-semibold text-gold">
            Alle ansehen →
          </Link>
        </div>
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
                {invoices.slice(0, 6).map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/50">
                    <td className="td font-semibold">{i.invoice_number}</td>
                    <td className="td">
                      {clients[i.client_id]?.company ||
                        clients[i.client_id]?.name ||
                        "—"}
                    </td>
                    <td className="td text-muted">{deDate(i.invoice_date)}</td>
                    <td className="td">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_CLASSES[i.status]
                        }`}
                      >
                        {STATUS_LABELS[i.status]}
                      </span>
                    </td>
                    <td className="td text-right font-bold">
                      {eur(i.total_gross)}
                    </td>
                    <td className="td text-right">
                      <DownloadPdfButton invoiceId={i.id} />
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
