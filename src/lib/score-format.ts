/** 所有得分计算与展示统一保留 2 位小数。 */
export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatScore(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const rounded = roundScore(value);
  const text = rounded.toFixed(2);
  if (rounded > 0) return `+${text}`;
  return text;
}
