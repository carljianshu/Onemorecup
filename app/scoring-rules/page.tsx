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

        <section className="scoring-rules-section">
          <h2 className="scoring-rules-heading">{t("scoringRules.s5Title")}</h2>
          <div className="scoring-rules-examples">
            <div className="scoring-rules-example">
              <h3>{t("scoringRules.s5Ex1Title")}</h3>
              <p>{t("scoringRules.s5Ex1Body")}</p>
            </div>
            <div className="scoring-rules-example">
              <h3>{t("scoringRules.s5Ex2Title")}</h3>
              <p>{t("scoringRules.s5Ex2Body")}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
