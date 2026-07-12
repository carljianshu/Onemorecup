"use client";

import {
  TIMELINE_SERIES_HIGHLIGHT_STROKE_WIDTH,
  TIMELINE_SERIES_HIT_STROKE_WIDTH,
  TIMELINE_SERIES_STROKE_WIDTH,
  timelineSeriesColor
} from "@/components/answers-timeline-chart-shared";

export interface TimelineSeriesLine {
  playerId: string;
  points: string;
  colorIndex: number;
}

export function AnswersTimelineSeriesLines({
  lines,
  hoveredPlayerId,
  onHoverPlayerId
}: {
  lines: TimelineSeriesLine[];
  hoveredPlayerId: string | null;
  onHoverPlayerId: (playerId: string | null) => void;
}) {
  return (
    <>
      {lines.map((line) => {
        const color = timelineSeriesColor(line.colorIndex);
        const isHovered = hoveredPlayerId === line.playerId;
        const isDimmed = hoveredPlayerId != null && !isHovered;
        return (
          <g
            key={line.playerId}
            className={
              isDimmed
                ? "answers-timeline-series-dimmed"
                : isHovered
                  ? "answers-timeline-series-highlighted"
                  : undefined
            }
            onMouseEnter={() => onHoverPlayerId(line.playerId)}
            onMouseLeave={() => onHoverPlayerId(null)}
          >
            <polyline
              points={line.points}
              fill="none"
              stroke="transparent"
              strokeWidth={TIMELINE_SERIES_HIT_STROKE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="stroke"
            />
            <polyline
              points={line.points}
              fill="none"
              stroke={color}
              strokeWidth={
                isHovered
                  ? TIMELINE_SERIES_HIGHLIGHT_STROKE_WIDTH
                  : TIMELINE_SERIES_STROKE_WIDTH
              }
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
          </g>
        );
      })}
    </>
  );
}
