"use client";

import { useLocale } from "@/context/LocaleContext";
import { formatScorePlain } from "@/lib/score-format";
import type { TimelinePlayerViewMode } from "@/lib/timeline-player-views";
import { timelineSeriesColor } from "@/components/answers-timeline-chart-shared";

export interface TimelineViewPlayer {
  playerId: string;
  playerName: string;
  finalNet: number;
  finalRank: number;
  colorIndex: number;
}

export function AnswersTimelineViewPicker({
  mode,
  onChange,
  visiblePlayers
}: {
  mode: TimelinePlayerViewMode;
  onChange: (mode: TimelinePlayerViewMode) => void;
  visiblePlayers: TimelineViewPlayer[];
}) {
  const { t } = useLocale();

  return (
    <div className="answers-timeline-view-picker">
      <div
        className="answers-timeline-view-picker-tabs"
        role="tablist"
        aria-label={t("answers.analyticsTimelineViewPickerLabel")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "top10"}
          className={`answers-timeline-view-picker-tab${mode === "top10" ? " answers-timeline-view-picker-tab-active" : ""}`}
          onClick={() => onChange("top10")}
        >
          {t("answers.analyticsTimelineViewTop10")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "boss"}
          className={`answers-timeline-view-picker-tab${mode === "boss" ? " answers-timeline-view-picker-tab-active" : ""}`}
          onClick={() => onChange("boss")}
        >
          {t("answers.analyticsTimelineViewBoss")}
        </button>
      </div>

      <p className="answers-timeline-view-picker-note">
        {mode === "top10"
          ? t("answers.analyticsTimelineViewTop10Note")
          : t("answers.analyticsTimelineViewBossNote")}
      </p>

      {visiblePlayers.length === 0 ? (
        <p className="answers-analytics-placeholder answers-timeline-view-picker-empty">
          {mode === "boss"
            ? t("answers.analyticsTimelineViewBossEmpty")
            : t("answers.analyticsTimelinePlayerPickerEmpty")}
        </p>
      ) : (
        <ul className="answers-timeline-view-picker-list">
          {visiblePlayers.map((player) => (
            <li key={player.playerId}>
              <span
                className="answers-earnings-timeline-swatch"
                style={{ background: timelineSeriesColor(player.colorIndex) }}
              />
              <span className="answers-timeline-view-picker-name">{player.playerName}</span>
              <span className="answers-timeline-view-picker-meta">
                {formatScorePlain(player.finalNet)}
                <span className="answers-timeline-view-picker-rank">#{player.finalRank}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
