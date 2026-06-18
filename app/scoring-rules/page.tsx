"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

function RulesSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="scoring-rules-section">
      <h2 className="scoring-rules-heading">{title}</h2>
      <ul className="rules-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function ScoringRulesPage() {
  const { t } = useLocale();

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("scoringRules.title")}</h1>

      <div className="card scoring-rules-card">
        <p className="scoring-rules-summary">{t("scoringRules.summary")}</p>

        <section className="scoring-rules-formula">
          <h2 className="scoring-rules-heading">{t("scoringRules.formulaTitle")}</h2>
          <p className="scoring-rules-formula-expr">{t("scoringRules.formula")}</p>
          <p className="scoring-rules-formula-sub">{t("scoringRules.formulaAdjustment")}</p>
          <p className="scoring-rules-formula-note">{t("scoringRules.formulaNote")}</p>
          <p className="scoring-rules-formula-note">{t("scoringRules.formulaSigmaNote")}</p>
          <div className="scoring-rules-examples">
            <p className="scoring-rules-example-line">{t("scoringRules.formulaEx1")}</p>
            <p className="scoring-rules-example-line">{t("scoringRules.formulaEx2")}</p>
          </div>
        </section>

        <RulesSection
          title={t("scoringRules.s1Title")}
          items={[t("scoringRules.s1Item1"), t("scoringRules.s1Item2"), t("scoringRules.s1Item3")]}
        />

        <RulesSection
          title={t("scoringRules.s2Title")}
          items={[t("scoringRules.s2Item1"), t("scoringRules.s2Item2"), t("scoringRules.s2Item3")]}
        />

        <RulesSection
          title={t("scoringRules.s3Title")}
          items={[t("scoringRules.s3Item1"), t("scoringRules.s3Item2")]}
        />

        <RulesSection title={t("scoringRules.s4Title")} items={[t("scoringRules.s4Item1")]} />
      </div>
    </main>
  );
}
