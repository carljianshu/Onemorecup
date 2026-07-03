"use client";

import { useLocale } from "@/context/LocaleContext";
import type { TimelinePlayerViewMode } from "@/lib/timeline-player-views";

export interface TimelineViewPlayer {
  playerId: string;
  playerName: string;
  finalNet: number;
  finalRank: number;
  colorIndex: number;
}

export function AnswersTimelineViewPicker({
  mode,
  onChange
}: {
  mode: TimelinePlayerViewMode;
  onChange: (mode: TimelinePlayerViewMode) => void;
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
    </div>
  );
}
