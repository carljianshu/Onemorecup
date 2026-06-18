"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

const EXAMPLE_KEYS = [
  "scoringRules.formulaEx1",
  "scoringRules.formulaEx2",
  "scoringRules.formulaEx3",
  "scoringRules.formulaEx4",
  "scoringRules.formulaEx5"
] as const;

export default function ScoringRulesPage() {
  const { t } = useLocale();

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("scoringRules.title")}</h1>

      <div className="card scoring-rules-card">
        <p className="scoring-rules-formula-expr">{t("scoringRules.formula")}</p>
        <p className="scoring-rules-formula-sub">{t("scoringRules.formulaAdjustment")}</p>
        <p className="scoring-rules-formula-note">{t("scoringRules.formulaNote")}</p>
        <p className="scoring-rules-formula-note">{t("scoringRules.formulaSigmaNote")}</p>

        <section className="scoring-rules-examples-block">
          <h2 className="scoring-rules-examples-heading">{t("scoringRules.examplesTitle")}</h2>
          <ul className="rules-list scoring-rules-examples-list">
            {EXAMPLE_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
