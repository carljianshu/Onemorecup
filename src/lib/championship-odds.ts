import {
  CHAMPIONSHIP_ODDS_BINARY_PROBABILITIES,
  CHAMPIONSHIP_ODDS_MULTI_OPTION_PROBABILITIES,
  isChampionshipOddsMultiOptionProbability
} from "@/data/championship-odds-probabilities";
import { isRankLockApplied } from "@/lib/rank-lock";
import { buildLeaderboard } from "@/lib/scoring";
import {
  phase3WinnersForScenarioMask
} from "@/lib/top-tier-best-rank";
import type { GameConfig, Market, Pick, Player } from "@/types";

const PHASE3_SCENARIO_COUNT = 128;
const QF_MARKET_IDS = ["m3-1", "m3-2", "m3-3", "m3-4"] as const;
const SETTLEMENT_ORDER = ["m3-1", "m3-2", "m3-3", "m3-4", "m3-5", "m3-6", "m3-7"] as const;

export type ChampionshipOddsMarketId = (typeof SETTLEMENT_ORDER)[number];

/** 夺冠赔率专用概率表：marketId → 队名 → 百分数。 */
export type ChampionshipOddsRateTable = Map<string, number>;

export interface ChampionshipOddsState {
  markets: Map<ChampionshipOddsMarketId, ChampionshipOddsRateTable>;
}

export interface ChampionshipOddsResult {
  /** 玩家 ID → 夺冠赔率（(1/P)×0.95，保留 1 位小数）；仅含 P>0 的玩家。 */
  oddsByPlayerId: ReadonlyMap<string, number>;
  remainingScenarioCount: number;
}

function cloneInitialOddsState(): ChampionshipOddsState {
  const markets = new Map<ChampionshipOddsMarketId, ChampionshipOddsRateTable>();

  for (const entry of CHAMPIONSHIP_ODDS_BINARY_PROBABILITIES) {
    const table: ChampionshipOddsRateTable = new Map([
      [entry.favoriteTeam, entry.favoriteRate],
      [entry.underdogTeam, entry.underdogRate]
    ]);
    markets.set(entry.marketId, table);
  }

  for (const entry of CHAMPIONSHIP_ODDS_MULTI_OPTION_PROBABILITIES) {
    const table: ChampionshipOddsRateTable = new Map(
      entry.optionRates.map((option) => [option.team, option.rate])
    );
    markets.set(entry.marketId, table);
  }

  return { markets };
}

function getOddsRate(state: ChampionshipOddsState, marketId: string, team: string): number {
  return state.markets.get(marketId as ChampionshipOddsMarketId)?.get(team) ?? 0;
}

function absorbTeamRates(
  state: ChampionshipOddsState,
  eliminated: string,
  beneficiary: string,
  marketIds: readonly ChampionshipOddsMarketId[]
) {
  for (const marketId of marketIds) {
    const table = state.markets.get(marketId);
    if (!table)
      continue;
    const eliminatedRate = table.get(eliminated) ?? 0;
    if (eliminatedRate <= 0)
      continue;
    table.set(beneficiary, (table.get(beneficiary) ?? 0) + eliminatedRate);
    table.set(eliminated, 0);
  }
}

/** 1/4 决赛结算：赢家吃光输家在本题及之后市场的概率。 */
export function settleChampionshipOddsQuarterFinal(
  state: ChampionshipOddsState,
  marketId: "m3-1" | "m3-2" | "m3-3" | "m3-4",
  winner: string,
  candidates: readonly string[]
) {
  const loser = candidates.find((team) => team !== winner);
  if (!loser)
    return;
  absorbTeamRates(state, loser, winner, [marketId, "m3-5", "m3-6", "m3-7"]);
}

/** 半决赛 / 决赛结算：赢家吃光同题所有输家；半决赛输家的决赛概率归赢家。 */
export function settleChampionshipOddsMultiOption(
  state: ChampionshipOddsState,
  marketId: "m3-5" | "m3-6" | "m3-7",
  winner: string
) {
  const table = state.markets.get(marketId);
  if (!table)
    return;

  const eliminated: string[] = [];
  for (const [team, rate] of table) {
    if (team !== winner && rate > 0)
      eliminated.push(team);
  }

  for (const team of eliminated) {
    absorbTeamRates(state, team, winner, [marketId]);
  }

  if (marketId === "m3-5" || marketId === "m3-6") {
    for (const team of eliminated) {
      absorbTeamRates(state, team, winner, ["m3-7"]);
    }
  }
}

/** 按已录入赛果依次「吃概率」，得到当前赔率用概率表。 */
export function buildChampionshipOddsStateFromMarkets(markets: Market[]): ChampionshipOddsState {
  const state = cloneInitialOddsState();
  const byId = new Map(markets.map((market) => [market.id, market]));

  for (const marketId of SETTLEMENT_ORDER) {
    const market = byId.get(marketId);
    if (!market?.winner)
      continue;

    if (QF_MARKET_IDS.includes(marketId as (typeof QF_MARKET_IDS)[number])) {
      const candidates = market.candidates ?? [];
      if (candidates.length >= 2) {
        settleChampionshipOddsQuarterFinal(
          state,
          marketId as "m3-1" | "m3-2" | "m3-3" | "m3-4",
          market.winner,
          candidates
        );
      }
      continue;
    }

    settleChampionshipOddsMultiOption(
      state,
      marketId as "m3-5" | "m3-6" | "m3-7",
      market.winner
    );
  }

  return state;
}

function qfMarketForTeam(
  team: string,
  qf0: string,
  qf1: string,
  qf2: string,
  qf3: string
): (typeof QF_MARKET_IDS)[number] | null {
  if (team === qf0)
    return "m3-1";
  if (team === qf1)
    return "m3-2";
  if (team === qf2)
    return "m3-3";
  if (team === qf3)
    return "m3-4";
  return null;
}

/**
 * 单条淘汰赛路径的发生概率（0–1）。
 * 四项相乘：冠军概率 × 另一场半决赛胜者概率 × 其余两场 1/4 胜者概率。
 */
export function computeScenarioProbability(
  winners: Record<string, string>,
  state: ChampionshipOddsState
): number {
  const qf0 = winners["m3-1"];
  const qf1 = winners["m3-2"];
  const qf2 = winners["m3-3"];
  const qf3 = winners["m3-4"];
  const sf0 = winners["m3-5"];
  const sf1 = winners["m3-6"];
  const champion = winners["m3-7"];
  if (!qf0 || !qf1 || !qf2 || !qf3 || !sf0 || !sf1 || !champion)
    return 0;

  let prob = getOddsRate(state, "m3-7", champion) / 100;
  if (prob <= 0)
    return 0;

  let otherSf: string;
  let otherSfMarket: "m3-5" | "m3-6";
  if (champion === sf0) {
    otherSf = sf1;
    otherSfMarket = "m3-6";
  }
  else {
    otherSf = sf0;
    otherSfMarket = "m3-5";
  }

  prob *= getOddsRate(state, otherSfMarket, otherSf) / 100;
  if (prob <= 0)
    return 0;

  const championQf = qfMarketForTeam(champion, qf0, qf1, qf2, qf3);
  const otherSfQf = qfMarketForTeam(otherSf, qf0, qf1, qf2, qf3);
  const remainingQf = QF_MARKET_IDS.filter(
    (id) => id !== championQf && id !== otherSfQf
  );

  for (const marketId of remainingQf) {
    const qfWinner = winners[marketId];
    prob *= getOddsRate(state, marketId, qfWinner) / 100;
    if (prob <= 0)
      return 0;
  }

  return prob;
}

function marketsWithPhase3Scenario(markets: Market[], winners: Record<string, string>): Market[] {
  return markets.map((market) => {
    const winner = winners[market.id];
    if (!winner)
      return market;
    return { ...market, winner };
  });
}

function scenarioKey(winners: Record<string, string>): string {
  return SETTLEMENT_ORDER.map((id) => winners[id]).join("\0");
}

export function formatChampionshipOdds(odds: number): string {
  return odds.toFixed(1);
}

export function shouldComputeChampionshipOdds(config: GameConfig | null | undefined): boolean {
  return isRankLockApplied(config);
}

/**
 * 遍历剩余淘汰赛路径，汇总各玩家夺魁（排行榜 #1）概率并换算赔率。
 */
export function computeChampionshipOdds(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  config: GameConfig | null | undefined
): ChampionshipOddsResult | null {
  if (!shouldComputeChampionshipOdds(config))
    return null;

  const state = buildChampionshipOddsStateFromMarkets(markets);
  const winProbability = new Map<string, number>();
  for (const player of players)
    winProbability.set(player.id, 0);

  const seen = new Set<string>();
  let remainingScenarioCount = 0;

  for (let mask = 0; mask < PHASE3_SCENARIO_COUNT; mask++) {
    const winners = phase3WinnersForScenarioMask(markets, mask);
    if (!winners)
      continue;
    const key = scenarioKey(winners);
    if (seen.has(key))
      continue;
    seen.add(key);
    remainingScenarioCount++;

    const scenarioProb = computeScenarioProbability(winners, state);
    if (scenarioProb <= 0)
      continue;

    const scenarioMarkets = marketsWithPhase3Scenario(markets, winners);
    const leaderboard = buildLeaderboard(players, scenarioMarkets, picks, config ?? undefined);
    const bestRank = leaderboard.reduce((min, entry) => Math.min(min, entry.rank), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(bestRank))
      continue;

    for (const entry of leaderboard) {
      if (entry.rank !== bestRank)
        continue;
      winProbability.set(
        entry.playerId,
        (winProbability.get(entry.playerId) ?? 0) + scenarioProb
      );
    }
  }

  const oddsByPlayerId = new Map<string, number>();
  for (const [playerId, probability] of winProbability) {
    if (probability > 0)
      oddsByPlayerId.set(playerId, Math.round((0.95 / probability) * 10) / 10);
  }

  return { oddsByPlayerId, remainingScenarioCount };
}

/** @internal 供测试：默认概率表是否完整。 */
export function championshipOddsStateIsComplete(state: ChampionshipOddsState): boolean {
  return SETTLEMENT_ORDER.every((id) => state.markets.has(id));
}

/** @internal 供测试：导出多选项概率结构校验。 */
export { isChampionshipOddsMultiOptionProbability };
