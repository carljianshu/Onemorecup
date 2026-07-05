"use client";

import { useMemo } from "react";
import { AnswersPickStackChart } from "@/components/AnswersPickStackChart";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import {
  computePage1PickDistribution,
  computePage2PickDistribution
} from "@/lib/answers-analytics";
import type { Market, Pick } from "@/types";

function PickChartSection({
  page,
  markets,
  picks,
  emptyKey
}: {
  page: 1 | 2;
  markets: Market[];
  picks: Pick[];
  emptyKey: "answers.analyticsPopularEmpty" | "answers.analyticsPopularEmptyPage2";
}) {
  const { t } = useLocale();
  const rows = useMemo(
    () => (page === 2
      ? computePage2PickDistribution(markets, picks)
      : computePage1PickDistribution(markets, picks)),
    [markets, picks, page]
  );

  if (rows.length === 0) {
    return (
      <section className="card answers-analytics-section answers-analytics-chart-section answers-pick-chart-section">
        <p className="answers-analytics-placeholder">{t(emptyKey)}</p>
      </section>
    );
  }

  return (
    <section className="card answers-analytics-section answers-analytics-chart-section answers-pick-chart-section">
      <AnswersPickStackChart markets={markets} picks={picks} page={page} />
    </section>
  );
}

export function AnswersPickChartTab() {
  const { players, markets, picks } = useGame();
  const { t } = useLocale();

  if (players.length === 0) {
    return (
      <div className="card answers-analytics-card">
        <p className="answers-analytics-placeholder">{t("answers.analyticsPopularEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="answers-analytics-stack">
      <PickChartSection
        page={1}
        markets={markets}
        picks={picks}
        emptyKey="answers.analyticsPopularEmpty"
      />
      <PickChartSection
        page={2}
        markets={markets}
        picks={picks}
        emptyKey="answers.analyticsPopularEmptyPage2"
      />
    </div>
  );
}
