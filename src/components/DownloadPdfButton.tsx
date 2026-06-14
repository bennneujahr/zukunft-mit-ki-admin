"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DownloadPdfButton({
  invoiceId,
  variant = "ghost",
  label = "PDF",
}: {
  invoiceId: string;
  variant?: "ghost" | "gold" | "navy";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: invoice }, { data: settings }] = await Promise.all([
        supabase.from("invoice_invoices").select("*").eq("id", invoiceId).single(),
        supabase.from("invoice_settings").select("*").limit(1).single(),
      ]);
      if (!invoice) throw new Error("Rechnung nicht gefunden");
      const [{ data: client }, { data: items }] = await Promise.all([
        supabase
          .from("invoice_clients")
          .select("*")
          .eq("id", invoice.client_id)
          .single(),
        supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", invoiceId)
          .order("position"),
      ]);
      const { buildInvoicePdf, invoiceFileName } = await import(
        "@/lib/pdf/invoice-pdf"
      );
      const doc = buildInvoicePdf({
        settings: settings!,
        client: client!,
        invoice,
        items: items || [],
      });
      doc.save(invoiceFileName(invoice));
    } catch (e) {
      console.error(e);
      alert("PDF konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  }

  const cls =
    variant === "gold" ? "btn-gold" : variant === "navy" ? "btn-navy" : "btn-ghost";

  return (
    <button onClick={handle} className={cls} disabled={loading}>
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      {loading ? "…" : label}
    </button>
  );
}
