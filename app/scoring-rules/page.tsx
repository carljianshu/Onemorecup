"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

function RuleBlock({
  title,
  body,
  example
}: {
  title: string;
  body: string;
  example: string;
}) {
  return (
    <section className="scoring-rules-block">
      <h2 className="scoring-rules-block-title">{title}</h2>
      <p className="scoring-rules-body">{body}</p>
      <p className="scoring-rules-example">{example}</p>
    </section>
  );
}

export default function ScoringRulesPage() {
  const { t } = useLocale();

  return (
    <main className="container container-wide scoring-rules-page">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("scoringRules.title")}</h1>

      <div className="card scoring-rules-card">
        <RuleBlock
          title={t("scoringRules.s1Title")}
          body={t("scoringRules.s1Body")}
          example={t("scoringRules.s1Example")}
        />
        <RuleBlock
          title={t("scoringRules.s2Title")}
          body={t("scoringRules.s2Body")}
          example={t("scoringRules.s2Example")}
        />
      </div>
    </main>
  );
}
