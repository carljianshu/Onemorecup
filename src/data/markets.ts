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

export const PLAY_PAGES = [1, 2, 3] as const satisfies readonly PlayPage[];

/**
 * 题目配置：直接改下面的 candidates / name / label 即可。
 * 改完后若页面未更新，清 localStorage 的 onemorecup:markets 并刷新。
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
    name: "谁会晋级？",
    candidates: ["P3-A1", "P3-B1"],
    winner: null,
    page: 3
  },
  {
    id: "p3-2",
    round: "P3",
    name: "谁会晋级？",
    candidates: ["P3-A2", "P3-B2"],
    winner: null,
    page: 3
  },
  {
    id: "p3-3",
    round: "P3",
    name: "谁会晋级？",
    candidates: ["P3-A3", "P3-B3"],
    winner: null,
    page: 3
  },
  {
    id: "p3-4",
    round: "P3",
    name: "谁会晋级？",
    candidates: ["P3-A4", "P3-B4"],
    winner: null,
    page: 3
  },
  {
    id: "p3-5",
    round: "P3",
    name: "谁会晋级？",
    candidates: ["P3-A5", "P3-B5"],
    winner: null,
    page: 3
  },
  {
    id: "p3-6",
    round: "P3",
    name: "谁会晋级？",
    candidates: ["P3-A6", "P3-B6"],
    winner: null,
    page: 3
  },
  {
    id: "p3-7",
    round: "P3",
    name: "谁会晋级？",
    candidates: ["P3-A7", "P3-B7"],
    winner: null,
    page: 3
  }
];

export const STAKE_PER_PICK = 10 as const;
export const DOUBLE_STAKE = 20 as const;

export const PAGE_LABELS: Record<PlayPage, string> = {
  1: `第一页（${PAGE1_COUNT} 题）`,
  2: `第二页（${PAGE2_COUNT} 题）`,
  3: `第三页（${PAGE3_COUNT} 题）`
};

export function minPicksForPage(page: PlayPage) {
  if (page === 1) return MIN_PAGE1_PICKS;
  if (page === 2) return MIN_PAGE2_PICKS;
  return MIN_PAGE3_PICKS;
}

export function marketsForPage(markets: Market[], page: PlayPage) {
  return markets.filter((m) => m.page === page);
}

export { isPageLocked, pageLocksAt, formatPageLockUtc } from "@/lib/page-lock";

function defaultMarketById(id: string) {
  return DEFAULT_MARKETS.find((m) => m.id === id);
}

export function ensureMarketShape(markets: Market[]): Market[] {
  const defaultById = new Map(DEFAULT_MARKETS.map((m) => [m.id, m]));
  return markets.map((m) => {
    const base = defaultById.get(m.id);
    const page = m.page ?? base?.page ?? 1;
    const legacy = m as Market & {
      candidateTeamIds?: string[];
      winnerTeamId?: string | null;
    };

    const merged: Market = {
      ...base,
      ...m,
      page,
      candidates: m.candidates ?? legacy.candidateTeamIds ?? base?.candidates,
      winner: m.winner ?? legacy.winnerTeamId ?? null
    };
    return merged;
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
    return DEFAULT_MARKETS;
  }
  return ensureMarketShape(stored);
}
