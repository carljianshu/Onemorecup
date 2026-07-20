"use client";

import { formatScorePlain } from "@/lib/score-format";
import { timelineSeriesColor } from "@/components/answers-timeline-chart-shared";
import type { TimelineViewPlayer } from "@/components/AnswersTimelineViewPicker";

export function sortTimelineLegendPlayers(
  players: TimelineViewPlayer[]
): TimelineViewPlayer[] {
  return [...players].sort(
    (a, b) =>
      b.finalNet - a.finalNet ||
      a.playerName.localeCompare(b.playerName, "zh-CN")
  );
}

export function AnswersTimelineChartLegend({
  players,
  showRank = false,
  highlightedPlayerId = null,
  lockedPlayerId = null,
  hoverEnabled = true,
  onPreviewPlayerId,
  onClearPreview,
  onToggleLock
}: {
  players: TimelineViewPlayer[];
  showRank?: boolean;
  highlightedPlayerId?: string | null;
  lockedPlayerId?: string | null;
  hoverEnabled?: boolean;
  onPreviewPlayerId?: (playerId: string) => void;
  onClearPreview?: () => void;
  onToggleLock?: (playerId: string) => void;
}) {
  const sorted = sortTimelineLegendPlayers(players);
  const interactive = Boolean(onToggleLock);

  return (
    <aside className="answers-timeline-chart-legend" aria-label="Chart legend">
      <ol className="answers-timeline-chart-legend-list">
        {sorted.map((player) => {
          const isHighlighted = highlightedPlayerId === player.playerId;
          const isLocked = lockedPlayerId === player.playerId;
          const isDimmed = highlightedPlayerId != null && !isHighlighted;
          return (
            <li
              key={player.playerId}
              className={[
                "answers-timeline-chart-legend-item",
                interactive ? "answers-timeline-chart-legend-item-interactive" : "",
                isDimmed ? "answers-timeline-chart-legend-item-dimmed" : "",
                isHighlighted ? "answers-timeline-chart-legend-item-highlighted" : "",
                isLocked ? "answers-timeline-chart-legend-item-locked" : ""
              ].filter(Boolean).join(" ")}
              onMouseEnter={
                hoverEnabled && onPreviewPlayerId
                  ? () => onPreviewPlayerId(player.playerId)
                  : undefined
              }
              onMouseLeave={hoverEnabled ? onClearPreview : undefined}
              onClick={
                onToggleLock
                  ? () => onToggleLock(player.playerId)
                  : undefined
              }
              onKeyDown={
                onToggleLock
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onToggleLock(player.playerId);
                      }
                    }
                  : undefined
              }
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-pressed={interactive ? isLocked : undefined}
            >
              <span
                className="answers-earnings-timeline-swatch"
                style={{ background: timelineSeriesColor(player.colorIndex) }}
              />
              <span className="answers-timeline-chart-legend-name">{player.playerName}</span>
              <span className="answers-timeline-chart-legend-value">
                {showRank ? `#${player.finalRank}` : formatScorePlain(player.finalNet)}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
