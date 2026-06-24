import {
  DOUBLE_STAKE,
  PAGE1_CACTUS_MARKET_IDS,
  PAGE1_MAPLE_MARKET_IDS,
  PLAY_PAGES
} from "@/data/markets";
import type { Market, Pick, PlayPage, PlayerPickInput } from "@/types";

export function doubleIdsForPage(markets: Market[], page: PlayPage): string[] {
  return markets.filter((m) => m.page === page).map((m) => m.id);
}

export function pickPersonWeightFromStake(stake: number) {
  return stake === DOUBLE_STAKE ? 2 : 1;
}

export interface PickColumn {
  id: string;
  page: PlayPage;
  shortLabel: string;
  fullLabel: string;
}

export function allPickColumns(markets: Market[]): PickColumn[] {
  return markets.map((market) => ({
    id: market.id,
    page: market.page,
    shortLabel: market.id.toUpperCase(),
    fullLabel: `${market.id.toUpperCase()}：${market.name}`
  }));
}

export function findPlayerPick(picks: Pick[], playerId: string, marketId: string) {
  return picks.find((p) => p.playerId === playerId && p.marketId === marketId);
}

export function countPlayerGuessedItems(playerId: string, picks: Pick[], markets: Market[]): number {
  const marketIds = new Set(markets.map((m) => m.id));
  return picks.filter((p) => p.playerId === playerId && marketIds.has(p.marketId)).length;
}

export function findMarketByPickId(markets: Market[], pickId: string) {
  return markets.find((m) => m.id === pickId) ?? null;
}

export function playerAnswersFromPicks(playerPicks: Pick[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pick of playerPicks) {
    map[pick.marketId] = pick.team;
  }
  return map;
}

export function flatPageCompletedCount(
  markets: Market[],
  page: PlayPage,
  answers: Record<string, string | null>
) {
  return markets.filter(
    (m) => m.page === page && answers[m.id] != null && answers[m.id] !== ""
  ).length;
}

export function page1CompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return flatPageCompletedCount(markets, 1, answers);
}

export function page1SectionCompletedCount(
  marketIds: readonly string[],
  markets: Market[],
  answers: Record<string, string | null>
) {
  const idSet = new Set(marketIds);
  return markets.filter((m) => m.page === 1 && idSet.has(m.id) && answers[m.id] != null).length;
}

export function page1CactusCompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return page1SectionCompletedCount(PAGE1_CACTUS_MARKET_IDS, markets, answers);
}

export function page1MapleCompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return page1SectionCompletedCount(PAGE1_MAPLE_MARKET_IDS, markets, answers);
}

export function page2CompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return flatPageCompletedCount(markets, 2, answers);
}

export function page3CompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return flatPageCompletedCount(markets, 3, answers);
}

export function initSelectionMap(markets: Market[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const market of markets) {
    map[market.id] = null;
  }
  return map;
}

export function pickInputsFromStoredPicks(
  page: PlayPage,
  markets: Market[],
  playerId: string,
  picks: Pick[]
): PlayerPickInput[] {
  const result: PlayerPickInput[] = [];

  for (const pick of picks) {
    if (pick.playerId !== playerId) continue;
    const market = markets.find((m) => m.id === pick.marketId);
    if (market?.page === page) {
      result.push({
        marketId: pick.marketId,
        team: pick.team,
        double: pick.stake === DOUBLE_STAKE
      });
    }
  }

  return result;
}

export function mergePickInputsForPageSave(
  page: PlayPage,
  pageInputs: PlayerPickInput[],
  markets: Market[],
  editingPlayerId: string | null,
  picks: Pick[]
): PlayerPickInput[] {
  const otherPages = PLAY_PAGES.filter((p) => p !== page);
  const otherInputs = editingPlayerId
    ? otherPages.flatMap((otherPage) =>
        pickInputsFromStoredPicks(otherPage, markets, editingPlayerId, picks)
      )
    : [];
  return [...otherInputs, ...pageInputs];
}
