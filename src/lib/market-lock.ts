import { DOUBLE_STAKE } from "@/data/markets";
import { formatPageDeadlineDisplay } from "@/lib/page-lock";
import type { Market, Pick, PlayerPickInput, PlayPage } from "@/types";

/** 单题竞猜截止时间（UTC ISO）。 */
export const MARKET_LOCKS_AT: Record<string, string> = {
  "m1-9": "2026-06-28T19:00:00.000Z"
};

export function marketLocksAt(marketId: string): string | null {
  return MARKET_LOCKS_AT[marketId] ?? null;
}

export function isMarketLocked(marketId: string, now = Date.now()): boolean {
  const at = marketLocksAt(marketId);
  if (!at) return false;
  return now >= new Date(at).getTime();
}

export function formatMarketLockDeadlineDisplay(
  marketId: string,
  locale: "zh" | "en"
): string | null {
  return formatPageDeadlineDisplay(marketLocksAt(marketId), locale);
}

/** 保存时：已锁定的题目强制保留原竞猜，禁止新增或修改。 */
export function applyLockedMarketPickPreservation(
  page: PlayPage,
  pagePickInputs: PlayerPickInput[],
  markets: Market[],
  playerId: string | null,
  picks: Pick[]
): PlayerPickInput[] {
  const lockedIds = new Set(
    markets.filter((m) => m.page === page && isMarketLocked(m.id)).map((m) => m.id)
  );
  if (lockedIds.size === 0) return pagePickInputs;

  const preserved = pagePickInputs.filter((input) => !lockedIds.has(input.marketId));

  for (const marketId of lockedIds) {
    if (!playerId) continue;
    const existing = picks.find((p) => p.playerId === playerId && p.marketId === marketId);
    if (existing) {
      preserved.push({
        marketId,
        team: existing.team,
        double: existing.stake === DOUBLE_STAKE
      });
    }
  }

  return preserved;
}
