"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { computeRankingTimeline } from "@/lib/earnings-timeline";
import {
  TIMELINE_CHART_HEIGHT,
  TIMELINE_PAD_BOTTOM,
  TIMELINE_PAD_LEFT,
  TIMELINE_PAD_RIGHT,
  TIMELINE_PAD_TOP,
  timelineChartWidth,
  timelineSeriesColor,
  timelineStepLabel,
  TIMELINE_SERIES_STROKE_WIDTH
} from "@/components/answers-timeline-chart-shared";
import { AnswersTimelineChartLegend } from "@/components/AnswersTimelineChartLegend";
import type { TimelineViewPlayer } from "@/components/AnswersTimelineViewPicker";
import type { Market, Pick, Player } from "@/types";

function formatRank(rank: number): string {
  return `#${rank}`;
}

export function AnswersRankingTimelineChart({
  players,
  markets,
  picks,
  selectedPlayerIds,
  colorIndexByPlayerId,
  legendPlayers
}: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
  selectedPlayerIds: Set<string>;
  colorIndexByPlayerId: Map<string, number>;
  legendPlayers: TimelineViewPlayer[];
}) {
  const { locale, t } = useLocale();
  const timeline = useMemo(
    () => computeRankingTimeline(players, markets, picks),
    [players, markets, picks]
  );

  const visibleSeries = useMemo(
    () =>
      timeline.series.filter((row) => selectedPlayerIds.has(row.playerId)),
    [timeline.series, selectedPlayerIds]
  );

  const stepCount = timeline.steps.length;
  const chartWidth = timelineChartWidth(stepCount);
  const maxRank = timeline.playerCount;
  const minRank = 1;

  if (stepCount <= 1) {
    return (
      <p className="answers-analytics-placeholder">
        {t("answers.analyticsEarningsTimelineEmpty")}
      </p>
    );
  }

  const yTicks = (() => {
    const ticks: number[] = [];
    const step = maxRank <= 12 ? 1 : maxRank <= 24 ? 2 : 5;
    for (let rank = minRank; rank <= maxRank; rank += step) {
      ticks.push(rank);
    }
    if (!ticks.includes(maxRank))
      ticks.push(maxRank);
    return ticks;
  })();

  const plotWidth = chartWidth - TIMELINE_PAD_LEFT - TIMELINE_PAD_RIGHT;
  const plotHeight = TIMELINE_CHART_HEIGHT - TIMELINE_PAD_TOP - TIMELINE_PAD_BOTTOM;
  const rankSpan = maxRank - minRank || 1;

  const xAt = (index: number) =>
    TIMELINE_PAD_LEFT + (stepCount <= 1 ? 0 : (index / (stepCount - 1)) * plotWidth);
  const yAt = (rank: number) =>
    TIMELINE_PAD_TOP + ((rank - minRank) / rankSpan) * plotHeight;

  return (
    <div className="answers-earnings-timeline">
      <div className="answers-earnings-timeline-header">
        <h3 className="answers-earnings-timeline-title">
          {t("answers.analyticsRankingTimelineTitle")}
        </h3>
        <p className="answers-earnings-timeline-note">
          {t("answers.analyticsRankingTimelineNote")}
        </p>
      </div>

      {visibleSeries.length === 0 ? (
        <p className="answers-analytics-placeholder">
          {t("answers.analyticsTimelinePlayerPickerEmpty")}
        </p>
      ) : (
        <div className="answers-timeline-chart-row">
          <div className="answers-earnings-timeline-chart-wrap">
            <svg
            className="answers-earnings-timeline-chart"
            viewBox={`0 0 ${chartWidth} ${TIMELINE_CHART_HEIGHT}`}
            style={{ minWidth: chartWidth }}
            role="img"
            aria-label={t("answers.analyticsRankingTimelineTitle")}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={TIMELINE_PAD_LEFT}
                  x2={chartWidth - TIMELINE_PAD_RIGHT}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  className="answers-earnings-timeline-grid"
                />
                <text
                  x={TIMELINE_PAD_LEFT - 8}
                  y={yAt(tick)}
                  className="answers-earnings-timeline-axis-y"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {formatRank(tick)}
                </text>
              </g>
            ))}

            {visibleSeries.map((row) => {
              const color = timelineSeriesColor(colorIndexByPlayerId.get(row.playerId) ?? 0);
              const points = row.ranks
                .map((rank, index) => `${xAt(index)},${yAt(rank)}`)
                .join(" ");
              return (
                <polyline
                  key={row.playerId}
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={TIMELINE_SERIES_STROKE_WIDTH}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}

            {timeline.steps.map((step, index) => (
              <text
                key={step.stepIndex}
                x={xAt(index)}
                y={TIMELINE_CHART_HEIGHT - 12}
                className="answers-earnings-timeline-axis-x"
                textAnchor="end"
                transform={`rotate(-32 ${xAt(index)} ${TIMELINE_CHART_HEIGHT - 12})`}
              >
                {step.labelKey === "start"
                  ? t("answers.analyticsEarningsTimelineStart")
                  : timelineStepLabel(locale, step, t("answers.analyticsEarningsTimelineStart"))}
              </text>
            ))}
          </svg>
          </div>
          <AnswersTimelineChartLegend players={legendPlayers} showRank />
        </div>
      )}
    </div>
  );
}
