"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  {
    href: "/invoices",
    label: "Rechnungen",
    icon: "M7 3h10a2 2 0 012 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 012-2z",
  },
  {
    href: "/clients",
    label: "Kunden",
    icon: "M17 20h5v-1a4 4 0 00-4-4M9 11a4 4 0 100-8 4 4 0 000 8zm0 0a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z",
  },
  {
    href: "/services",
    label: "Leistungen",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    href: "/settings",
    label: "Einstellungen",
    icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1l-.4-2.5H9.2L8.8 4a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.4 2.5h5.6l.4-2.5a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z",
  },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-navy text-slate-300 transform transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 h-16 border-b border-white/10">
          <span className="text-lg font-extrabold text-white">
            Zukunft <span className="text-gold">mit KI</span>
          </span>
        </div>
        <nav className="p-4 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive(n.href)
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d={n.icon} />
              </svg>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M15 12H3m0 0l4-4m-4 4l4 4M19 4v16" />
            </svg>
            Abmelden
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center gap-3 h-16 px-4 lg:px-8 bg-white border-b border-line lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 text-ink"
            aria-label="Menü"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-extrabold text-navy">
            Zukunft <span className="text-gold">mit KI</span>
          </span>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
