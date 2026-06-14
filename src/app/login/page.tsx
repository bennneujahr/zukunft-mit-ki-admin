"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-white">
            Zukunft <span className="text-gold">mit KI</span>
          </div>
          <p className="text-sm text-slate-400 mt-2">Rechnungsverwaltung</p>
        </div>
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">E-Mail</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="benn.neujahr@zukunft-mit-ki.com"
            />
          </div>
          <div>
            <label className="label">Passwort</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button type="submit" className="btn-gold w-full" disabled={loading}>
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
