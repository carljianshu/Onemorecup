import { formatTimelineMatchupLabel } from "@/lib/fifa-codes";
import type { EarningsTimelineData } from "@/lib/earnings-timeline";

export const TIMELINE_SERIES_COLORS = [
  "#fb923c",
  "#38bdf8",
  "#4ade80",
  "#f472b6",
  "#a78bfa",
  "#facc15",
  "#2dd4bf",
  "#f87171",
  "#818cf8",
  "#fb7185",
  "#34d399",
  "#c084fc",
  "#e879f9"
] as const;

export const TIMELINE_CHART_WIDTH = 920;
export const TIMELINE_CHART_HEIGHT = 420;
export const TIMELINE_PAD_LEFT = 52;
export const TIMELINE_PAD_RIGHT = 16;
export const TIMELINE_PAD_TOP = 20;
export const TIMELINE_PAD_BOTTOM = 88;

export function timelineSeriesColor(index: number): string {
  return TIMELINE_SERIES_COLORS[index % TIMELINE_SERIES_COLORS.length]!;
}

export function timelineStepLabel(
  locale: "zh" | "en",
  step: EarningsTimelineData["steps"][number],
  startLabel: string
): string {
  if (step.labelKey === "start")
    return startLabel;
  if (step.teamA && step.teamB)
    return formatTimelineMatchupLabel(locale, step.teamA, step.teamB);
  return step.marketId ?? "";
}

export function roundTimelineTick(value: number): number {
  return Math.round(value * 100) / 100;
}
