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
  showRank = false
}: {
  players: TimelineViewPlayer[];
  showRank?: boolean;
}) {
  const sorted = sortTimelineLegendPlayers(players);

  return (
    <aside className="answers-timeline-chart-legend" aria-label="Chart legend">
      <ol className="answers-timeline-chart-legend-list">
        {sorted.map((player) => (
          <li key={player.playerId} className="answers-timeline-chart-legend-item">
            <span
              className="answers-earnings-timeline-swatch"
              style={{ background: timelineSeriesColor(player.colorIndex) }}
            />
            <span className="answers-timeline-chart-legend-name">{player.playerName}</span>
            <span className="answers-timeline-chart-legend-value">
              {showRank ? `#${player.finalRank}` : formatScorePlain(player.finalNet)}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
