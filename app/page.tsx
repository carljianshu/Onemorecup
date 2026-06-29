"use client";

import Link from "next/link";
import { PublicFeatureLinks } from "@/components/PublicFeatureLinks";
import { useLocale } from "@/context/LocaleContext";
import { homeRuleValues } from "@/i18n";

export default function HomePage() {
  const { t } = useLocale();
  const rules = homeRuleValues();

  return (
    <main className="container">
      <section className="hero">
        <h1>{t("home.title")}</h1>
        <p>{t("home.subtitle")}</p>
      </section>

      <section className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>{t("home.rulesTitle")}</h2>
        <ul className="rules-list">
          <li>
            {t("home.rule3")}{" "}
            <Link className="btn btn-sm rules-tab-link rules-inline-link" href="/scoring-rules">
              {t("scoringRules.linkLabel")}
            </Link>
            {t("scoringRules.suffix")}
          </li>
          <li>{t("home.rule2", rules)}</li>
          <li>{t("home.rule4")}</li>
          <li>{t("home.rule5")}</li>
        </ul>

        <div className="actions">
          <Link className="btn btn-primary" href="/play">
            {t("common.play")}
          </Link>
          <PublicFeatureLinks />
        </div>
        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/admin" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {t("common.adminEntry")}
          </Link>
        </p>
      </section>
    </main>
  );
}
