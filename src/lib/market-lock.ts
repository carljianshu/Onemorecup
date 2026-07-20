import { DOUBLE_STAKE } from "@/data/markets";
import { isPickTeamValidForMarket } from "@/lib/market-helpers";
import { formatPageDeadlineDisplay } from "@/lib/page-lock";
import type { Market, Pick, PlayerPickInput, PlayPage } from "@/types";

/** 单题已锁且已有合法答案时，禁止修改；无法迁移的旧答案允许重选。 */
export function isMarketPickFrozen(market: Market, existingPick: Pick | undefined): boolean {
    if (!isMarketLocked(market.id))
        return false;
    if (!existingPick)
        return true;
    return isPickTeamValidForMarket(market, existingPick.team);
}

/** 单题竞猜截止时间（UTC ISO）。 */

export const MARKET_LOCKS_AT: Record<string, string> = {
    "m1-1": "2026-06-28T19:00:00.000Z"
};
export function marketLocksAt(marketId: string): string | null {
    return MARKET_LOCKS_AT[marketId] ?? null;
}
export function isMarketLocked(marketId: string, now = Date.now()): boolean {
    const at = marketLocksAt(marketId);
    if (!at)
        return false;
    return now >= new Date(at).getTime();
}
export function formatMarketLockDeadlineDisplay(marketId: string, locale: "zh" | "en", timeZone = "UTC"): string | null {
    return formatPageDeadlineDisplay(marketLocksAt(marketId), locale, timeZone);
}

/** 保存时：已锁定的题目强制保留原竞猜，禁止新增或修改。 */

export function applyLockedMarketPickPreservation(page: PlayPage, pagePickInputs: PlayerPickInput[], markets: Market[], playerId: string | null, picks: Pick[]): PlayerPickInput[] {
    const lockedIds = new Set(markets.filter((m) => m.page === page && isMarketLocked(m.id)).map((m) => m.id));
    if (lockedIds.size === 0)
        return pagePickInputs;
    const preserved = pagePickInputs.filter((input) => !lockedIds.has(input.marketId));
    for (const marketId of lockedIds) {
        if (!playerId)
            continue;
        const market = markets.find((m) => m.id === marketId);
        const existing = picks.find((p) => p.playerId === playerId && p.marketId === marketId);
        if (existing && market && isPickTeamValidForMarket(market, existing.team)) {
            preserved.push({
                marketId,
                team: existing.team,
                double: existing.stake === DOUBLE_STAKE
            });
        }
    }
    return preserved;
}
