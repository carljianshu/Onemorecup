"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

export default function ScoringRulesPage() {
  const { t } = useLocale();

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("scoringRules.title")}</h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>{t("scoringRules.placeholder")}</p>
      </div>
    </main>
  );
}
