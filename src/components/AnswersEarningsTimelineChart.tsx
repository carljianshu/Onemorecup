"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { formatScorePlain } from "@/lib/score-format";
import type { EarningsTimelineData } from "@/lib/earnings-timeline";
import {
  roundTimelineTick,
  TIMELINE_CHART_HEIGHT,
  TIMELINE_PAD_BOTTOM,
  TIMELINE_PAD_LEFT,
  TIMELINE_PAD_RIGHT,
  TIMELINE_PAD_TOP,
  timelineChartWidth,
  timelineStepLabel
} from "@/components/answers-timeline-chart-shared";
import { AnswersTimelineChartLegend } from "@/components/AnswersTimelineChartLegend";
import { AnswersTimelineSeriesLines } from "@/components/AnswersTimelineSeriesLines";
import { useTimelineChartHighlight } from "@/components/use-timeline-chart-highlight";
import type { TimelineViewPlayer } from "@/components/AnswersTimelineViewPicker";

export function AnswersEarningsTimelineChart({
  timeline,
  selectedPlayerIds,
  colorIndexByPlayerId,
  legendPlayers
}: {
  timeline: EarningsTimelineData;
  selectedPlayerIds: Set<string>;
  colorIndexByPlayerId: Map<string, number>;
  legendPlayers: TimelineViewPlayer[];
}) {
  const { locale, t } = useLocale();
  const {
    scrollRef,
    scrollPaused,
    lockedPlayerId,
    highlightedPlayerId,
    toggleLock,
    requestPreview,
    clearPreview
  } = useTimelineChartHighlight();

  const hoverEnabled = !scrollPaused && lockedPlayerId == null;

  const visibleSeries = useMemo(
    () =>
      timeline.series.filter((row) => selectedPlayerIds.has(row.playerId)),
    [timeline.series, selectedPlayerIds]
  );

  const stepCount = timeline.steps.length;
  const chartWidth = timelineChartWidth(stepCount);
  const allValues = visibleSeries.flatMap((row) =>
    row.values.slice(0, row.lastStepIndex + 1)
  );
  const minY = stepCount <= 1 || visibleSeries.length === 0 ? 0 : Math.min(0, ...allValues);
  const maxY = stepCount <= 1 || visibleSeries.length === 0 ? 0 : Math.max(0, ...allValues);
  const ySpan = maxY - minY || 1;

  const yTicks = (() => {
    if (stepCount <= 1 || visibleSeries.length === 0)
      return [0];
    const ticks: number[] = [];
    const step = ySpan <= 20 ? 5 : ySpan <= 60 ? 10 : 20;
    const start = Math.floor(minY / step) * step;
    for (let value = start; value <= maxY + 0.001; value += step) {
      ticks.push(roundTimelineTick(value));
    }
    if (!ticks.includes(0) && minY < 0 && maxY > 0)
      ticks.push(0);
    return [...new Set(ticks)].sort((a, b) => a - b);
  })();

  if (stepCount <= 1) {
    return (
      <p className="answers-analytics-placeholder">
        {t("answers.analyticsEarningsTimelineEmpty")}
      </p>
    );
  }

  const plotWidth = chartWidth - TIMELINE_PAD_LEFT - TIMELINE_PAD_RIGHT;
  const plotHeight = TIMELINE_CHART_HEIGHT - TIMELINE_PAD_TOP - TIMELINE_PAD_BOTTOM;

  const xAt = (index: number) =>
    TIMELINE_PAD_LEFT + (stepCount <= 1 ? 0 : (index / (stepCount - 1)) * plotWidth);
  const yAt = (value: number) =>
    TIMELINE_PAD_TOP + ((maxY - value) / ySpan) * plotHeight;

  const seriesLines = visibleSeries.map((row) => ({
    playerId: row.playerId,
    colorIndex: colorIndexByPlayerId.get(row.playerId) ?? 0,
    points: row.values
      .slice(0, row.lastStepIndex + 1)
      .map((value, index) => `${xAt(index)},${yAt(value)}`)
      .join(" ")
  }));

  return (
    <div className="answers-earnings-timeline">
      <div className="answers-earnings-timeline-header">
        <h3 className="answers-earnings-timeline-title">
          {t("answers.analyticsEarningsTimelineTitle")}
        </h3>
        <p className="answers-earnings-timeline-note">
          {t("answers.analyticsEarningsTimelineNote")}
        </p>
        <p className="answers-earnings-timeline-highlight-hint">
          {t("answers.analyticsTimelineHighlightHint")}
        </p>
      </div>

      {visibleSeries.length === 0 ? (
        <p className="answers-analytics-placeholder">
          {t("answers.analyticsTimelinePlayerPickerEmpty")}
        </p>
      ) : (
        <div className="answers-timeline-chart-row">
          <div
            ref={scrollRef}
            className="answers-earnings-timeline-chart-wrap"
            onMouseLeave={clearPreview}
          >
            <svg
            className="answers-earnings-timeline-chart"
            viewBox={`0 0 ${chartWidth} ${TIMELINE_CHART_HEIGHT}`}
            style={{ minWidth: chartWidth }}
            role="img"
            aria-label={t("answers.analyticsEarningsTimelineTitle")}
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
                  {formatScorePlain(tick)}
                </text>
              </g>
            ))}

            {minY < 0 && maxY > 0 ? (
              <line
                x1={TIMELINE_PAD_LEFT}
                x2={chartWidth - TIMELINE_PAD_RIGHT}
                y1={yAt(0)}
                y2={yAt(0)}
                className="answers-earnings-timeline-zero"
              />
            ) : null}

            <AnswersTimelineSeriesLines
              lines={seriesLines}
              highlightedPlayerId={highlightedPlayerId}
              lockedPlayerId={lockedPlayerId}
              hoverEnabled={hoverEnabled}
              onPreviewPlayerId={requestPreview}
              onClearPreview={clearPreview}
              onToggleLock={toggleLock}
            />

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
          <AnswersTimelineChartLegend
            players={legendPlayers}
            highlightedPlayerId={highlightedPlayerId}
            lockedPlayerId={lockedPlayerId}
            hoverEnabled={hoverEnabled}
            onPreviewPlayerId={requestPreview}
            onClearPreview={clearPreview}
            onToggleLock={toggleLock}
          />
        </div>
      )}
    </div>
  );
}
