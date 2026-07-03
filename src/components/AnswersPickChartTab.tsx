"use client";

import { useMemo } from "react";
import { AnswersPickStackChart } from "@/components/AnswersPickStackChart";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import { computePage1PickDistribution } from "@/lib/answers-analytics";

export function AnswersPickChartTab() {
  const { players, markets, picks } = useGame();
  const { t } = useLocale();
  const rows = useMemo(
    () => computePage1PickDistribution(markets, picks),
    [markets, picks]
  );

  if (players.length === 0 || rows.length === 0) {
    return (
      <div className="card answers-analytics-card">
        <p className="answers-analytics-placeholder">{t("answers.analyticsPopularEmpty")}</p>
      </div>
    );
  }

  return (
    <section className="card answers-analytics-section answers-analytics-chart-section answers-pick-chart-section">
      <AnswersPickStackChart markets={markets} picks={picks} />
    </section>
  );
}
