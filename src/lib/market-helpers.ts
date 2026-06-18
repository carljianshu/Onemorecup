import {
  DOUBLE_STAKE,
  isFlatPlayPage,
  PLAY_PAGES,
  SUBS_PER_PAGE2_QUESTION
} from "@/data/markets";
import type { Page2StructureError } from "@/i18n/validation";
import type { Market, Pick, PlayPage, PlayerPickInput, SubQuestion } from "@/types";

export function isPage2Market(market: Market) {
  return market.page === 2;
}

export function activeSubQuestions(market: Market): SubQuestion[] {
  return (market.subQuestions ?? []).filter((s) => !s.deleted);
}

export function hiddenSubQuestions(market: Market): SubQuestion[] {
  return (market.subQuestions ?? []).filter((s) => s.deleted);
}

export function pickIdsForPage(markets: Market[], page: PlayPage): string[] {
  if (isFlatPlayPage(page)) {
    return markets.filter((m) => m.page === page).map((m) => m.id);
  }
  const ids: string[] = [];
  for (const market of markets.filter((m) => m.page === 2)) {
    for (const sub of activeSubQuestions(market)) {
      ids.push(sub.id);
    }
  }
  return ids;
}

/** 每页 Double 可选 id：第一页/第三页为大题 id，第二页为大题 id（非小题） */
export function doubleIdsForPage(markets: Market[], page: PlayPage): string[] {
  return markets.filter((m) => m.page === page).map((m) => m.id);
}

/** Double 在人数统计中计 2 人 */
export function pickPersonWeight(isDouble: boolean) {
  return isDouble ? 2 : 1;
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

/** 表格列：第一页/第三页大题 + 第二页各小题（未删除） */
export function allPickColumns(markets: Market[]): PickColumn[] {
  const columns: PickColumn[] = [];

  for (const page of [1, 3] as const) {
    for (const market of markets.filter((m) => m.page === page)) {
      columns.push({
        id: market.id,
        page,
        shortLabel: market.id.toUpperCase(),
        fullLabel: `${market.id.toUpperCase()}：${market.name}`
      });
    }
  }

  for (const market of markets.filter((m) => m.page === 2)) {
    for (const sub of activeSubQuestions(market)) {
      columns.push({
        id: sub.id,
        page: 2,
        shortLabel: sub.id.toUpperCase(),
        fullLabel: sub.label
      });
    }
  }

  return columns;
}

export function findPlayerPick(picks: Pick[], playerId: string, marketId: string) {
  return picks.find((p) => p.playerId === playerId && p.marketId === marketId);
}

export function findSubQuestion(markets: Market[], subId: string) {
  for (const market of markets) {
    if (market.page !== 2) continue;
    const sub = market.subQuestions?.find((s) => s.id === subId);
    if (sub) return { market, sub };
  }
  return null;
}

/** 玩家已猜项目数：第一页/第三页每大题 1 项，第二页每小题 1 项（不含已隐藏小题） */
export function countPlayerGuessedItems(playerId: string, picks: Pick[], markets: Market[]): number {
  let count = 0;
  for (const pick of picks) {
    if (pick.playerId !== playerId) continue;
    const market = markets.find((m) => m.id === pick.marketId);
    if (market && isFlatPlayPage(market.page)) {
      count += 1;
      continue;
    }
    const subMatch = findSubQuestion(markets, pick.marketId);
    if (subMatch && !subMatch.sub.deleted) {
      count += 1;
    }
  }
  return count;
}

export function findMarketByPickId(markets: Market[], pickId: string) {
  const direct = markets.find((m) => m.id === pickId);
  if (direct) return direct;
  return findSubQuestion(markets, pickId)?.market ?? null;
}

export function isSubQuestionComplete(
  sub: SubQuestion,
  answers: Record<string, string | null> | Map<string, string>
) {
  if (sub.deleted) return true;
  const value = answers instanceof Map ? answers.get(sub.id) : answers[sub.id];
  return value != null && value !== "";
}

export const MAIN_QUESTION_SKIP = "__SKIP__";

export function isMainQuestionSkipped(market: Market, answers: Record<string, string | null>) {
  return market.page === 2 && answers[market.id] === MAIN_QUESTION_SKIP;
}

export function isMainQuestionPartial(market: Market, answers: Record<string, string | null>) {
  if (market.page !== 2 || isMainQuestionSkipped(market, answers)) return false;
  const subs = activeSubQuestions(market);
  if (subs.length === 0) return false;
  const answered = subs.filter((sub) => isSubQuestionComplete(sub, answers)).length;
  return answered > 0 && answered < subs.length;
}

/** 第二页保存前：每道大题须全部小题作答，或整题选择不选 */
export function validatePage2MainQuestionState(
  markets: Market[],
  selections: Record<string, string | null>
): Page2StructureError | null {
  for (const market of markets.filter((m) => m.page === 2)) {
    if (isMainQuestionSkipped(market, selections)) continue;
    const subs = activeSubQuestions(market);
    const answered = subs.filter((sub) => isSubQuestionComplete(sub, selections)).length;
    if (answered > 0 && answered < subs.length) {
      return {
        code: "main_incomplete",
        market: market.id.toUpperCase(),
        subs: subs.length
      };
    }
  }
  return null;
}

export function isMainQuestionComplete(market: Market, answers: Record<string, string | null>) {
  if (market.page !== 2) {
    return answers[market.id] != null && answers[market.id] !== MAIN_QUESTION_SKIP;
  }
  if (isMainQuestionSkipped(market, answers)) return false;
  const subs = activeSubQuestions(market);
  if (subs.length === 0) return false;
  return subs.every((sub) => isSubQuestionComplete(sub, answers));
}

export function countCompletedSubs(market: Market, answers: Record<string, string | null>) {
  return activeSubQuestions(market).filter((sub) => isSubQuestionComplete(sub, answers)).length;
}

export function playerAnswersFromPicks(playerPicks: Pick[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pick of playerPicks) {
    map[pick.marketId] = pick.team;
  }
  return map;
}

export function page2CompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return markets
    .filter((m) => m.page === 2)
    .filter((m) => isMainQuestionComplete(m, answers)).length;
}

export function flatPageCompletedCount(
  markets: Market[],
  page: 1 | 3,
  answers: Record<string, string | null>
) {
  return markets.filter(
    (m) => m.page === page && answers[m.id] != null && answers[m.id] !== MAIN_QUESTION_SKIP
  ).length;
}

export function page1CompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return flatPageCompletedCount(markets, 1, answers);
}

export function page3CompletedCount(markets: Market[], answers: Record<string, string | null>) {
  return flatPageCompletedCount(markets, 3, answers);
}

export function initSelectionMap(markets: Market[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const market of markets) {
    if (isFlatPlayPage(market.page)) {
      map[market.id] = null;
      continue;
    }
    map[market.id] = null;
    for (const sub of market.subQuestions ?? []) {
      if (!sub.deleted) map[sub.id] = null;
    }
  }
  return map;
}

export function formatMainQuestionProgress(market: Market, answers: Record<string, string | null>) {
  if (isMainQuestionSkipped(market, answers)) {
    return { done: 0, total: activeSubQuestions(market).length, complete: false, skipped: true };
  }
  const total = activeSubQuestions(market).length;
  const done = countCompletedSubs(market, answers);
  const complete = total > 0 && done === total;
  return { done, total, complete, skipped: false };
}

/** 从已保存的竞猜中还原某一页的 PlayerPickInput */
export function pickInputsFromStoredPicks(
  page: PlayPage,
  markets: Market[],
  playerId: string,
  picks: Pick[]
): PlayerPickInput[] {
  const result: PlayerPickInput[] = [];

  for (const pick of picks) {
    if (pick.playerId !== playerId) continue;

    const subMatch = findSubQuestion(markets, pick.marketId);
    if (page === 2 && subMatch) {
      result.push({
        marketId: pick.marketId,
        team: pick.team,
        double: pick.stake === DOUBLE_STAKE
      });
      continue;
    }

    if (isFlatPlayPage(page) && !subMatch) {
      const market = markets.find((m) => m.id === pick.marketId);
      if (market?.page === page) {
        result.push({
          marketId: pick.marketId,
          team: pick.team,
          double: pick.stake === DOUBLE_STAKE
        });
      }
    }
  }

  return result;
}

/** 保存当页时，与其他页已保存的竞猜合并 */
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

export { SUBS_PER_PAGE2_QUESTION };
