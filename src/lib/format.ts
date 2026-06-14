export const eur = (n: number | null | undefined) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

export const deDate = (d?: string | null) => {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

export const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-500",
};
