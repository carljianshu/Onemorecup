"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  isAdminAuthed,
  setAdminSession,
  clearAdminAuthed
} from "@/lib/admin-auth";
import { adminLogin } from "@/lib/api-client";

export function AdminGate({ children }: { children: ReactNode }) {
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
      setError("密码错误，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (!checked) {
    return (
      <main className="container">
        <p>加载中…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="container">
        <nav className="nav-bar">
          <Link href="/">← 返回首页</Link>
        </nav>
        <section className="card admin-login-card">
          <h1 style={{ marginTop: 0 }}>管理员验证</h1>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>请输入管理员密码以继续。</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="admin-password">密码</label>
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
              {submitting ? "验证中…" : "进入管理"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
