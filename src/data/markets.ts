import type { Market, PlayPage } from "@/types";

export const PAGE1_COUNT = 16;
export const PAGE2_COUNT = 8;
export const PAGE3_COUNT = 7;
export const MIN_PAGE1_PICKS = 8;
export const MIN_PAGE2_PICKS = 4;
export const MIN_PAGE3_PICKS = 4;
/** 总计 = 三页已答题数之和，至少 16 */
export const MIN_TOTAL_PICKS = 16;
export const TOTAL_MARKETS = PAGE1_COUNT + PAGE2_COUNT + PAGE3_COUNT;

/** 半决赛/决赛多选项题：按选项人数分布计算专用调整系数。 */
export const MULTI_OPTION_FINAL_MARKET_IDS = new Set<string>(["p3-5", "p3-6", "p3-7"]);

export function marketUsesDistributionAdjustment(marketId: string): boolean {
  return MULTI_OPTION_FINAL_MARKET_IDS.has(marketId);
}

export const PLAY_PAGES = [1, 2, 3] as const satisfies readonly PlayPage[];

/**
 * 题目配置：直接改下面的 candidates / name / label 即可。
 * 改完后若页面未更新，清 localStorage 的 onemorecup:markets 并刷新。
 * 题目文案与选项以代码为准；仅已录入的 winner 会从缓存/服务端保留。
 */
export const DEFAULT_MARKETS: Market[] = [
  // ==================== 第一页：16 题（每题 2 个选项 + 不选） ====================
  {
    id: "p1-1",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["E1", "A/B/C/D/F3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-2",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["I1", "C/D/F/G/H3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-3",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["A2", "B2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-4",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["F1", "C2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-5",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["K2", "L2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-6",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["H1", "J2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-7",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["D1", "B/E/F/I/J3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-8",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["G1", "A/E/H/I/J3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-9",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["C1", "F2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-10",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["E2", "I2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-11",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["A1", "C/E/F/H/I3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-12",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["L1", "E/H/I/J/K3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-13",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["J1", "H2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-14",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["D2", "G2"],
    winner: null,
    page: 1
  },
  {
    id: "p1-15",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["B1", "E/F/G/I/J3"],
    winner: null,
    page: 1
  },
  {
    id: "p1-16",
    round: "P1",
    name: "谁会晋级？",
    candidates: ["K1", "D/E/I/J/L3"],
    winner: null,
    page: 1
  },

  // ==================== 第二页：8 题（每题 2 个选项 + 不选） ====================
  {
    id: "p2-1",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["E1/ABCDF3", "I1/CDFGH3"],
    winner: null,
    page: 2
  },
  {
    id: "p2-2",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["A2/B2", "F1/C2"],
    winner: null,
    page: 2
  },
  {
    id: "p2-3",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["K2/L2", "H1/J2"],
    winner: null,
    page: 2
  },
  {
    id: "p2-4",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["D1/BEFIJ3", "G1/AEHIJ3"],
    winner: null,
    page: 2
  },
  {
    id: "p2-5",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["C1/F2", "E2/I2"],
    winner: null,
    page: 2
  },
  {
    id: "p2-6",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["A1/CEFHI3", "L1/EHIJK3"],
    winner: null,
    page: 2
  },
  {
    id: "p2-7",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["J1/H2", "D2/G2"],
    winner: null,
    page: 2
  },
  {
    id: "p2-8",
    round: "P2",
    name: "谁会晋级？",
    candidates: ["B1/EFGIJ3", "K1/DEIJL3"],
    winner: null,
    page: 2
  },

  // ==================== 第三页：7 题（每题 2 个选项 + 不选，规则同第一页） ====================
  {
    id: "p3-1",
    round: "P3",
    name: "第一场1/4决赛谁会晋级？",
    candidates: ["E1/I1区", "F1区"],
    winner: null,
    page: 3
  },
  {
    id: "p3-2",
    round: "P3",
    name: "第二场1/4决赛谁会晋级？",
    candidates: ["H1区", "D1/G1区"],
    winner: null,
    page: 3
  },
  {
    id: "p3-3",
    round: "P3",
    name: "第三场1/4决赛谁会晋级？",
    candidates: ["C1区", "A1/L1区"],
    winner: null,
    page: 3
  },
  {
    id: "p3-4",
    round: "P3",
    name: "第四场1/4决赛谁会晋级？",
    candidates: ["J1区", "B1/K1区"],
    winner: null,
    page: 3
  },
  {
    id: "p3-5",
    round: "P3",
    name: "第一场半决赛谁会晋级？",
    candidates: ["待填 1", "待填 2", "待填 3", "待填 4"],
    winner: null,
    page: 3
  },
  {
    id: "p3-6",
    round: "P3",
    name: "第二场半决赛谁会晋级？",
    candidates: ["待填 1", "待填 2", "待填 3", "待填 4"],
    winner: null,
    page: 3
  },
  {
    id: "p3-7",
    round: "P3",
    name: "谁能夺冠？",
    candidates: [
      "待填 1",
      "待填 2",
      "待填 3",
      "待填 4",
      "待填 5",
      "待填 6",
      "待填 7",
      "待填 8"
    ],
    winner: null,
    page: 3
  }
];

export const STAKE_PER_PICK = 10 as const;
export const DOUBLE_STAKE = 20 as const;

export const PAGE_LABELS: Record<PlayPage, string> = {
  1: `1/16决赛（${PAGE1_COUNT} 题）`,
  2: `1/8决赛（${PAGE2_COUNT} 题）`,
  3: `1/4决赛及以后（${PAGE3_COUNT} 题）`
};

export function minPicksForPage(page: PlayPage) {
  if (page === 1) return MIN_PAGE1_PICKS;
  if (page === 2) return MIN_PAGE2_PICKS;
  return MIN_PAGE3_PICKS;
}

export function marketsForPage(markets: Market[], page: PlayPage) {
  return markets.filter((m) => m.page === page);
}

export { isPageLocked, pageLocksAt, formatPageLockUtc, formatPageDeadlineDisplay } from "@/lib/page-lock";

function defaultMarketById(id: string) {
  return DEFAULT_MARKETS.find((m) => m.id === id);
}

export function ensureMarketShape(markets: Market[]): Market[] {
  const storedById = new Map(markets.map((m) => [m.id, m]));
  return DEFAULT_MARKETS.map((base) => {
    const stored = storedById.get(base.id);
    if (!stored) return { ...base };

    const legacy = stored as Market & { winnerTeamId?: string | null };
    return {
      ...base,
      winner: stored.winner ?? legacy.winnerTeamId ?? null
    };
  });
}

export function syncMarkets(stored: Market[] | null): Market[] {
  if (!stored || stored.length !== TOTAL_MARKETS) {
    return DEFAULT_MARKETS;
  }
  const usesTeamIds = stored.some((m) => {
    const legacy = m as Market & { candidateTeamIds?: string[] };
    return legacy.candidateTeamIds != null && m.candidates == null;
  });
  if (usesTeamIds) {
    return ensureMarketShape(stored);
  }
  return ensureMarketShape(stored);
}
