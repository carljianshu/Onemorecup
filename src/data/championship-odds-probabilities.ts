/**
 * 夺冠赔率专用：第三阶段（M3-1..M3-7）市场隐含概率（百分数）。
 *
 * 与 {@link ./page3-real-world-rates PAGE3_REAL_WORLD_RATES} 完全独立：
 * - 本文件仅用于后续「每位玩家夺冠赔率」计算
 * - 数据分析页的「真实世界赔率偏差」仍使用 page3-real-world-rates.ts
 *
 * M3-1 已结算（法国晋级），概率记为 100% / 0%。
 */

export interface ChampionshipOddsBinaryProbability {
  marketId: "m3-1" | "m3-2" | "m3-3" | "m3-4";
  favoriteTeam: string;
  favoriteRate: number;
  underdogTeam: string;
  underdogRate: number;
}

export interface ChampionshipOddsMultiOptionProbability {
  marketId: "m3-5" | "m3-6" | "m3-7";
  optionRates: readonly { team: string; rate: number }[];
}

export type ChampionshipOddsProbability =
  | ChampionshipOddsBinaryProbability
  | ChampionshipOddsMultiOptionProbability;

export function isChampionshipOddsMultiOptionProbability(
  entry: ChampionshipOddsProbability
): entry is ChampionshipOddsMultiOptionProbability {
  return "optionRates" in entry;
}

/** 四场 1/4 决赛（M3-1..M3-4）晋级概率；M3-1 已结算。 */
export const CHAMPIONSHIP_ODDS_BINARY_PROBABILITIES: ChampionshipOddsBinaryProbability[] = [
  {
    marketId: "m3-1",
    favoriteTeam: "法国",
    favoriteRate: 100,
    underdogTeam: "摩洛哥",
    underdogRate: 0
  },
  {
    marketId: "m3-2",
    favoriteTeam: "西班牙",
    favoriteRate: 69.68,
    underdogTeam: "比利时",
    underdogRate: 30.32
  },
  {
    marketId: "m3-3",
    favoriteTeam: "英格兰",
    favoriteRate: 62.64,
    underdogTeam: "挪威",
    underdogRate: 37.36
  },
  {
    marketId: "m3-4",
    favoriteTeam: "阿根廷",
    favoriteRate: 69.11,
    underdogTeam: "瑞士",
    underdogRate: 30.89
  }
];

/** 半决赛（M3-5、M3-6）与冠军（M3-7）市场隐含概率。 */
export const CHAMPIONSHIP_ODDS_MULTI_OPTION_PROBABILITIES: ChampionshipOddsMultiOptionProbability[] = [
  {
    marketId: "m3-5",
    optionRates: [
      { team: "法国", rate: 59.6 },
      { team: "西班牙", rate: 32.29 },
      { team: "比利时", rate: 8.12 },
      { team: "摩洛哥", rate: 0 }
    ]
  },
  {
    marketId: "m3-6",
    optionRates: [
      { team: "阿根廷", rate: 36.88 },
      { team: "英格兰", rate: 34.29 },
      { team: "挪威", rate: 17.1 },
      { team: "瑞士", rate: 11.73 }
    ]
  },
  {
    marketId: "m3-7",
    optionRates: [
      { team: "法国", rate: 37.46 },
      { team: "西班牙", rate: 18.9 },
      { team: "阿根廷", rate: 15.89 },
      { team: "英格兰", rate: 15.52 },
      { team: "挪威", rate: 5.93 },
      { team: "瑞士", rate: 3.31 },
      { team: "比利时", rate: 3 },
      { team: "摩洛哥", rate: 0 }
    ]
  }
];

export const CHAMPIONSHIP_ODDS_PROBABILITIES: ChampionshipOddsProbability[] = [
  ...CHAMPIONSHIP_ODDS_BINARY_PROBABILITIES,
  ...CHAMPIONSHIP_ODDS_MULTI_OPTION_PROBABILITIES
];

const byMarketId = new Map(
  CHAMPIONSHIP_ODDS_PROBABILITIES.map((entry) => [entry.marketId, entry])
);

export function championshipOddsProbabilityForMarket(
  marketId: string
): ChampionshipOddsProbability | undefined {
  return byMarketId.get(marketId as ChampionshipOddsProbability["marketId"]);
}
