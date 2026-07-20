import type { Page1RealWorldRate } from "@/data/page1-real-world-rates";

/** 1/4 决赛及以后：按 marketId 标注的多选项真实概率（百分数）。 */
export interface Page3MultiOptionRealWorldRate {
  marketId: "m3-5" | "m3-6" | "m3-7";
  optionRates: readonly { team: string; rate: number }[];
  pattern: string;
}

export type Page3BinaryRealWorldRate = Page1RealWorldRate;

export type Page3RealWorldRate = Page3BinaryRealWorldRate | Page3MultiOptionRealWorldRate;

export function isPage3MultiOptionRealWorldRate(
  benchmark: Page3RealWorldRate
): benchmark is Page3MultiOptionRealWorldRate {
  return "marketId" in benchmark && "optionRates" in benchmark;
}

/** 1/4 决赛（M3-1..M3-4）真实世界晋级概率（百分数），按热门胜率从高到低排列。 */
export const PAGE3_BINARY_REAL_WORLD_RATES: Page3BinaryRealWorldRate[] = [
  { favoriteTeam: "法国", favoriteRate: 73.88, underdogTeam: "摩洛哥", underdogRate: 26.12, pattern: "优势明显" },
  { favoriteTeam: "西班牙", favoriteRate: 69.7, underdogTeam: "比利时", underdogRate: 30.3, pattern: "优势明显" },
  { favoriteTeam: "阿根廷", favoriteRate: 69.13, underdogTeam: "瑞士", underdogRate: 30.87, pattern: "优势明显" },
  { favoriteTeam: "英格兰", favoriteRate: 62.35, underdogTeam: "挪威", underdogRate: 37.65, pattern: "稍占优势" }
];

export const PAGE3_MULTI_OPTION_REAL_WORLD_RATES: Page3MultiOptionRealWorldRate[] = [
  {
    marketId: "m3-5",
    optionRates: [
      { team: "法国", rate: 44.34 },
      { team: "西班牙", rate: 36.35 },
      { team: "比利时", rate: 9.75 },
      { team: "摩洛哥", rate: 9.56 }
    ],
    pattern: "四强争夺"
  },
  {
    marketId: "m3-6",
    optionRates: [
      { team: "阿根廷", rate: 36.4 },
      { team: "英格兰", rate: 35.04 },
      { team: "挪威", rate: 17.09 },
      { team: "瑞士", rate: 11.47 }
    ],
    pattern: "四强争夺"
  },
  {
    marketId: "m3-7",
    optionRates: [
      { team: "法国", rate: 27.32 },
      { team: "西班牙", rate: 21.33 },
      { team: "阿根廷", rate: 17.28 },
      { team: "英格兰", rate: 16.48 },
      { team: "挪威", rate: 6.57 },
      { team: "瑞士", rate: 3.78 },
      { team: "摩洛哥", rate: 3.66 },
      { team: "比利时", rate: 3.58 }
    ],
    pattern: "冠军争夺"
  }
];

export const PAGE3_REAL_WORLD_RATES: Page3RealWorldRate[] = [
  ...PAGE3_BINARY_REAL_WORLD_RATES,
  ...PAGE3_MULTI_OPTION_REAL_WORLD_RATES
];
