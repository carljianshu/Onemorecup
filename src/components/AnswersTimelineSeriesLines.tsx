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
  highlightedPlayerId,
  lockedPlayerId,
  hoverEnabled,
  onPreviewPlayerId,
  onClearPreview,
  onToggleLock
}: {
  lines: TimelineSeriesLine[];
  highlightedPlayerId: string | null;
  lockedPlayerId: string | null;
  hoverEnabled: boolean;
  onPreviewPlayerId: (playerId: string) => void;
  onClearPreview: () => void;
  onToggleLock: (playerId: string) => void;
}) {
  return (
    <>
      {lines.map((line) => {
        const color = timelineSeriesColor(line.colorIndex);
        const isHighlighted = highlightedPlayerId === line.playerId;
        const isLocked = lockedPlayerId === line.playerId;
        const isDimmed = highlightedPlayerId != null && !isHighlighted;
        return (
          <g
            key={line.playerId}
            className={[
              isDimmed ? "answers-timeline-series-dimmed" : "",
              isHighlighted ? "answers-timeline-series-highlighted" : "",
              isLocked ? "answers-timeline-series-locked" : ""
            ].filter(Boolean).join(" ") || undefined}
            onMouseEnter={
              hoverEnabled ? () => onPreviewPlayerId(line.playerId) : undefined
            }
            onMouseLeave={hoverEnabled ? onClearPreview : undefined}
            onClick={() => onToggleLock(line.playerId)}
            style={{ cursor: "pointer" }}
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
                isHighlighted
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
