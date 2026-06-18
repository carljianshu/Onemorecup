import { DOUBLE_STAKE } from "@/data/markets";
import { activeSubQuestions, allPickColumns, type PickColumn } from "@/lib/market-helpers";
import { settlePickGroup } from "@/lib/scoring";
import type { Market, Pick, Player, PlayPage } from "@/types";

export interface MarketResultPick {
  playerId: string;
  playerName: string;
  isDouble: boolean;
  /** 该题标准化得分（Double 为 2 个 0/1 之和） */
  payout: number;
}

export interface MarketOptionResult {
  option: string;
  picks: MarketResultPick[];
  isWinner: boolean;
}

export interface MarketResultSection {
  id: string;
  page: PlayPage;
  title: string;
  options: MarketOptionResult[];
  totalPicks: number;
  /** 计分位数（普通 1，Double 2） */
  slotCount: number;
  winner: string | null;
}

export function formatPoolAmount(value: number) {
  const text = value.toFixed(2);
  if (value > 0) return `+${text}`;
  return text;
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
    const slotCount = questionPicks.reduce(
      (sum, pick) => sum + (pick.stake === DOUBLE_STAKE ? 2 : 1),
      0
    );
    const settledScores = winner ? settlePickGroup(winner, questionPicks) : {};

    const options: MarketOptionResult[] = candidates.map((option) => ({
      option,
      picks: questionPicks
        .filter((pick) => pick.team === option)
        .map((pick) => ({
          playerId: pick.playerId,
          playerName: playerById.get(pick.playerId)?.name ?? "未知玩家",
          isDouble: pick.stake === DOUBLE_STAKE,
          payout: settledScores[pick.playerId] ?? 0
        }))
        .sort((a, b) => a.playerName.localeCompare(b.playerName, "zh-CN")),
      isWinner: winner !== null && option === winner
    }));

    return {
      id: col.id,
      page: col.page,
      title: col.fullLabel,
      options,
      totalPicks: questionPicks.length,
      slotCount,
      winner
    };
  });
}
