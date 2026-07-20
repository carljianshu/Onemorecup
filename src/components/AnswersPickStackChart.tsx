"use client";

import { useMemo, type CSSProperties } from "react";
import { useLocale } from "@/context/LocaleContext";
import {
  formatAnalyticsMarketLabel,
  formatMarketMatchup,
  translateMarketCandidate,
  translateMarketName
} from "@/i18n";
import {
  computePage1PickDistribution,
  computePage2PickDistribution,
  computePage3PickDistribution,
  type AnalyticsPage,
  type Page1PickDistributionRow,
  type PickDistributionOption
} from "@/lib/answers-analytics";
import type { GameConfig, Market, Pick } from "@/types";

/** 柱状图轨道按满员计分位设计（约 35 人规模，含少量 Double）。 */
export const PAGE1_PICK_CHART_MAX_SLOTS = 35;

/** 每个计分位在图上的固定宽度（px）。 */
const SLOT_UNIT_PX = 10;

const HOT_SEGMENT_COLOR = "rgba(251, 146, 60, 0.95)";
const COLD_SEGMENT_COLOR = "rgba(56, 189, 248, 0.95)";

function formatPercent(value: number, total: number): string {
  if (total === 0)
    return "0%";
  return `${((100 * value) / total).toFixed(0)}%`;
}

function isMultiOptionRow(row: Page1PickDistributionRow): boolean {
  return Boolean(row.isMultiOption && row.options && row.options.length > 2);
}

function optionSegmentStyle(index: number, count: number): CSSProperties {
  if (count <= 1)
    return { background: HOT_SEGMENT_COLOR };
  const ratio = index / (count - 1);
  return {
    background: `color-mix(in srgb, ${HOT_SEGMENT_COLOR} ${Math.round((1 - ratio) * 100)}%, ${COLD_SEGMENT_COLOR})`
  };
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

function multiOptionSegmentClass(team: string, winner: string | null): string {
  const base = "answers-pick-stack-segment answers-pick-stack-segment-multi";
  if (winner === null)
    return base;
  if (team === winner)
    return `${base} answers-pick-stack-segment-winner`;
  return `${base} answers-pick-stack-segment-settled-loser`;
}

function optionLabelColor(index: number, count: number): CSSProperties {
  if (count <= 1)
    return { color: "rgba(251, 191, 140, 0.95)" };
  const ratio = index / (count - 1);
  return {
    color: `color-mix(in srgb, rgba(251, 191, 140, 0.95) ${Math.round((1 - ratio) * 100)}%, rgba(125, 211, 252, 0.95))`
  };
}

function formatMultiOptionAria(
  row: Page1PickDistributionRow,
  options: PickDistributionOption[],
  locale: "zh" | "en",
  t: ReturnType<typeof useLocale>["t"]
): string {
  const detail = options
    .map((option) => {
      const team = translateMarketCandidate(locale, option.team);
      return t("answers.analyticsPickChartOptionAria", {
        team,
        slots: option.slots
      });
    })
    .join(locale === "zh" ? "；" : "; ");
  const marketLabel = formatAnalyticsMarketLabel(locale, row.marketId) ?? row.marketId.toUpperCase();
  return t("answers.analyticsPickChartMultiBarAria", {
    market: marketLabel,
    detail
  });
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
          const multiOption = isMultiOptionRow(row);
          const options = row.options ?? [];
          const hotLabel = translateMarketCandidate(locale, row.hotTeam);
          const coldLabel = translateMarketCandidate(locale, row.coldTeam);
          const roundLabel = formatAnalyticsMarketLabel(locale, row.marketId);
          const matchupLabel = roundLabel
            ? null
            : multiOption && row.marketName
              ? translateMarketName(locale, row.marketName)
              : formatMarketMatchup(locale, row.teamA, row.teamB);
          const marketLabel = roundLabel ?? row.marketId.toUpperCase();

          return (
            <li key={row.marketId} className="answers-pick-stack-row">
              <div className="answers-pick-stack-row-label">
                <span className="answers-pick-stack-market-id">
                  {marketLabel}
                </span>
                {matchupLabel ? (
                  <span className="answers-pick-stack-matchup">
                    {matchupLabel}
                  </span>
                ) : null}
              </div>
              <div className="answers-pick-stack-row-track">
                <div
                  className="answers-pick-stack-bar"
                  style={{ width: `${row.totalSlots * SLOT_UNIT_PX}px` }}
                  role="img"
                  aria-label={multiOption
                    ? formatMultiOptionAria(row, options, locale, t)
                    : t("answers.analyticsPickChartBarAria", {
                      market: marketLabel,
                      hotTeam: hotLabel,
                      hotSlots: row.hotSlots,
                      coldTeam: coldLabel,
                      coldSlots: row.coldSlots
                    })}
                >
                  {multiOption ? (
                    options.map((option, index) => option.slots > 0 ? (
                      <span
                        key={option.team}
                        className={multiOptionSegmentClass(option.team, row.winner)}
                        style={{
                          width: `${option.slots * SLOT_UNIT_PX}px`,
                          ...optionSegmentStyle(index, options.length)
                        }}
                        data-slots={option.slots}
                        title={`${translateMarketCandidate(locale, option.team)} ${option.slots}`}
                      >
                        {option.slots}
                      </span>
                    ) : null)
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              <div className={`answers-pick-stack-row-counts${multiOption ? " answers-pick-stack-row-counts-multi" : ""}`}>
                {multiOption ? (
                  options.map((option, index) => (
                    <span
                      key={option.team}
                      className="answers-pick-stack-count-option"
                      style={optionLabelColor(index, options.length)}
                    >
                      {translateMarketCandidate(locale, option.team)} {option.slots}
                      <span className="answers-pick-stack-count-pct">
                        ({formatPercent(option.slots, row.totalSlots)})
                      </span>
                    </span>
                  ))
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
