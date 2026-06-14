import { DOUBLE_STAKE, STAKE_PER_PICK } from "@/data/markets";
import { activeSubQuestions, allPickColumns, pickPersonWeight, type PickColumn } from "@/lib/market-helpers";
import type { Market, Pick, Player, PlayPage } from "@/types";

export interface MarketResultPick {
  playerId: string;
  playerName: string;
  isDouble: boolean;
  /** 猜对该选项时的净奖金（已含 Double ×2） */
  payout: number;
}

export interface MarketOptionResult {
  option: string;
  picks: MarketResultPick[];
  /** 猜对该选项时，普通玩家的基础奖金（totalPool ÷ 加权人数 − 10） */
  basePayout: number;
  /** 加权人数：普通 1 人，Double 2 人 */
  weightedCount: number;
  /** 管理员已录入结果且该选项为正确答案 */
  isWinner: boolean;
}

export interface MarketResultSection {
  id: string;
  page: PlayPage;
  title: string;
  options: MarketOptionResult[];
  totalPicks: number;
  /** 本题全部下注之和 */
  totalPool: number;
  /** 已录入的正确答案，未录入则为 null */
  winner: string | null;
}

export function formatPoolAmount(value: number) {
  return value.toFixed(2);
}

function roundPool(value: number) {
  return Math.round(value * 100) / 100;
}

/** 任一侧无人选则各选项均为 0；否则为 奖池 ÷ 加权人数 − 10 */
export function computeOptionBasePayout(totalPool: number, picks: { isDouble: boolean }[]): number {
  if (picks.length === 0) return 0;
  const weightedCount = picks.reduce((sum, pick) => sum + pickPersonWeight(pick.isDouble), 0);
  if (weightedCount === 0) return 0;
  return roundPool(totalPool / weightedCount - STAKE_PER_PICK);
}

export function computePlayerPayout(basePayout: number, isDouble: boolean) {
  return roundPool(basePayout * (isDouble ? 2 : 1));
}

function candidatesForColumn(markets: Market[], col: PickColumn): string[] {
  if (col.page === 1) {
    const market = markets.find((m) => m.id === col.id);
    return market?.candidates ?? [];
  }
  for (const market of markets.filter((m) => m.page === 2)) {
    const sub = activeSubQuestions(market).find((s) => s.id === col.id);
    if (sub) return [...sub.candidates];
  }
  return [];
}

function winnerForColumn(markets: Market[], col: PickColumn): string | null {
  if (col.page === 1) {
    return markets.find((m) => m.id === col.id)?.winner ?? null;
  }
  for (const market of markets.filter((m) => m.page === 2)) {
    const sub = market.subQuestions?.find((s) => s.id === col.id);
    if (sub) return sub.winner;
  }
  return null;
}

export function buildMarketResultSections(
  markets: Market[],
  picks: Pick[],
  players: Player[],
  visiblePages: PlayPage[]
): MarketResultSection[] {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const columns = allPickColumns(markets).filter((col) => visiblePages.includes(col.page));

  return columns.map((col) => {
    const candidates = candidatesForColumn(markets, col);
    const winner = winnerForColumn(markets, col);
    const questionPicks = picks.filter((pick) => pick.marketId === col.id);
    const totalPool = questionPicks.reduce((sum, pick) => sum + pick.stake, 0);

    const options: MarketOptionResult[] = candidates.map((option) => {
      const optionPicksRaw = questionPicks.filter((pick) => pick.team === option);
      return {
        option,
        picks: optionPicksRaw
          .map((pick) => ({
            playerId: pick.playerId,
            playerName: playerById.get(pick.playerId)?.name ?? "未知玩家",
            isDouble: pick.stake === DOUBLE_STAKE,
            payout: 0
          }))
          .sort((a, b) => a.playerName.localeCompare(b.playerName, "zh-CN")),
        basePayout: 0,
        weightedCount: 0,
        isWinner: winner !== null && option === winner
      };
    });

    const anyOptionEmpty = options.some((o) => o.picks.length === 0);
    if (!anyOptionEmpty && questionPicks.length > 0) {
      for (const option of options) {
        option.weightedCount = option.picks.reduce(
          (sum, pick) => sum + pickPersonWeight(pick.isDouble),
          0
        );
        option.basePayout = computeOptionBasePayout(totalPool, option.picks);
        for (const pick of option.picks) {
          pick.payout = computePlayerPayout(option.basePayout, pick.isDouble);
        }
      }
    }

    return {
      id: col.id,
      page: col.page,
      title: col.fullLabel,
      options,
      totalPicks: questionPicks.length,
      totalPool,
      winner
    };
  });
}
