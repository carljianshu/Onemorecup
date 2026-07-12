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
  hoveredPlayerId = null,
  onHoverPlayerId
}: {
  players: TimelineViewPlayer[];
  showRank?: boolean;
  hoveredPlayerId?: string | null;
  onHoverPlayerId?: (playerId: string | null) => void;
}) {
  const sorted = sortTimelineLegendPlayers(players);

  return (
    <aside className="answers-timeline-chart-legend" aria-label="Chart legend">
      <ol className="answers-timeline-chart-legend-list">
        {sorted.map((player) => {
          const isHovered = hoveredPlayerId === player.playerId;
          const isDimmed = hoveredPlayerId != null && !isHovered;
          return (
          <li
            key={player.playerId}
            className={[
              "answers-timeline-chart-legend-item",
              onHoverPlayerId ? "answers-timeline-chart-legend-item-interactive" : "",
              isDimmed ? "answers-timeline-chart-legend-item-dimmed" : "",
              isHovered ? "answers-timeline-chart-legend-item-highlighted" : ""
            ].filter(Boolean).join(" ")}
            onMouseEnter={onHoverPlayerId ? () => onHoverPlayerId(player.playerId) : undefined}
            onMouseLeave={onHoverPlayerId ? () => onHoverPlayerId(null) : undefined}
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
