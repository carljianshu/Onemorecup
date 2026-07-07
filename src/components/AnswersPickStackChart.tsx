"use client";

import { useMemo, type CSSProperties } from "react";
import { useLocale } from "@/context/LocaleContext";
import { formatMarketMatchup, translateMarketCandidate } from "@/i18n";
import { computePage1PickDistribution, computePage2PickDistribution, computePage3PickDistribution, type AnalyticsPage } from "@/lib/answers-analytics";
import type { GameConfig, Market, Pick } from "@/types";

/** 柱状图轨道按满员计分位设计（约 35 人规模，含少量 Double）。 */
export const PAGE1_PICK_CHART_MAX_SLOTS = 35;

/** 每个计分位在图上的固定宽度（px）。 */
const SLOT_UNIT_PX = 10;

function formatPercent(value: number, total: number): string {
  if (total === 0)
    return "0%";
  return `${((100 * value) / total).toFixed(0)}%`;
}

function segmentClass(
  side: "hot" | "cold",
  team: string,
  winner: string | null
): string {
  const base =
    side === "hot"
      ? "answers-pick-stack-segment answers-pick-stack-segment-hot"
      : "answers-pick-stack-segment answers-pick-stack-segment-cold";

  if (winner === null)
    return base;
  if (team === winner)
    return `${base} answers-pick-stack-segment-winner`;
  return `${base} answers-pick-stack-segment-settled-loser`;
}

export function AnswersPickStackChart({
  markets,
  picks,
  page = 1,
  config
}: {
  markets: Market[];
  picks: Pick[];
  page?: AnalyticsPage;
  config?: GameConfig | null;
}) {
  const { locale, t } = useLocale();
  const rows = useMemo(
    () => (page === 3
      ? computePage3PickDistribution(markets, picks, config)
      : page === 2
        ? computePage2PickDistribution(markets, picks)
        : computePage1PickDistribution(markets, picks)),
    [markets, picks, page, config]
  );

  const maxSlotsInData = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.totalSlots), 0),
    [rows]
  );

  if (rows.length === 0)
    return null;

  const hasSettled = rows.some((row) => row.winner !== null);
  const trackWidthPx = Math.min(
    PAGE1_PICK_CHART_MAX_SLOTS,
    Math.max(maxSlotsInData, 1)
  ) * SLOT_UNIT_PX;

  return (
    <div
      className="answers-pick-stack-chart"
      style={
        {
          "--pick-chart-track-width": `${trackWidthPx}px`
        } as CSSProperties
      }
    >
      <div className="answers-pick-stack-chart-header">
        <h3 className="answers-pick-stack-chart-title">
          {t(page === 2
            ? "answers.analyticsPickChartTitlePage2"
            : page === 3
              ? "answers.analyticsPickChartTitlePage2"
              : "answers.analyticsPickChartTitle")}
        </h3>
        <p className="answers-pick-stack-chart-note">
          {t("answers.analyticsPickChartNote")}
        </p>
      </div>

      <div className="answers-pick-stack-chart-legend">
        <span className="answers-pick-stack-legend-item">
          <span className="answers-pick-stack-swatch answers-pick-stack-swatch-hot" />
          {t("answers.analyticsPickChartLegendHot")}
        </span>
        <span className="answers-pick-stack-legend-item">
          <span className="answers-pick-stack-swatch answers-pick-stack-swatch-cold" />
          {t("answers.analyticsPickChartLegendCold")}
        </span>
        {hasSettled ? (
          <span className="answers-pick-stack-legend-item">
            <span className="answers-pick-stack-swatch answers-pick-stack-swatch-winner" />
            {t("answers.analyticsPickChartLegendWinner")}
          </span>
        ) : null}
        <span className="answers-pick-stack-legend-axis">
          {t("answers.analyticsPickChartAxis")}
        </span>
      </div>

      <ul className="answers-pick-stack-chart-list">
        {rows.map((row) => {
          const hotLabel = translateMarketCandidate(locale, row.hotTeam);
          const coldLabel = translateMarketCandidate(locale, row.coldTeam);
          const matchupLabel = formatMarketMatchup(locale, row.teamA, row.teamB);

          return (
            <li key={row.marketId} className="answers-pick-stack-row">
              <div className="answers-pick-stack-row-label">
                <span className="answers-pick-stack-market-id">
                  {row.marketId.toUpperCase()}
                </span>
                <span className="answers-pick-stack-matchup">
                  {matchupLabel}
                </span>
              </div>
              <div className="answers-pick-stack-row-track">
                <div
                  className="answers-pick-stack-bar"
                  style={{ width: `${row.totalSlots * SLOT_UNIT_PX}px` }}
                  role="img"
                  aria-label={t("answers.analyticsPickChartBarAria", {
                    market: row.marketId.toUpperCase(),
                    hotTeam: hotLabel,
                    hotSlots: row.hotSlots,
                    coldTeam: coldLabel,
                    coldSlots: row.coldSlots
                  })}
                >
                  {row.hotSlots > 0 ? (
                    <span
                      className={segmentClass("hot", row.hotTeam, row.winner)}
                      style={{ width: `${row.hotSlots * SLOT_UNIT_PX}px` }}
                      data-slots={row.hotSlots}
                      title={`${hotLabel} ${row.hotSlots}`}
                    >
                      {row.hotSlots}
                    </span>
                  ) : null}
                  {row.coldSlots > 0 ? (
                    <span
                      className={segmentClass("cold", row.coldTeam, row.winner)}
                      style={{ width: `${row.coldSlots * SLOT_UNIT_PX}px` }}
                      data-slots={row.coldSlots}
                      title={`${coldLabel} ${row.coldSlots}`}
                    >
                      {row.coldSlots}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="answers-pick-stack-row-counts">
                <span className="answers-pick-stack-count-hot">
                  {hotLabel} {row.hotSlots}
                  <span className="answers-pick-stack-count-pct">
                    ({formatPercent(row.hotSlots, row.totalSlots)})
                  </span>
                </span>
                <span className="answers-pick-stack-count-cold">
                  {coldLabel} {row.coldSlots}
                  <span className="answers-pick-stack-count-pct">
                    ({formatPercent(row.coldSlots, row.totalSlots)})
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
