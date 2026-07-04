import { formatTimelineMatchupLabel } from "@/lib/fifa-codes";
import type { EarningsTimelineData } from "@/lib/earnings-timeline";

/** 深色背景折线图：色相均匀分布，避免粉/紫/青绿扎堆。 */
export const TIMELINE_SERIES_COLORS = [
  "#FF5C5C", // red
  "#FF9F1C", // orange
  "#FFEA00", // yellow
  "#8FD14F", // yellow-green
  "#2ECC71", // green
  "#1DD3B0", // teal
  "#00C2FF", // cyan
  "#4F8CFF", // blue
  "#7B61FF", // indigo
  "#B44CFF", // purple
  "#FF4FD8", // magenta
  "#FF6B9D", // pink
  "#FF7A45" // coral
] as const;

export const TIMELINE_SERIES_STROKE_WIDTH = 2.75;

export const TIMELINE_CHART_WIDTH = 920;
export const TIMELINE_CHART_HEIGHT = 420;
export const TIMELINE_PAD_LEFT = 52;
export const TIMELINE_PAD_RIGHT = 48;
export const TIMELINE_PAD_TOP = 20;
export const TIMELINE_PAD_BOTTOM = 88;
export const TIMELINE_MIN_STEP_PX = 76;

/** 按结算场次数放宽 SVG 宽度，避免 x 轴标签被裁切。 */
export function timelineChartWidth(stepCount: number): number {
  if (stepCount <= 1)
    return TIMELINE_CHART_WIDTH;
  const plotWidth = (stepCount - 1) * TIMELINE_MIN_STEP_PX;
  return Math.max(TIMELINE_CHART_WIDTH, TIMELINE_PAD_LEFT + TIMELINE_PAD_RIGHT + plotWidth);
}

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
