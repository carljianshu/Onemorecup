import type { GameConfig, Market, PlayPage, SubQuestion } from "@/types";

export const PAGE1_COUNT = 16;
export const PAGE2_COUNT = 8;
export const MIN_PAGE1_PICKS = 8;
export const MIN_PAGE2_PICKS = 4;
/** 总计 = 第一页已答题数 + 第二页已完成大题数，至少 16 才能保存第二页 */
export const MIN_TOTAL_PICKS = 16;
export const SUBS_PER_PAGE2_QUESTION = 4;
export const TOTAL_MARKETS = PAGE1_COUNT + PAGE2_COUNT;

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

  // ==================== 第二页：8 道大题（每题 4 小题，每小题 2 选项 + 不选） ====================
  {
    id: "p2-1",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-1-s1",
        label: "若是 E1 VS I1，谁会晋级？",
        candidates: ["E1", "I1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-1-s2",
        label: "若是 E1 VS C/D/F/G/H3，谁会晋级？",
        candidates: ["E1", "C/D/F/G/H3"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-1-s3",
        label: "若是 A/B/C/D/F3 VS I1，谁会晋级？",
        candidates: ["A/B/C/D/F3", "I1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-1-s4",
        label: "若是 A/B/C/D/F3 VS C/D/F/G/H3，谁会晋级？",
        candidates: ["A/B/C/D/F3", "C/D/F/G/H3"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-2",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-2-s1",
        label: "若是 A2 VS F1，谁会晋级？",
        candidates: ["A2", "F1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-2-s2",
        label: "若是 A2 VS C2，谁会晋级？",
        candidates: ["A2", "C2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-2-s3",
        label: "若是 B2 VS F1，谁会晋级？",
        candidates: ["B2", "F1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-2-s4",
        label: "若是 B2 VS C2，谁会晋级？",
        candidates: ["B2", "C2"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-3",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-3-s1",
        label: "若是 K2 VS H1，谁会晋级？",
        candidates: ["K2", "H1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-3-s2",
        label: "若是 K2 VS J2，谁会晋级？",
        candidates: ["K2", "J2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-3-s3",
        label: "若是 L2 VS H1，谁会晋级？",
        candidates: ["L2", "H1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-3-s4",
        label: "若是 L2 VS J2，谁会晋级？",
        candidates: ["L2", "J2"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-4",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-4-s1",
        label: "若是 D1 VS G1，谁会晋级？",
        candidates: ["D1", "G1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-4-s2",
        label: "若是 D1 VS A/E/H/I/J3，谁会晋级？",
        candidates: ["D1", "A/E/H/I/J3"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-4-s3",
        label: "若是 B/E/F/I/J3 VS G1，谁会晋级？",
        candidates: ["B/E/F/I/J3", "G1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-4-s4",
        label: "若是 B/E/F/I/J3 VS A/E/H/I/J3，谁会晋级？",
        candidates: ["B/E/F/I/J3", "A/E/H/I/J3"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-5",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-5-s1",
        label: "若是 C1 VS E2，谁会晋级？",
        candidates: ["C1", "E2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-5-s2",
        label: "若是 C1 VS I2，谁会晋级？",
        candidates: ["C1", "I2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-5-s3",
        label: "若是 F2 VS E2，谁会晋级？",
        candidates: ["F2", "E2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-5-s4",
        label: "若是 F2 VS I2，谁会晋级？",
        candidates: ["F2", "I2"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-6",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-6-s1",
        label: "若是 A1 VS L1，谁会晋级？",
        candidates: ["A1", "L1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-6-s2",
        label: "若是 A1 VS E/H/I/J/K3，谁会晋级？",
        candidates: ["A1", "E/H/I/J/K3"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-6-s3",
        label: "若是 C/E/F/H/I3 VS L1，谁会晋级？",
        candidates: ["C/E/F/H/I3", "L1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-6-s4",
        label: "若是 C/E/F/H/I3 VS E/H/I/J/K3，谁会晋级？",
        candidates: ["C/E/F/H/I3", "E/H/I/J/K3"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-7",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-7-s1",
        label: "若是 J1 VS D2，谁会晋级？",
        candidates: ["J1", "D2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-7-s2",
        label: "若是 J1 VS G2，谁会晋级？",
        candidates: ["J1", "G2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-7-s3",
        label: "若是 H2 VS D2，谁会晋级？",
        candidates: ["H2", "D2"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-7-s4",
        label: "若是 H2 VS G2，谁会晋级？",
        candidates: ["H2", "G2"],
        deleted: false,
        winner: null
      }
    ]
  },
  {
    id: "p2-8",
    round: "P2",
    name: "谁会晋级？",
    winner: null,
    page: 2,
    subQuestions: [
      {
        id: "p2-8-s1",
        label: "若是 B1 VS K1，谁会晋级？",
        candidates: ["B1", "K1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-8-s2",
        label: "若是 B1 VS D/E/I/J/L3，谁会晋级？",
        candidates: ["B1", "D/E/I/J/L3"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-8-s3",
        label: "若是 E/F/G/I/J3 VS K1，谁会晋级？",
        candidates: ["E/F/G/I/J3", "K1"],
        deleted: false,
        winner: null
      },
      {
        id: "p2-8-s4",
        label: "若是 E/F/G/I/J3 VS D/E/I/J/L3，谁会晋级？",
        candidates: ["E/F/G/I/J3", "D/E/I/J/L3"],
        deleted: false,
        winner: null
      }
    ]
  }
];

export const STAKE_PER_PICK = 10 as const;
export const DOUBLE_STAKE = 20 as const;

export const PAGE_LABELS: Record<PlayPage, string> = {
  1: `第一页（${PAGE1_COUNT} 题）`,
  2: `第二页（${PAGE2_COUNT} 题，每题 ${SUBS_PER_PAGE2_QUESTION} 小题）`
};

export function marketsForPage(markets: Market[], page: PlayPage) {
  return markets.filter((m) => m.page === page);
}

export function isPageLocked(config: GameConfig, page: PlayPage) {
  return page === 1 ? config.page1Locked : config.page2Locked;
}

function defaultMarketById(id: string) {
  return DEFAULT_MARKETS.find((m) => m.id === id);
}

function migrateSubQuestion(sub: SubQuestion, def: SubQuestion): SubQuestion {
  const legacy = sub as SubQuestion & {
    candidateTeamIds?: [string, string];
    winnerTeamId?: string | null;
  };
  return {
    ...def,
    ...sub,
    label: sub.label || def.label,
    candidates: sub.candidates ?? legacy.candidateTeamIds ?? def.candidates,
    winner: sub.winner ?? legacy.winnerTeamId ?? null,
    deleted: sub.deleted ?? false
  };
}

function ensureSubQuestions(market: Market): Market {
  if (market.page !== 2) return market;

  const defaults = defaultMarketById(market.id);
  const defaultSubs = defaults?.subQuestions ?? [];

  if (!market.subQuestions || market.subQuestions.length === 0) {
    return { ...market, subQuestions: defaultSubs.map((s) => ({ ...s })) };
  }

  const subById = new Map(market.subQuestions.map((s) => [s.id, s]));
  const merged = defaultSubs.map((def) => {
    const existing = subById.get(def.id);
    return existing ? migrateSubQuestion(existing, def) : { ...def };
  });

  return { ...market, subQuestions: merged };
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
    return page === 2 ? ensureSubQuestions(merged) : merged;
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
