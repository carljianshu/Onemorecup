/** 所有得分计算与展示统一保留 2 位小数。 */
export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 不带正负号的数值展示（用于 σ、本金等，或自行拼接符号）。 */
export function formatScorePlain(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return roundScore(value).toFixed(2);
}

/** 带符号的得分展示：正数 +x.xx，负数 -x.xx，零 0.00。 */
export function formatSignedScore(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const rounded = roundScore(value);
  const plain = Math.abs(rounded).toFixed(2);
  if (rounded > 0) return `+${plain}`;
  if (rounded < 0) return `-${plain}`;
  return plain;
}

export function formatScore(value: number | undefined | null): string {
  return formatSignedScore(value);
}

/** 扣收益展示：$0.00 或 -$10.00 */
export function formatEarningsDeduction(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || amount <= 0) return "$0.00";
  return `-$${formatScorePlain(amount)}`;
}
