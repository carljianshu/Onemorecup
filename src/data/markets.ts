import type { Market, PlayPage, Pick, PlayerPickInput } from "@/types";

export const PAGE1_COUNT = 16;
export const PAGE2_COUNT = 8;
export const PAGE3_COUNT = 7;
export const MIN_PAGE1_PICKS = 8;
export const MIN_PAGE1_CACTUS_PICKS = 4;
export const MIN_PAGE1_MAPLE_PICKS = 4;
export const MIN_PAGE2_PICKS = 4;
export const MIN_PAGE3_PICKS = 4;
/** 总计 = 三页已答题数之和，至少 16 */
export const MIN_TOTAL_PICKS = 16;
export const TOTAL_MARKETS = PAGE1_COUNT + PAGE2_COUNT + PAGE3_COUNT;

/** 半决赛/决赛多选项题：按选项人数分布计算专用调整系数。 */
export const MULTI_OPTION_FINAL_MARKET_IDS = new Set<string>(["m3-5", "m3-6", "m3-7"]);

/** 竞猜页在此题之前展示多选项调整系数说明。 */
export const DISTRIBUTION_ADJUSTMENT_NOTE_MARKET_ID = "m3-5";

/** 竞猜页在此题之前展示 1/4 决赛及以后本金说明。 */
export const PAGE3_STAKE_NOTE_MARKET_ID = "m3-1";

/** 1/16 展示顺序：新 M1-N 对应原第 PAGE1_SOURCE_ORDER[N-1] 题。 */
export const PAGE1_SOURCE_ORDER = [11, 15, 7, 1, 8, 2, 16, 12, 9, 4, 6, 13, 3, 14, 10, 5] as const;

/** 旧题号前缀 p1-/p2-/p3- → m1-/m2-/m3-（已保存竞猜迁移用）。 */
export const LEGACY_MARKET_ID_PREFIX_MAP: Record<string, string> = Object.fromEntries([
  ...Array.from({ length: PAGE1_COUNT }, (_, index) => [`p1-${index + 1}`, `m1-${index + 1}`]),
  ...Array.from({ length: PAGE2_COUNT }, (_, index) => [`p2-${index + 1}`, `m2-${index + 1}`]),
  ...Array.from({ length: PAGE3_COUNT }, (_, index) => [`p3-${index + 1}`, `m3-${index + 1}`])
]);

/** @deprecated 使用 LEGACY_MARKET_ID_PREFIX_MAP */
export const LEGACY_P1_PREFIX_MARKET_ID_MAP = LEGACY_MARKET_ID_PREFIX_MAP;

/** 调序前 m1-题号 → 调序后 m1-题号（已保存竞猜迁移用）。 */
export const LEGACY_PAGE1_MARKET_ID_MAP: Record<string, string> = Object.fromEntries(
  PAGE1_SOURCE_ORDER.map((sourceNum, index) => [`m1-${sourceNum}`, `m1-${index + 1}`])
);

/** 原 1/16 题号 1–16 的选项（调序前）。 */
const PAGE1_LEGACY_CANDIDATES: readonly (readonly [string, string])[] = [
  ["德国", "A/B/C/D/F3"],
  ["I1", "C/D/F/G/H3"],
  ["A2", "B2"],
  ["F1", "C2"],
  ["K2", "L2"],
  ["H1", "J2"],
  ["美国", "B/E/F/I/J3"],
  ["G1", "A/E/H/I/J3"],
  ["C1", "F2"],
  ["E2", "I2"],
  ["墨西哥", "C/E/F/H/I3"],
  ["L1", "E/H/I/J/K3"],
  ["阿根廷", "H2"],
  ["D2", "G2"],
  ["B1", "E/F/G/I/J3"],
  ["K1", "D/E/I/J/L3"]
] as const;

function buildPage1Markets(): Market[] {
  return PAGE1_SOURCE_ORDER.map((sourceNum, index) => ({
    id: `m1-${index + 1}`,
    round: "M1",
    name: "谁会晋级？",
    candidates: [...PAGE1_LEGACY_CANDIDATES[sourceNum - 1]],
    winner: null,
    page: 1 as const
  }));
}

/** 1/16 分区标题：在该题之前展示（前 8 题 Cactus，后 8 题 Maple）。 */
export const PAGE1_SECTION_LABEL_KEYS: Record<string, string> = {
  "m1-1": "play.page1SectionCactus",
  "m1-9": "play.page1SectionMaple"
};

export const PAGE1_SECTION_NOTE_KEYS: Record<string, string> = {
  "m1-1": "play.page1SectionCactusNote",
  "m1-9": "play.page1SectionMapleNote"
};

export const PAGE1_CACTUS_MARKET_IDS = [
  "m1-1",
  "m1-2",
  "m1-3",
  "m1-4",
  "m1-5",
  "m1-6",
  "m1-7",
  "m1-8"
] as const;

export const PAGE1_MAPLE_MARKET_IDS = [
  "m1-9",
  "m1-10",
  "m1-11",
  "m1-12",
  "m1-13",
  "m1-14",
  "m1-15",
  "m1-16"
] as const;

export function page1SectionIcon(marketId: string): "cactus" | "maple" | null {
  if ((PAGE1_CACTUS_MARKET_IDS as readonly string[]).includes(marketId)) return "cactus";
  if ((PAGE1_MAPLE_MARKET_IDS as readonly string[]).includes(marketId)) return "maple";
  return null;
}
export const MARKET_INLINE_HINT_KEYS: Record<string, string[]> = {
  "m1-2": ["play.p1_3GroupStandingsB"],
  "m1-5": ["play.p1_8GroupStandingsG"],
  "m1-6": ["play.p1_2GroupStandings"],
  "m1-9": ["play.p1_9GroupStandingsC", "play.p1_9GroupStandingsF"],
  "m1-10": ["play.p1_4GroupStandingsF", "play.p1_4GroupStandingsC"],
  "m1-11": ["play.p1_6GroupStandingsH", "play.p1_6GroupStandingsJ"],
  "m1-12": ["play.p1_6GroupStandingsH"],
  "m1-13": ["play.p1_3GroupStandingsA", "play.p1_3GroupStandingsB"],
  "m1-14": ["play.p1_14GroupStandingsD", "play.p1_8GroupStandingsG"],
  "m1-15": ["play.p1_10GroupStandingsE", "play.p1_10GroupStandingsI"],
  "m1-8": ["play.p1_8GroupStandingsL"],
  "m1-7": ["play.p1_7GroupStandingsK"],
  "m1-16": ["play.p1_7GroupStandingsK", "play.p1_8GroupStandingsL"]
};

/**
 * 选项重命名时登记旧名 → 新名，已保存的竞猜与录入胜者会自动迁移。
 * 按题号索引对应：待填 1 = candidates[0]，以此类推。
 */
const LEGACY_CANDIDATE_ALIASES: Record<string, Record<string, string>> = {
  "m1-6": { "法国/挪威": "I1" },
  "m1-11": { "奥地利/阿尔及利亚": "J2" },
  "m1-15": { "法国/挪威": "I2" },
  "m1-14": { "澳大利亚/巴拉圭": "D2" },
  "m2-1": { "(法国/挪威)/CDFGH3": "I1/CDFGH3" },
  "m2-3": { "H1/(奥地利/阿尔及利亚)": "H1/J2" },
  "m2-5": { "E2/(法国/挪威)": "E2/I2" },
  "m2-7": { "(澳大利亚/巴拉圭)/G2": "D2/G2" },
  "m3-1": { "德国/(法国/挪威)区": "德国/I1区" },
  "m3-5": {
    "待填 1": "德国/I1区",
    "德国/(法国/挪威)区": "德国/I1区",
    "待填 2": "F1区",
    "待填 3": "H1区",
    "待填 4": "美国/G1区"
  },
  "m3-6": {
    "待填 1": "C1区",
    "待填 2": "墨西哥/L1区",
    "待填 3": "阿根廷区",
    "待填 4": "B1/K1区"
  },
  "m3-7": {
    "待填 1": "德国/I1区",
    "德国/(法国/挪威)区": "德国/I1区",
    "待填 2": "F1区",
    "待填 3": "H1区",
    "待填 4": "美国/G1区",
    "待填 5": "C1区",
    "待填 6": "墨西哥/L1区",
    "待填 7": "阿根廷区",
    "待填 8": "B1/K1区"
  }
};

/** 将旧选项名 A1、A1/… 迁移为墨西哥/… */
export function renameA1InTeamName(team: string): string {
  if (team === "A1") return "墨西哥";
  if (team.startsWith("A1/")) return `墨西哥/${team.slice(3)}`;
  return team;
}

/** 将旧选项名 D1、D1/… 迁移为美国/… */
export function renameD1InTeamName(team: string): string {
  if (team === "D1") return "美国";
  if (team.startsWith("D1/")) return `美国/${team.slice(3)}`;
  return team;
}

/** 将旧选项名 E1、E1/… 迁移为德国/… */
export function renameE1InTeamName(team: string): string {
  if (team === "E1") return "德国";
  if (team.startsWith("E1/")) return `德国/${team.slice(3)}`;
  return team;
}

/** 将旧选项名 J1、J1/…、J1区 迁移为阿根廷/… */
export function renameJ1InTeamName(team: string): string {
  if (team === "J1") return "阿根廷";
  if (team === "J1区") return "阿根廷区";
  if (team.startsWith("J1/")) return `阿根廷/${team.slice(3)}`;
  return team;
}

export function migratePickTeam(marketId: string, team: string, candidates: string[]): string {
  let mapped = LEGACY_CANDIDATE_ALIASES[marketId]?.[team] ?? team;
  mapped = renameA1InTeamName(mapped);
  mapped = renameD1InTeamName(mapped);
  mapped = renameE1InTeamName(mapped);
  mapped = renameJ1InTeamName(mapped);
  if (candidates.includes(mapped)) return mapped;
  if (candidates.includes(team)) return team;
  return mapped;
}

function pickTeamMatchesMarket(
  team: string,
  marketId: string,
  marketById: Map<string, Market>
): boolean {
  const market = marketById.get(marketId);
  if (!market) return false;
  const candidates = market.candidates ?? [];
  const migrated = migratePickTeam(marketId, team, candidates);
  return candidates.includes(migrated);
}

function remapLegacyPage1Pick(pick: Pick, marketById: Map<string, Market>): Pick {
  const marketId = LEGACY_MARKET_ID_PREFIX_MAP[pick.marketId] ?? pick.marketId;
  const normalizedPick = marketId === pick.marketId ? pick : { ...pick, marketId };
  if (!normalizedPick.marketId.startsWith("m1-")) return normalizedPick;
  if (pickTeamMatchesMarket(normalizedPick.team, normalizedPick.marketId, marketById)) {
    return normalizedPick;
  }
  const nextId = LEGACY_PAGE1_MARKET_ID_MAP[normalizedPick.marketId];
  if (!nextId || nextId === normalizedPick.marketId) return normalizedPick;
  if (pickTeamMatchesMarket(normalizedPick.team, nextId, marketById)) {
    return { ...normalizedPick, marketId: nextId };
  }
  return normalizedPick;
}

export function migratePicksForMarkets(picks: Pick[], markets: Market[]): Pick[] {
  const marketById = new Map(markets.map((market) => [market.id, market]));
  return picks.map((pick) => {
    const remapped = remapLegacyPage1Pick(pick, marketById);
    const market = marketById.get(remapped.marketId);
    if (!market) return remapped;
    const team = migratePickTeam(remapped.marketId, remapped.team, market.candidates ?? []);
    if (team === pick.team && remapped.marketId === pick.marketId) return pick;
    return { ...remapped, team };
  });
}

export function migratePickInputsForMarkets(
  pickInputs: PlayerPickInput[],
  markets: Market[]
): PlayerPickInput[] {
  return pickInputs.map((input) => {
    const marketId = LEGACY_MARKET_ID_PREFIX_MAP[input.marketId] ?? input.marketId;
    const baseInput = marketId === input.marketId ? input : { ...input, marketId };
    const market = markets.find((item) => item.id === baseInput.marketId);
    if (!market) return baseInput;
    const team = migratePickTeam(baseInput.marketId, baseInput.team, market.candidates ?? []);
    if (team === baseInput.team && baseInput.marketId === input.marketId) return input;
    return { ...baseInput, team };
  });
}

export function marketUsesDistributionAdjustment(marketId: string): boolean {
  return MULTI_OPTION_FINAL_MARKET_IDS.has(marketId);
}

export const PLAY_PAGES = [1, 2, 3] as const satisfies readonly PlayPage[];

/**
 * 题目配置：直接改下面的 candidates / name / label 即可。
 * 改完后若页面未更新，清 localStorage 的 onemorecup:markets 并刷新。
 * 题目文案与选项以代码为准；仅已录入的 winner 会从缓存/服务端保留。
 * 若重命名选项，请在 LEGACY_CANDIDATE_ALIASES 登记旧名映射，已保存答案会自动迁移。
 */
export const DEFAULT_MARKETS: Market[] = [
  ...buildPage1Markets(),

  // ==================== 第二页：8 题（每题 2 个选项 + 不选） ====================
  {
    id: "m2-1",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["德国/ABCDF3", "I1/CDFGH3"],
    winner: null,
    page: 2
  },
  {
    id: "m2-2",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["A2/B2", "F1/C2"],
    winner: null,
    page: 2
  },
  {
    id: "m2-3",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["K2/L2", "H1/J2"],
    winner: null,
    page: 2
  },
  {
    id: "m2-4",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["美国/BEFIJ3", "G1/AEHIJ3"],
    winner: null,
    page: 2
  },
  {
    id: "m2-5",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["C1/F2", "E2/I2"],
    winner: null,
    page: 2
  },
  {
    id: "m2-6",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["墨西哥/CEFHI3", "L1/EHIJK3"],
    winner: null,
    page: 2
  },
  {
    id: "m2-7",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["阿根廷/H2", "D2/G2"],
    winner: null,
    page: 2
  },
  {
    id: "m2-8",
    round: "M2",
    name: "谁会晋级？",
    candidates: ["B1/EFGIJ3", "K1/DEIJL3"],
    winner: null,
    page: 2
  },

  // ==================== 第三页：7 题（每题 2 个选项 + 不选，规则同第一页） ====================
  {
    id: "m3-1",
    round: "M3",
    name: "第一场1/4决赛谁会晋级？",
    candidates: ["德国/I1区", "F1区"],
    winner: null,
    page: 3
  },
  {
    id: "m3-2",
    round: "M3",
    name: "第二场1/4决赛谁会晋级？",
    candidates: ["H1区", "美国/G1区"],
    winner: null,
    page: 3
  },
  {
    id: "m3-3",
    round: "M3",
    name: "第三场1/4决赛谁会晋级？",
    candidates: ["C1区", "墨西哥/L1区"],
    winner: null,
    page: 3
  },
  {
    id: "m3-4",
    round: "M3",
    name: "第四场1/4决赛谁会晋级？",
    candidates: ["阿根廷区", "B1/K1区"],
    winner: null,
    page: 3
  },
  {
    id: "m3-5",
    round: "M3",
    name: "第一场半决赛谁会晋级？",
    candidates: ["德国/I1区", "F1区", "H1区", "美国/G1区"],
    winner: null,
    page: 3
  },
  {
    id: "m3-6",
    round: "M3",
    name: "第二场半决赛谁会晋级？",
    candidates: ["C1区", "墨西哥/L1区", "阿根廷区", "B1/K1区"],
    winner: null,
    page: 3
  },
  {
    id: "m3-7",
    round: "M3",
    name: "谁能夺冠？",
    candidates: [
      "德国/I1区",
      "F1区",
      "H1区",
      "美国/G1区",
      "C1区",
      "墨西哥/L1区",
      "阿根廷区",
      "B1/K1区"
    ],
    winner: null,
    page: 3
  }
];

export const STAKE_PER_PICK = 10 as const;
export const PAGE3_STAKE_PER_PICK = 20 as const;
export const DOUBLE_STAKE = 20 as const;

export function isPage3Market(marketId: string): boolean {
  return marketId.startsWith("m3-");
}

/** 结算用基准本金：1/4 决赛及以后为 20，前两阶段为 10。 */
export function marketStakePerPick(marketId: string): number {
  return isPage3Market(marketId) ? PAGE3_STAKE_PER_PICK : STAKE_PER_PICK;
}

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

function resolvePage1StoredWinner(
  base: Market,
  storedById: Map<string, Market>
): string | null {
  const slotMatch = base.id.match(/^m1-(\d+)$/);
  if (!slotMatch) return null;
  const slot = Number(slotMatch[1]);
  const sourceNum = PAGE1_SOURCE_ORDER[slot - 1];
  const candidates = base.candidates ?? [];

  const tryWinner = (raw: string | null | undefined) => {
    if (raw == null) return null;
    const migrated = migratePickTeam(base.id, raw, candidates);
    return candidates.includes(migrated) ? migrated : null;
  };

  const direct = tryWinner(storedById.get(base.id)?.winner ?? null);
  if (direct) return direct;

  if (sourceNum === slot) return null;
  return tryWinner(storedById.get(`m1-${sourceNum}`)?.winner ?? null);
}

function resolveStoredWinner(
  base: Market,
  stored: Market | undefined,
  storedById: Map<string, Market>
): string | null {
  if (base.page === 1) {
    return resolvePage1StoredWinner(base, storedById);
  }
  if (!stored) return null;
  const legacy = stored as Market & { winnerTeamId?: string | null };
  const rawWinner = stored.winner ?? legacy.winnerTeamId ?? null;
  if (rawWinner == null) return null;
  const migrated = migratePickTeam(base.id, rawWinner, base.candidates ?? []);
  return (base.candidates ?? []).includes(migrated) ? migrated : null;
}

export function ensureMarketShape(markets: Market[]): Market[] {
  const storedById = new Map(markets.map((m) => [m.id, m]));
  return DEFAULT_MARKETS.map((base) => {
    const stored = storedById.get(base.id);
    const winner = resolveStoredWinner(base, stored, storedById);
    return {
      ...base,
      winner
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
