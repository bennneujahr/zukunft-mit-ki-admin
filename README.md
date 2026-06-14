# Zukunft mit KI – Rechnungsverwaltung

Next.js 15 (App Router) + Supabase Admin-App zur Erstellung gebrandeter Rechnungen
für **Zukunft mit KI** (Inhaber Benn Neujahr).

## Features
- Login (Supabase Auth)
- Dashboard mit KPIs (Umsatz, offene Beträge, Rechnungen, Kunden)
- Kunden- und Leistungskatalog-Verwaltung
- Rechnungserstellung mit Positionen, automatischer Berechnung und Nummernvergabe
- **Markentreues PDF** (Navy/Gold, Plus Jakarta Sans, Logo) via jsPDF
- Einstellungen für Firmen-, Steuer- und Bankdaten

## Setup
```bash
npm install
npm run dev
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Deployment
Vercel (Framework: Next.js). Env-Variablen sind in `vercel.json` hinterlegt.
