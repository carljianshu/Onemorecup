"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  isAdminAuthed,
  setAdminSession,
} from "@/lib/admin-auth";
import { adminLogin } from "@/lib/api-client";
import { useLocale } from "@/context/LocaleContext";

export function AdminGate({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAuthed(isAdminAuthed());
    setChecked(true);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token, expiresAt } = await adminLogin(password);
      setAdminSession(token, expiresAt);
      setAuthed(true);
      setPassword("");
    } catch {
      setError(t("adminGate.wrongPassword"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!checked) {
    return (
      <main className="container">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="container">
        <nav className="nav-bar">
          <Link href="/">{t("common.backHome")}</Link>
        </nav>
        <section className="card admin-login-card">
          <h1 style={{ marginTop: 0 }}>{t("adminGate.title")}</h1>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>{t("adminGate.desc")}</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="admin-password">{t("adminGate.password")}</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
            </div>
            {error && <div className="message error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t("adminGate.verifying") : t("adminGate.enter")}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
