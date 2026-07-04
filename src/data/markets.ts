import { isPickTeamValidForMarket } from "@/lib/market-helpers";
import type { Market, PlayPage, Pick, PlayerPickInput } from "@/types";
export const PAGE1_COUNT = 16;
export const PAGE2_COUNT = 8;
export const PAGE3_COUNT = 7;
export const MIN_PAGE1_PICKS = 8;
export const MIN_PAGE1_CACTUS_PICKS = 4;
export const MIN_PAGE1_MAPLE_PICKS = 4;
export const MIN_PAGE2_PICKS = 4;
export const MIN_PAGE3_PICKS = 4;
export const MIN_PAGE3_SEQUOIA_PICKS = 1;

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

export const PAGE1_SOURCE_ORDER = [3, 9, 4, 6, 13, 14, 10, 5, 11, 15, 7, 1, 8, 2, 16, 12] as const;

/** 展示位调序：旧 m1-题号 → 新 m1-题号（已保存竞猜迁移用）。 */

export const PAGE1_SLOT_MIGRATION_MAP: Record<string, string> = {
    "m1-1": "m1-9",
    "m1-2": "m1-10",
    "m1-3": "m1-11",
    "m1-4": "m1-12",
    "m1-5": "m1-13",
    "m1-6": "m1-14",
    "m1-7": "m1-15",
    "m1-8": "m1-16",
    "m1-9": "m1-1",
    "m1-10": "m1-2",
    "m1-11": "m1-3",
    "m1-12": "m1-4",
    "m1-13": "m1-5",
    "m1-14": "m1-6",
    "m1-15": "m1-7",
    "m1-16": "m1-8"
};

/** 旧题号前缀 p1-/p2-/p3- → m1-/m2-/m3-（已保存竞猜迁移用）。 */

export const LEGACY_MARKET_ID_PREFIX_MAP: Record<string, string> = Object.fromEntries([
    ...Array.from({ length: PAGE1_COUNT }, (_, index) => [`p1-${index + 1}`, `m1-${index + 1}`]),
    ...Array.from({ length: PAGE2_COUNT }, (_, index) => [`p2-${index + 1}`, `m2-${index + 1}`]),
    ...Array.from({ length: PAGE3_COUNT }, (_, index) => [`p3-${index + 1}`, `m3-${index + 1}`])
]);

/** @deprecated 使用 LEGACY_MARKET_ID_PREFIX_MAP */

export const LEGACY_P1_PREFIX_MARKET_ID_MAP = LEGACY_MARKET_ID_PREFIX_MAP;

/** 调序前 m1-题号 → 调序后 m1-题号（已保存竞猜迁移用）。 */

export const LEGACY_PAGE1_MARKET_ID_MAP: Record<string, string> = Object.fromEntries(PAGE1_SOURCE_ORDER.map((sourceNum, index) => [`m1-${sourceNum}`, `m1-${index + 1}`]));

/** 原 1/16 题号 1–16 的选项（调序前）。 */

const PAGE1_LEGACY_CANDIDATES: readonly (readonly [
    string,
    string
])[] = [
    ["德国", "巴拉圭"],
    ["法国", "瑞典"],
    ["南非", "加拿大"],
    ["荷兰", "摩洛哥"],
    ["葡萄牙", "克罗地亚"],
    ["西班牙", "奥地利"],
    ["美国", "波黑"],
    ["比利时", "塞内加尔"],
    ["巴西", "日本"],
    ["科特迪瓦", "挪威"],
    ["墨西哥", "厄瓜多尔"],
    ["英格兰", "民主刚果"],
    ["阿根廷", "佛得角"],
    ["澳大利亚", "埃及"],
    ["瑞士", "阿尔及利亚"],
    ["哥伦比亚", "加纳"]
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
    "m1-1": "play.page1SectionMaple",
    "m1-9": "play.page1SectionCactus"
};
export const PAGE1_SECTION_NOTE_KEYS: Record<string, string> = {
    "m1-1": "play.page1SectionMapleNote",
    "m1-9": "play.page1SectionCactusNote"
};
export const PAGE1_MAPLE_MARKET_IDS = [
    "m1-1",
    "m1-2",
    "m1-3",
    "m1-4",
    "m1-5",
    "m1-6",
    "m1-7",
    "m1-8"
] as const;
export const PAGE1_CACTUS_MARKET_IDS = [
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
    if ((PAGE1_CACTUS_MARKET_IDS as readonly string[]).includes(marketId))
        return "cactus";
    if ((PAGE1_MAPLE_MARKET_IDS as readonly string[]).includes(marketId))
        return "maple";
    return null;
}

/** 1/8 决赛分区标题：M2-1～M2-8 为 Niagara（瀑布）。 */

export const PAGE2_SECTION_LABEL_KEYS: Record<string, string> = {
    "m2-1": "play.page2SectionNiagara"
};
export const PAGE2_SECTION_NOTE_KEYS: Record<string, string> = {
    "m2-1": "play.page2SectionNiagaraNote"
};
export const PAGE2_NIAGARA_MARKET_IDS = [
    "m2-1",
    "m2-2",
    "m2-3",
    "m2-4",
    "m2-5",
    "m2-6",
    "m2-7",
    "m2-8"
] as const;
export function page2SectionIcon(marketId: string): "niagara" | null {
    if ((PAGE2_NIAGARA_MARKET_IDS as readonly string[]).includes(marketId))
        return "niagara";
    return null;
}

/** 1/4 及以后分区标题：M3-1～M3-4 为 Canyon，M3-5～M3-7 为 Sequoia。 */

export const PAGE3_SECTION_LABEL_KEYS: Record<string, string> = {
    "m3-1": "play.page3SectionCanyon",
    "m3-5": "play.page3SectionSequoia"
};
export const PAGE3_SECTION_NOTE_KEYS: Record<string, string> = {
    "m3-1": "play.page3SectionCanyonNote",
    "m3-5": "play.page3SectionSequoiaNote"
};
export const PAGE3_CANYON_MARKET_IDS = ["m3-1", "m3-2", "m3-3", "m3-4"] as const;
export const PAGE3_SEQUOIA_MARKET_IDS = ["m3-5", "m3-6", "m3-7"] as const;
export function page3SectionIcon(marketId: string): "canyon" | "sequoia" | null {
    if ((PAGE3_CANYON_MARKET_IDS as readonly string[]).includes(marketId))
        return "canyon";
    if ((PAGE3_SEQUOIA_MARKET_IDS as readonly string[]).includes(marketId))
        return "sequoia";
    return null;
}
export const PLAY_SECTION_LABEL_KEYS: Record<string, string> = {
    ...PAGE1_SECTION_LABEL_KEYS,
    ...PAGE2_SECTION_LABEL_KEYS,
    ...PAGE3_SECTION_LABEL_KEYS
};
export const PLAY_SECTION_NOTE_KEYS: Record<string, string> = {
    ...PAGE1_SECTION_NOTE_KEYS,
    ...PAGE2_SECTION_NOTE_KEYS,
    ...PAGE3_SECTION_NOTE_KEYS
};
export type PlaySectionTheme = "cactus" | "maple" | "niagara" | "canyon" | "sequoia";
export function playSectionTheme(marketId: string): PlaySectionTheme | null {
    if (marketId === "m1-1")
        return "maple";
    if (marketId === "m1-9")
        return "cactus";
    if (marketId === "m2-1")
        return "niagara";
    if (marketId === "m3-1")
        return "canyon";
    if (marketId === "m3-5")
        return "sequoia";
    return null;
}
export function playMarketSectionIcon(marketId: string): PlaySectionTheme | null {
    return page1SectionIcon(marketId) ?? page2SectionIcon(marketId) ?? page3SectionIcon(marketId);
}
export const MARKET_INLINE_HINT_KEYS: Record<string, string[]> = {};

/**
 * 选项重命名时登记旧名 → 新名，已保存的竞猜与录入胜者会自动迁移。
 * 按题号索引对应：待填 1 = candidates[0]，以此类推。
 */

const LEGACY_CANDIDATE_ALIASES: Record<string, Record<string, string>> = {
    "m1-2": { "E/F/G/I/J3": "伊朗/J3", "E/G/I/J3": "伊朗/J3" },
    "m1-10": {
        "E/F/G/I/J3": "阿尔及利亚",
        "E/G/I/J3": "阿尔及利亚",
        "伊朗/J3": "阿尔及利亚"
    },
    "m1-4": {
        "A/B/C/D/F3": "巴拉圭",
        "A/C/D/F3": "巴拉圭",
        "C/D/F3": "巴拉圭",
        "D/F3": "巴拉圭",
        J2: "奥地利",
        "奥地利/阿尔及利亚": "奥地利"
    },
    "m1-12": { "H1": "西班牙" },
    "m1-13": {
        G1: "比利时",
        "A/E/H/I/J3": "塞内加尔",
        "A/H/I/J3": "塞内加尔",
        "A/I/J3": "塞内加尔",
        "韩国/I3/J3": "塞内加尔",
        "韩国/塞内加尔/J3": "塞内加尔"
    },
    "m1-7": {
        "D/E/I/J/L3": "厄瓜多尔/塞内加尔/L3",
        "D/E/I/L3": "厄瓜多尔/塞内加尔/L3",
        "E/I/L3": "厄瓜多尔/塞内加尔/L3"
    },
    "m1-5": {
        K2: "葡萄牙",
        G1: "比利时",
        "A/E/H/I/J3": "塞内加尔",
        "A/H/I/J3": "塞内加尔",
        "A/I/J3": "塞内加尔",
        "韩国/I3/J3": "塞内加尔",
        "韩国/塞内加尔/J3": "塞内加尔"
    },
    "m1-16": {
        "E/H/I/J/K3": "民主刚果",
        "E/I/J/K3": "民主刚果",
        "E/H/I/K3": "民主刚果",
        "I/J/K3": "民主刚果",
        "I/K3": "民主刚果",
        "塞内加尔/J3/K3": "民主刚果",
        "塞内加尔/加纳": "民主刚果",
        "塞内加尔/K3": "民主刚果",
        "塞内加尔/民主刚果": "民主刚果"
    },
    "m1-1": { "C/E/F/H/I3": "厄瓜多尔", "C/E/H3": "厄瓜多尔", "苏格兰/厄瓜多尔": "厄瓜多尔" },
    "m1-9": { "C/E/F/H/I3": "厄瓜多尔", "C/E/H3": "厄瓜多尔", "苏格兰/厄瓜多尔": "厄瓜多尔" },
    "m1-3": { "B/E/F/I/J3": "波黑", "B/I3": "波黑" },
    "m1-6": {
        "法国/挪威": "法国",
        "I1": "法国",
        "C/D/F/G/H3": "瑞典",
        "D/F/G/H3": "瑞典",
        "D/F/G3": "瑞典",
        "F/G3": "瑞典"
    },
    "m1-15": {
        K1: "哥伦比亚",
        "法国/挪威": "挪威",
        "I2": "挪威",
        "厄瓜多尔/塞内加尔/L3": "加纳",
        "D/E/I/J/L3": "加纳",
        "D/E/I/L3": "加纳",
        "E/I/L3": "加纳",
        "L3": "加纳"
    },
    "m1-14": { "G2": "埃及", "澳大利亚/巴拉圭": "澳大利亚", "D2": "澳大利亚" },
    "m2-1": {
        "(法国/挪威)/CDFGH3": "法国",
        "I1/CDFGH3": "法国",
        "I1/DFGH3": "法国",
        "法国/DFG3": "法国",
        "法国/FG3": "法国",
        "法国/瑞典": "法国",
        "德国/ABCDF3": "巴拉圭",
        "德国/ACDF3": "巴拉圭",
        "德国/CDF3": "巴拉圭",
        "德国/DF3": "巴拉圭",
        "德国/巴拉圭": "巴拉圭"
    },
    "m2-3": {
        "H1/(奥地利/阿尔及利亚)": "西班牙",
        "西班牙/(奥地利/阿尔及利亚)": "西班牙",
        "西班牙/奥地利": "西班牙",
        "K2/L2": "葡萄牙",
        "K2/克罗地亚": "葡萄牙",
        "葡萄牙/克罗地亚": "葡萄牙"
    },
    "m2-4": {
        "美国/BEFIJ3": "美国",
        "美国/BI3": "美国",
        "美国/波黑": "美国",
        "G1/AEHIJ3": "比利时",
        "G1/AHIJ3": "比利时",
        "G1/AIJ3": "比利时",
        "比利时/AIJ3": "比利时",
        "比利时/(韩国/I3/J3)": "比利时",
        "比利时/(韩国/塞内加尔/J3)": "比利时",
        "比利时/塞内加尔": "比利时"
    },
    "m2-6": {
        "墨西哥/CEFHI3": "墨西哥",
        "墨西哥/CEH3": "墨西哥",
        "墨西哥/(苏格兰/厄瓜多尔)": "墨西哥",
        "墨西哥/厄瓜多尔": "墨西哥",
        "L1/EHIJK3": "英格兰",
        "L1/EIJK3": "英格兰",
        "L1/IJK3": "英格兰",
        "英格兰/(塞内加尔/J3/K3)": "英格兰",
        "英格兰/(塞内加尔/加纳)": "英格兰",
        "英格兰/(塞内加尔/K3)": "英格兰",
        "英格兰/(塞内加尔/民主刚果)": "英格兰",
        "英格兰/民主刚果": "英格兰"
    },
    "m2-2": {
        "南非/加拿大": "加拿大",
        "F1/摩洛哥": "摩洛哥",
        "荷兰/摩洛哥": "摩洛哥"
    },
    "m2-5": {
        "E2/(法国/挪威)": "挪威",
        "E2/I2": "挪威",
        "科特迪瓦/I2": "挪威",
        "科特迪瓦/挪威": "挪威",
        "巴西/F2": "巴西",
        "巴西/日本": "巴西"
    },
    "m2-7": {
        "(澳大利亚/巴拉圭)/G2": "埃及",
        "D2/G2": "埃及",
        "澳大利亚/G2": "埃及",
        "澳大利亚/埃及": "埃及",
        "阿根廷/H2": "阿根廷",
        "阿根廷/佛得角": "阿根廷"
    },
    "m2-8": {
        "瑞士/EFGIJ3": "瑞士",
        "瑞士/EGIJ3": "瑞士",
        "瑞士/(伊朗/J3)": "瑞士",
        "瑞士/阿尔及利亚": "瑞士",
        "E/F/G/I/J3": "阿尔及利亚",
        "E/G/I/J3": "阿尔及利亚",
        "K1/DEIJL3": "哥伦比亚",
        "K1/DEIL3": "哥伦比亚",
        "K1/EIL3": "哥伦比亚",
        "K1/(厄瓜多尔/塞内加尔/L3)": "哥伦比亚",
        "K1/L3": "哥伦比亚",
        "K1/加纳": "哥伦比亚",
        "哥伦比亚/加纳": "哥伦比亚",
        "D/E/I/J/L3": "加纳",
        "D/E/I/L3": "加纳",
        "E/I/L3": "加纳",
        "厄瓜多尔/塞内加尔/L3": "加纳",
        "L3": "加纳"
    },
    "m3-1": {
        "德国/(法国/挪威)区": "巴拉圭/法国",
        "德国/I1区": "巴拉圭/法国",
        "德国/法国区": "巴拉圭/法国",
        "德国/巴拉圭/法国/瑞典": "巴拉圭/法国",
        "巴拉圭/法国/瑞典": "巴拉圭/法国",
        "荷兰/摩洛哥/南非/加拿大": "摩洛哥/加拿大",
        "荷兰/摩洛哥/加拿大": "摩洛哥/加拿大",
        "荷兰区": "摩洛哥/加拿大"
    },
    "m3-2": {
        "西班牙区": "西班牙/葡萄牙",
        "H1区": "西班牙/葡萄牙",
        "美国/比利时区": "美国/比利时",
        "美国/波黑/比利时/塞内加尔": "美国/比利时",
        "美国/波黑/比利时": "美国/比利时",
        "西班牙/奥地利/葡萄牙/克罗地亚": "西班牙/葡萄牙"
    },
    "m3-3": {
        "巴西区": "巴西/挪威",
        "巴西/科特迪瓦/挪威": "巴西/挪威",
        "墨西哥/英格兰区": "墨西哥/英格兰",
        "墨西哥/L1区": "墨西哥/英格兰",
        "墨西哥/厄瓜多尔/英格兰/民主刚果": "墨西哥/英格兰",
        "墨西哥/英格兰/民主刚果": "墨西哥/英格兰"
    },
    "m3-4": {
        "阿根廷区": "阿根廷/埃及",
        "阿根廷/佛得角/澳大利亚/埃及": "阿根廷/埃及",
        "阿根廷/佛得角/埃及": "阿根廷/埃及",
        "瑞士/哥伦比亚区": "瑞士/哥伦比亚",
        "瑞士/K1区": "瑞士/哥伦比亚",
        "瑞士/阿尔及利亚/哥伦比亚/加纳": "瑞士/哥伦比亚",
        "瑞士/哥伦比亚/加纳": "瑞士/哥伦比亚"
    },
    "m3-5": {
        "待填 1": "巴拉圭/法国",
        "德国/(法国/挪威)区": "巴拉圭/法国",
        "德国/I1区": "巴拉圭/法国",
        "德国/法国区": "巴拉圭/法国",
        "德国/巴拉圭/法国/瑞典": "巴拉圭/法国",
        "巴拉圭/法国/瑞典": "巴拉圭/法国",
        "待填 2": "摩洛哥/加拿大",
        "荷兰/摩洛哥/南非/加拿大": "摩洛哥/加拿大",
        "荷兰/摩洛哥/加拿大": "摩洛哥/加拿大",
        "荷兰区": "摩洛哥/加拿大",
        "待填 3": "西班牙/葡萄牙",
        "H1区": "西班牙/葡萄牙",
        "西班牙区": "西班牙/葡萄牙",
        "西班牙/奥地利/葡萄牙/克罗地亚": "西班牙/葡萄牙",
        "待填 4": "美国/比利时",
        "美国/比利时区": "美国/比利时",
        "美国/波黑/比利时/塞内加尔": "美国/比利时",
        "美国/波黑/比利时": "美国/比利时"
    },
    "m3-6": {
        "待填 1": "巴西/挪威",
        "巴西区": "巴西/挪威",
        "巴西/科特迪瓦/挪威": "巴西/挪威",
        "待填 2": "墨西哥/英格兰",
        "墨西哥/英格兰区": "墨西哥/英格兰",
        "墨西哥/L1区": "墨西哥/英格兰",
        "墨西哥/厄瓜多尔/英格兰/民主刚果": "墨西哥/英格兰",
        "墨西哥/英格兰/民主刚果": "墨西哥/英格兰",
        "待填 3": "阿根廷/埃及",
        "阿根廷区": "阿根廷/埃及",
        "阿根廷/佛得角/澳大利亚/埃及": "阿根廷/埃及",
        "阿根廷/佛得角/埃及": "阿根廷/埃及",
        "待填 4": "瑞士/哥伦比亚",
        "瑞士/哥伦比亚区": "瑞士/哥伦比亚",
        "瑞士/K1区": "瑞士/哥伦比亚",
        "瑞士/阿尔及利亚/哥伦比亚/加纳": "瑞士/哥伦比亚",
        "瑞士/哥伦比亚/加纳": "瑞士/哥伦比亚"
    },
    "m3-7": {
        "待填 1": "巴拉圭/法国",
        "德国/(法国/挪威)区": "巴拉圭/法国",
        "德国/I1区": "巴拉圭/法国",
        "德国/法国区": "巴拉圭/法国",
        "德国/巴拉圭/法国/瑞典": "巴拉圭/法国",
        "巴拉圭/法国/瑞典": "巴拉圭/法国",
        "待填 2": "摩洛哥/加拿大",
        "荷兰/摩洛哥/南非/加拿大": "摩洛哥/加拿大",
        "荷兰/摩洛哥/加拿大": "摩洛哥/加拿大",
        "荷兰区": "摩洛哥/加拿大",
        "待填 3": "西班牙/葡萄牙",
        "H1区": "西班牙/葡萄牙",
        "西班牙区": "西班牙/葡萄牙",
        "西班牙/奥地利/葡萄牙/克罗地亚": "西班牙/葡萄牙",
        "待填 4": "美国/比利时",
        "美国/比利时区": "美国/比利时",
        "美国/波黑/比利时/塞内加尔": "美国/比利时",
        "美国/波黑/比利时": "美国/比利时",
        "待填 5": "巴西/挪威",
        "巴西区": "巴西/挪威",
        "巴西/科特迪瓦/挪威": "巴西/挪威",
        "待填 6": "墨西哥/英格兰",
        "墨西哥/英格兰区": "墨西哥/英格兰",
        "墨西哥/L1区": "墨西哥/英格兰",
        "墨西哥/厄瓜多尔/英格兰/民主刚果": "墨西哥/英格兰",
        "墨西哥/英格兰/民主刚果": "墨西哥/英格兰",
        "待填 7": "阿根廷/埃及",
        "阿根廷区": "阿根廷/埃及",
        "阿根廷/佛得角/澳大利亚/埃及": "阿根廷/埃及",
        "阿根廷/佛得角/埃及": "阿根廷/埃及",
        "待填 8": "瑞士/哥伦比亚",
        "瑞士/哥伦比亚区": "瑞士/哥伦比亚",
        "瑞士/K1区": "瑞士/哥伦比亚",
        "瑞士/阿尔及利亚/哥伦比亚/加纳": "瑞士/哥伦比亚",
        "瑞士/哥伦比亚/加纳": "瑞士/哥伦比亚"
    }
};

/** 将旧选项名 A1、A1/… 迁移为墨西哥/… */

export function renameA1InTeamName(team: string): string {
    if (team === "A1")
        return "墨西哥";
    if (team.startsWith("A1/"))
        return `墨西哥/${team.slice(3)}`;
    return team;
}

/** 将旧选项名 D1、D1/… 迁移为美国/… */

export function renameD1InTeamName(team: string): string {
    if (team === "D1")
        return "美国";
    if (team.startsWith("D1/"))
        return `美国/${team.slice(3)}`;
    return team;
}

/** 将旧选项名 D2、D2/… 迁移为澳大利亚/… */

export function renameD2InTeamName(team: string): string {
    if (team === "D2")
        return "澳大利亚";
    if (team.startsWith("D2/"))
        return `澳大利亚/${team.slice(3)}`;
    if (team.endsWith("/D2"))
        return `${team.slice(0, -3)}/澳大利亚`;
    return team;
}

/** 将旧选项名 E1、E1/… 迁移为德国/… */

export function renameE1InTeamName(team: string): string {
    if (team === "E1")
        return "德国";
    if (team.startsWith("E1/"))
        return `德国/${team.slice(3)}`;
    return team;
}

/** 将旧选项名 E2、E2/… 迁移为科特迪瓦/… */

export function renameE2InTeamName(team: string): string {
    if (team === "E2")
        return "科特迪瓦";
    if (team.startsWith("E2/"))
        return `科特迪瓦/${team.slice(3)}`;
    if (team.endsWith("/E2"))
        return `${team.slice(0, -3)}/科特迪瓦`;
    return team;
}

/** 将旧选项名 F1、F1/…、F1区 迁移为荷兰/… */

export function renameF1InTeamName(team: string): string {
    if (team === "F1")
        return "荷兰";
    if (team === "F1区")
        return "荷兰区";
    if (team.startsWith("F1/"))
        return `荷兰/${team.slice(3)}`;
    if (team.endsWith("/F1"))
        return `${team.slice(0, -3)}/荷兰`;
    return team;
}

/** 将旧选项名 F2、F2/… 迁移为日本/… */

export function renameF2InTeamName(team: string): string {
    if (team === "F2")
        return "日本";
    if (team.startsWith("F2/"))
        return `日本/${team.slice(3)}`;
    if (team.endsWith("/F2"))
        return `${team.slice(0, -3)}/日本`;
    return team;
}

/** 将旧选项名 J1、J1/…、J1区 迁移为阿根廷/… */

export function renameJ1InTeamName(team: string): string {
    if (team === "J1")
        return "阿根廷";
    if (team === "J1区")
        return "阿根廷区";
    if (team.startsWith("J1/"))
        return `阿根廷/${team.slice(3)}`;
    return team;
}

/** 瑞士 1/16 对手占位符 → 瑞士；1/8 联动选项同步。 */

export function renameSwitzerlandRound1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("E/F/G/I/J3", "阿尔及利亚")
        .replaceAll("E/G/I/J3", "阿尔及利亚")
        .replaceAll("伊朗/J3", "阿尔及利亚")
        .replaceAll("瑞士/EFGIJ3", "瑞士")
        .replaceAll("瑞士/EGIJ3", "瑞士")
        .replaceAll("瑞士/(伊朗/J3)", "瑞士")
        .replaceAll("EFGIJ3", "阿尔及利亚")
        .replaceAll("EGIJ3", "阿尔及利亚");
}

/** 将旧选项名 B1、B1/…、B1区 迁移为瑞士/… */

export function renameB1InTeamName(team: string): string {
    if (team === "B1")
        return "瑞士";
    if (team === "B1区")
        return "瑞士区";
    if (team.startsWith("B1/"))
        return `瑞士/${team.slice(3)}`;
    return team;
}

/** M2-1 1/8 选项：法国/瑞典 → 法国。 */

export function renameM21CandidateInTeamName(team: string): string {
    if (team === "法国/瑞典")
        return "法国";
    return team;
}

/** M2-2 1/8 选项：南非/加拿大 → 加拿大；荷兰/摩洛哥 → 摩洛哥。 */

export function renameM22CandidateInTeamName(team: string): string {
    if (team === "荷兰/摩洛哥")
        return "摩洛哥";
    return team.replaceAll("南非/加拿大", "加拿大");
}

/** M2-5 1/8 选项：科特迪瓦/挪威 → 挪威。 */

export function renameM25CandidateInTeamName(team: string): string {
    if (team === "科特迪瓦/挪威")
        return "挪威";
    return team;
}

/** M2-3 1/8 选项：葡萄牙/克罗地亚 → 葡萄牙；西班牙/奥地利 → 西班牙。 */

export function renameM23CandidateInTeamName(team: string): string {
    if (team === "葡萄牙/克罗地亚")
        return "葡萄牙";
    if (team === "西班牙/奥地利")
        return "西班牙";
    return team;
}

/** M2-4 1/8 选项：美国/波黑 → 美国；比利时/塞内加尔 → 比利时。 */

export function renameM24CandidateInTeamName(team: string): string {
    if (team === "美国/波黑")
        return "美国";
    if (team === "比利时/塞内加尔")
        return "比利时";
    return team;
}

/** M2-6 1/8 选项：墨西哥/厄瓜多尔 → 墨西哥；英格兰/民主刚果 → 英格兰。 */

export function renameM26CandidateInTeamName(team: string): string {
    if (team === "墨西哥/厄瓜多尔")
        return "墨西哥";
    if (team === "英格兰/民主刚果")
        return "英格兰";
    return team;
}

/** M2-7 1/8 选项：阿根廷/佛得角 → 阿根廷；澳大利亚/埃及 → 埃及。 */

export function renameM27CandidateInTeamName(team: string): string {
    if (team === "阿根廷/佛得角")
        return "阿根廷";
    if (team === "澳大利亚/埃及")
        return "埃及";
    return team;
}

/** M2-8 1/8 选项：瑞士/阿尔及利亚 → 瑞士；哥伦比亚/加纳 → 哥伦比亚。 */

export function renameM28CandidateInTeamName(team: string): string {
    if (team === "瑞士/阿尔及利亚")
        return "瑞士";
    if (team === "哥伦比亚/加纳")
        return "哥伦比亚";
    return team;
}

/** M3 Bracket 复合选项：旧区名 / 旧四队写法 → 新四队写法。 */

export function renameM3BracketCandidatesInTeamName(team: string): string {
    return team
        .replaceAll("德国/巴拉圭/法国/瑞典", "巴拉圭/法国")
        .replaceAll("巴拉圭/法国/瑞典", "巴拉圭/法国")
        .replaceAll("荷兰/摩洛哥/南非/加拿大", "摩洛哥/加拿大")
        .replaceAll("荷兰/摩洛哥/加拿大", "摩洛哥/加拿大")
        .replaceAll("巴西/日本/科特迪瓦/挪威", "巴西/挪威")
        .replaceAll("巴西/科特迪瓦/挪威", "巴西/挪威")
        .replaceAll("西班牙/奥地利/葡萄牙/克罗地亚", "西班牙/葡萄牙")
        .replaceAll("西班牙区", "西班牙/葡萄牙")
        .replaceAll("H1区", "西班牙/葡萄牙")
        .replaceAll("美国/波黑/比利时/塞内加尔", "美国/比利时")
        .replaceAll("美国/波黑/比利时", "美国/比利时")
        .replaceAll("美国/比利时区", "美国/比利时")
        .replaceAll("美国/波黑", "美国")
        .replaceAll("墨西哥/厄瓜多尔/英格兰/民主刚果", "墨西哥/英格兰")
        .replaceAll("墨西哥/英格兰/民主刚果", "墨西哥/英格兰")
        .replaceAll("墨西哥/英格兰区", "墨西哥/英格兰")
        .replaceAll("墨西哥/L1区", "墨西哥/英格兰")
        .replaceAll("阿根廷/佛得角/澳大利亚/埃及", "阿根廷/埃及")
        .replaceAll("阿根廷/佛得角/埃及", "阿根廷/埃及")
        .replaceAll("阿根廷区", "阿根廷/埃及")
        .replaceAll("瑞士/阿尔及利亚/哥伦比亚/加纳", "瑞士/哥伦比亚")
        .replaceAll("瑞士/哥伦比亚/加纳", "瑞士/哥伦比亚")
        .replaceAll("瑞士/K1区", "瑞士/哥伦比亚")
        .replaceAll("瑞士/哥伦比亚区", "瑞士/哥伦比亚");
}

export function renameB2InTeamName(team: string): string {
    if (team === "B2")
        return "加拿大";
    if (team.startsWith("B2/"))
        return `加拿大/${team.slice(3)}`;
    if (team.endsWith("/B2"))
        return `${team.slice(0, -3)}/加拿大`;
    return team;
}

/** 将旧选项名 A2、A2/… 迁移为南非/… */

export function renameA2InTeamName(team: string): string {
    if (team === "A2")
        return "南非";
    if (team.startsWith("A2/"))
        return `南非/${team.slice(3)}`;
    if (team.endsWith("/A2"))
        return `${team.slice(0, -3)}/南非`;
    return team;
}

/** 将旧选项名 C1、C1/…、C1区 迁移为巴西/… */

export function renameC1InTeamName(team: string): string {
    if (team === "C1")
        return "巴西";
    if (team === "C1区")
        return "巴西区";
    if (team.startsWith("C1/"))
        return `巴西/${team.slice(3)}`;
    return team;
}

/** 将旧选项名 C2、C2/… 迁移为摩洛哥/… */

export function renameC2InTeamName(team: string): string {
    if (team === "C2")
        return "摩洛哥";
    if (team.startsWith("C2/"))
        return `摩洛哥/${team.slice(3)}`;
    if (team.endsWith("/C2"))
        return `${team.slice(0, -3)}/摩洛哥`;
    return team;
}

/** 将旧选项名 J2、…/J2 迁移为奥地利/… */

export function renameJ2InTeamName(team: string): string {
    if (team === "J2")
        return "奥地利";
    if (team.startsWith("J2/"))
        return `奥地利/${team.slice(3)}`;
    if (team.endsWith("/J2"))
        return `${team.slice(0, -3)}/奥地利`;
    return team;
}

/** 西班牙 1/16 对手 → 奥地利（已淘汰）；1/8 联动选项同步为西班牙。 */

export function renameSpainRound1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("H1/(奥地利/阿尔及利亚)", "西班牙")
        .replaceAll("西班牙/(奥地利/阿尔及利亚)", "西班牙")
        .replaceAll("西班牙/奥地利", "西班牙")
        .replaceAll("奥地利/阿尔及利亚", "奥地利");
}

/** 英格兰 1/16 对手 → 民主刚果；1/8 联动选项同步。 */

export function renameL1Round1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("E/H/I/J/K3", "民主刚果")
        .replaceAll("E/I/J/K3", "民主刚果")
        .replaceAll("E/H/I/K3", "民主刚果")
        .replaceAll("I/J/K3", "民主刚果")
        .replaceAll("I/K3", "民主刚果")
        .replaceAll("塞内加尔/J3/K3", "民主刚果")
        .replaceAll("塞内加尔/加纳", "民主刚果")
        .replaceAll("塞内加尔/K3", "民主刚果")
        .replaceAll("塞内加尔/民主刚果", "民主刚果")
        .replaceAll("L1/EHIJK3", "英格兰")
        .replaceAll("L1/EIJK3", "英格兰")
        .replaceAll("L1/IJK3", "英格兰")
        .replaceAll("英格兰/EHIJK3", "英格兰")
        .replaceAll("英格兰/EIJK3", "英格兰")
        .replaceAll("英格兰/IJK3", "英格兰")
        .replaceAll("英格兰/(塞内加尔/J3/K3)", "英格兰")
        .replaceAll("英格兰/(塞内加尔/加纳)", "英格兰")
        .replaceAll("英格兰/(塞内加尔/K3)", "英格兰")
        .replaceAll("英格兰/(塞内加尔/民主刚果)", "英格兰")
        .replaceAll("EHIJK3", "民主刚果")
        .replaceAll("EIJK3", "民主刚果")
        .replaceAll("EHIK3", "民主刚果")
        .replaceAll("IJK3", "民主刚果")
        .replaceAll("IK3", "民主刚果");
}
export function renameL1InTeamName(team: string): string {
    if (team === "L1")
        return "英格兰";
    if (team === "L1区")
        return "英格兰区";
    if (team.includes("L1区"))
        return team.replaceAll("L1区", "英格兰区");
    if (team.startsWith("L1/"))
        return `英格兰/${team.slice(3)}`;
    if (team.endsWith("/L1"))
        return `${team.slice(0, -3)}/英格兰`;
    return team;
}

/** K1 1/16 对手 → 厄瓜多尔/塞内加尔/L3；1/8 联动选项加括号。 */

export function renameK1Round1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("D/E/I/J/L3", "加纳")
        .replaceAll("D/E/I/L3", "加纳")
        .replaceAll("E/I/L3", "加纳")
        .replaceAll("厄瓜多尔/塞内加尔/L3", "加纳")
        .replaceAll("K1/DEIJL3", "哥伦比亚")
        .replaceAll("K1/DEIL3", "哥伦比亚")
        .replaceAll("K1/EIL3", "哥伦比亚")
        .replaceAll("K1/(厄瓜多尔/塞内加尔/L3)", "哥伦比亚")
        .replaceAll("K1/L3", "哥伦比亚")
        .replaceAll("K1/加纳", "哥伦比亚")
        .replaceAll("DEIJL3", "加纳")
        .replaceAll("DEIL3", "加纳")
        .replaceAll("EIL3", "加纳");
}
export function renameK1InTeamName(team: string): string {
    if (team === "K1")
        return "哥伦比亚";
    if (team === "K1区")
        return "哥伦比亚区";
    if (team.includes("K1区"))
        return team.replaceAll("K1区", "哥伦比亚区");
    if (team.startsWith("K1/"))
        return `哥伦比亚/${team.slice(3)}`;
    if (team.endsWith("/K1"))
        return `${team.slice(0, -3)}/哥伦比亚`;
    return team;
}
export function renameK2InTeamName(team: string): string {
    if (team === "K2")
        return "葡萄牙";
    if (team.startsWith("K2/"))
        return `葡萄牙/${team.slice(3)}`;
    if (team.endsWith("/K2"))
        return `${team.slice(0, -3)}/葡萄牙`;
    return team;
}
export function renameK3InTeamName(team: string): string {
    if (team === "K3")
        return "民主刚果";
    if (team.startsWith("K3/"))
        return `民主刚果/${team.slice(3)}`;
    if (team.endsWith("/K3"))
        return `${team.slice(0, -3)}/民主刚果`;
    return team.replaceAll("塞内加尔K3", "民主刚果");
}
export function renameL2InTeamName(team: string): string {
    if (team === "L2")
        return "克罗地亚";
    if (team.startsWith("L2/"))
        return `克罗地亚/${team.slice(3)}`;
    if (team.endsWith("/L2"))
        return `${team.slice(0, -3)}/克罗地亚`;
    return team;
}
export function renameL3InTeamName(team: string): string {
    if (team === "L3")
        return "加纳";
    if (team.startsWith("L3/"))
        return `加纳/${team.slice(3)}`;
    if (team.endsWith("/L3"))
        return `${team.slice(0, -3)}/加纳`;
    return team;
}

/** 将旧选项名 H1、H1/…、H1区 迁移为西班牙/… */

export function renameH1InTeamName(team: string): string {
    if (team === "H1")
        return "西班牙";
    if (team === "H1区")
        return "西班牙区";
    if (team.includes("H1区"))
        return team.replaceAll("H1区", "西班牙区");
    if (team.startsWith("H1/"))
        return `西班牙/${team.slice(3)}`;
    if (team.endsWith("/H1"))
        return `${team.slice(0, -3)}/西班牙`;
    return team;
}

/** 将旧选项名 H2、H2/… 迁移为佛得角/… */

export function renameH2InTeamName(team: string): string {
    if (team === "H2")
        return "佛得角";
    if (team.startsWith("H2/"))
        return `佛得角/${team.slice(3)}`;
    if (team.endsWith("/H2"))
        return `${team.slice(0, -3)}/佛得角`;
    return team;
}

/** 法国 1/16 对手：C/D/F/G/H3、D/F/G/H3、D/F/G3、F/G3 → 瑞典；1/8 联动选项同步。 */

export function renameI1Round1OpponentInTeamName(team: string): string {
    const placeholder = "\u0000SE\u0000";
    return team
        .replaceAll("瑞典", placeholder)
        .replaceAll("C/D/F/G/H3", "瑞典")
        .replaceAll("D/F/G/H3", "瑞典")
        .replaceAll("D/F/G3", "瑞典")
        .replaceAll("F/G3", "瑞典")
        .replaceAll(placeholder, "瑞典")
        .replaceAll("法国/CDFGH3", "法国/瑞典")
        .replaceAll("法国/DFGH3", "法国/瑞典")
        .replaceAll("法国/DFG3", "法国/瑞典")
        .replaceAll("法国/FG3", "法国/瑞典")
        .replaceAll("I1/CDFGH3", "法国/瑞典")
        .replaceAll("I1/DFGH3", "法国/瑞典")
        .replaceAll("CDFGH3", "瑞典")
        .replaceAll("DFGH3", "瑞典")
        .replaceAll("DFG3", "瑞典")
        .replaceAll("FG3", "瑞典");
}

/** 将旧选项名 I1、I1/…、I1区 迁移为法国/… */

export function renameI1InTeamName(team: string): string {
    if (team === "I1")
        return "法国";
    if (team === "I1区")
        return "法国区";
    if (team.includes("I1区"))
        return team.replaceAll("I1区", "法国区");
    if (team.startsWith("I1/"))
        return `法国/${team.slice(3)}`;
    if (team.endsWith("/I1"))
        return `${team.slice(0, -3)}/法国`;
    return team;
}

/** 将旧选项名 I2、I2/… 迁移为挪威/… */

export function renameI2InTeamName(team: string): string {
    if (team === "I2")
        return "挪威";
    if (team.startsWith("I2/"))
        return `挪威/${team.slice(3)}`;
    if (team.endsWith("/I2"))
        return `${team.slice(0, -3)}/挪威`;
    return team;
}

/** 德国 1/16 对手：A/B/C/D/F3、A/C/D/F3、C/D/F3、D/F3 → 巴拉圭；1/8 m2-1 选项同步为「巴拉圭」。 */

export function renameGermanyRound1OpponentInTeamName(team: string): string {
    const placeholder = "\u0000PY\u0000";
    return team
        .replaceAll("巴拉圭", placeholder)
        .replaceAll("A/B/C/D/F3", "巴拉圭")
        .replaceAll("A/C/D/F3", "巴拉圭")
        .replaceAll("C/D/F3", "巴拉圭")
        .replaceAll("D/F3", "巴拉圭")
        .replaceAll(placeholder, "巴拉圭")
        .replaceAll("德国/ABCDF3", "巴拉圭")
        .replaceAll("德国/ACDF3", "巴拉圭")
        .replaceAll("德国/CDF3", "巴拉圭")
        .replaceAll("德国/DF3", "巴拉圭")
        .replaceAll("ABCDF3", "巴拉圭")
        .replaceAll("ACDF3", "巴拉圭")
        .replaceAll("CDF3", "巴拉圭")
        .replaceAll("DF3", "巴拉圭");
}

/** 墨西哥 1/16 对手：C/E/F/H/I3、C/E/H3 → 苏格兰/厄瓜多尔；1/8 联动选项加括号便于阅读。 */

export function renameMexicoRound1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("C/E/F/H/I3", "厄瓜多尔")
        .replaceAll("C/E/H3", "厄瓜多尔")
        .replaceAll("苏格兰/厄瓜多尔", "厄瓜多尔")
        .replaceAll("墨西哥/CEFHI3", "墨西哥")
        .replaceAll("墨西哥/CEH3", "墨西哥")
        .replaceAll("墨西哥/(苏格兰/厄瓜多尔)", "墨西哥")
        .replaceAll("CEFHI3", "厄瓜多尔")
        .replaceAll("CEH3", "厄瓜多尔");
}

/** 美国 1/16 对手槽位 → 波黑（已淘汰）；1/8 联动选项同步为美国。 */

export function renameUsaRound1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("B/E/F/I/J3", "波黑")
        .replaceAll("B/I3", "波黑")
        .replaceAll("美国/BEFIJ3", "美国")
        .replaceAll("美国/BI3", "美国")
        .replaceAll("BEFIJ3", "波黑")
        .replaceAll("BI3", "波黑");
}

/** 比利时 1/16 对手 → 塞内加尔；1/8 联动选项同步。 */

export function renameG1Round1OpponentInTeamName(team: string): string {
    return team
        .replaceAll("A/E/H/I/J3", "塞内加尔")
        .replaceAll("A/H/I/J3", "塞内加尔")
        .replaceAll("A/I/J3", "塞内加尔")
        .replaceAll("韩国/I3/J3", "塞内加尔")
        .replaceAll("韩国/塞内加尔/J3", "塞内加尔")
        .replaceAll("G1/AEHIJ3", "比利时")
        .replaceAll("G1/AHIJ3", "比利时")
        .replaceAll("G1/AIJ3", "比利时")
        .replaceAll("比利时/AIJ3", "比利时")
        .replaceAll("比利时/(韩国/I3/J3)", "比利时")
        .replaceAll("比利时/(韩国/塞内加尔/J3)", "比利时")
        .replaceAll("AEHIJ3", "塞内加尔")
        .replaceAll("AHIJ3", "塞内加尔")
        .replaceAll("AIJ3", "塞内加尔")
        .replaceAll("韩国I3J3", "塞内加尔")
        .replaceAll("韩国塞内加尔J3", "塞内加尔");
}

/** 将旧选项名 G1、G1/…、G1区 迁移为比利时/… */

export function renameG1InTeamName(team: string): string {
    if (team === "G1")
        return "比利时";
    if (team === "G1区")
        return "比利时区";
    if (team.includes("G1区"))
        return team.replaceAll("G1区", "比利时区");
    if (team.startsWith("G1/"))
        return `比利时/${team.slice(3)}`;
    if (team.endsWith("/G1"))
        return `${team.slice(0, -3)}/比利时`;
    return team;
}

/** 将旧选项名 G2、G2/… 迁移为埃及/… */

export function renameG2InTeamName(team: string): string {
    if (team === "G2")
        return "埃及";
    if (team.startsWith("G2/"))
        return `埃及/${team.slice(3)}`;
    if (team.endsWith("/G2"))
        return `${team.slice(0, -3)}/埃及`;
    return team;
}
export function migratePickTeam(marketId: string, team: string, candidates: string[]): string {
    let mapped = LEGACY_CANDIDATE_ALIASES[marketId]?.[team] ?? team;
    mapped = renameA1InTeamName(mapped);
    mapped = renameA2InTeamName(mapped);
    mapped = renameD1InTeamName(mapped);
    mapped = renameD2InTeamName(mapped);
    mapped = renameE1InTeamName(mapped);
    mapped = renameE2InTeamName(mapped);
    mapped = renameF1InTeamName(mapped);
    mapped = renameF2InTeamName(mapped);
    mapped = renameJ1InTeamName(mapped);
    mapped = renameSwitzerlandRound1OpponentInTeamName(mapped);
    mapped = renameB1InTeamName(mapped);
    mapped = renameB2InTeamName(mapped);
    mapped = renameC1InTeamName(mapped);
    mapped = renameC2InTeamName(mapped);
    mapped = renameJ2InTeamName(mapped);
    mapped = renameSpainRound1OpponentInTeamName(mapped);
    mapped = renameH1InTeamName(mapped);
    mapped = renameH2InTeamName(mapped);
    mapped = renameL1InTeamName(mapped);
    mapped = renameL2InTeamName(mapped);
    mapped = renameL3InTeamName(mapped);
    mapped = renameL1Round1OpponentInTeamName(mapped);
    mapped = renameK1Round1OpponentInTeamName(mapped);
    mapped = renameK1InTeamName(mapped);
    mapped = renameK2InTeamName(mapped);
    mapped = renameK3InTeamName(mapped);
    mapped = renameGermanyRound1OpponentInTeamName(mapped);
    mapped = renameI1Round1OpponentInTeamName(mapped);
    mapped = renameI1InTeamName(mapped);
    mapped = renameI2InTeamName(mapped);
    mapped = renameMexicoRound1OpponentInTeamName(mapped);
    mapped = renameUsaRound1OpponentInTeamName(mapped);
    mapped = renameG1Round1OpponentInTeamName(mapped);
    mapped = renameG1InTeamName(mapped);
    mapped = renameG2InTeamName(mapped);
    mapped = renameM21CandidateInTeamName(mapped);
    mapped = renameM22CandidateInTeamName(mapped);
    mapped = renameM23CandidateInTeamName(mapped);
    mapped = renameM24CandidateInTeamName(mapped);
    mapped = renameM25CandidateInTeamName(mapped);
    mapped = renameM26CandidateInTeamName(mapped);
    mapped = renameM27CandidateInTeamName(mapped);
    mapped = renameM28CandidateInTeamName(mapped);
    mapped = renameM3BracketCandidatesInTeamName(mapped);
    if (candidates.includes(mapped))
        return mapped;
    if (candidates.includes(team))
        return team;
    return mapped;
}
function pickTeamMatchesMarket(team: string, marketId: string, marketById: Map<string, Market>): boolean {
    const market = marketById.get(marketId);
    if (!market)
        return false;
    const candidates = market.candidates ?? [];
    const migrated = migratePickTeam(marketId, team, candidates);
    return candidates.includes(migrated);
}
function remapLegacyPage1Pick(pick: Pick, marketById: Map<string, Market>): Pick {
    const marketId = LEGACY_MARKET_ID_PREFIX_MAP[pick.marketId] ?? pick.marketId;
    const normalizedPick = marketId === pick.marketId ? pick : { ...pick, marketId };
    if (!normalizedPick.marketId.startsWith("m1-"))
        return normalizedPick;
    if (pickTeamMatchesMarket(normalizedPick.team, normalizedPick.marketId, marketById)) {
        return normalizedPick;
    }
    const slotMigration = PAGE1_SLOT_MIGRATION_MAP[normalizedPick.marketId];
    if (slotMigration &&
        pickTeamMatchesMarket(normalizedPick.team, slotMigration, marketById)) {
        return { ...normalizedPick, marketId: slotMigration };
    }
    const nextId = LEGACY_PAGE1_MARKET_ID_MAP[normalizedPick.marketId];
    if (!nextId || nextId === normalizedPick.marketId)
        return normalizedPick;
    if (pickTeamMatchesMarket(normalizedPick.team, nextId, marketById)) {
        return { ...normalizedPick, marketId: nextId };
    }
    return normalizedPick;
}
function dedupePickInputsByMarket(pickInputs: PlayerPickInput[]): PlayerPickInput[] {
    const byMarket = new Map<string, PlayerPickInput>();
    for (const input of pickInputs) {
        byMarket.set(input.marketId, input);
    }
    return [...byMarket.values()];
}
function dedupePicksByPlayerMarket(picks: Pick[]): Pick[] {
    const byKey = new Map<string, Pick>();
    for (const pick of picks) {
        byKey.set(`${pick.playerId}:${pick.marketId}`, pick);
    }
    return [...byKey.values()];
}
export function migratePicksForMarkets(picks: Pick[], markets: Market[]): Pick[] {
    const marketById = new Map(markets.map((market) => [market.id, market]));
    const migrated = picks.map((pick) => {
        const remapped = remapLegacyPage1Pick(pick, marketById);
        const market = marketById.get(remapped.marketId);
        if (!market)
            return remapped;
        const team = migratePickTeam(remapped.marketId, remapped.team, market.candidates ?? []);
        if (team === pick.team && remapped.marketId === pick.marketId)
            return pick;
        return { ...remapped, team };
    });
    return dedupePicksByPlayerMarket(migrated.filter((pick) => isPickTeamValidForMarket(marketById.get(pick.marketId), pick.team)));
}
export function migratePickInputsForMarkets(pickInputs: PlayerPickInput[], markets: Market[]): PlayerPickInput[] {
    const marketById = new Map(markets.map((market) => [market.id, market]));
    const migrated: PlayerPickInput[] = [];
    for (const input of pickInputs) {
        const remapped = remapLegacyPage1Pick({ playerId: "", marketId: input.marketId, team: input.team, stake: STAKE_PER_PICK }, marketById);
        const market = marketById.get(remapped.marketId);
        if (!market)
            continue;
        const team = migratePickTeam(remapped.marketId, remapped.team, market.candidates ?? []);
        if (!isPickTeamValidForMarket(market, team))
            continue;
        migrated.push({
            marketId: remapped.marketId,
            team,
            double: input.double
        });
    }
    return dedupePickInputsByMarket(migrated);
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
    {
        id: "m2-1",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["巴拉圭", "法国"],
        winner: null,
        page: 2
    },
    {
        id: "m2-2",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["加拿大", "摩洛哥"],
        winner: null,
        page: 2
    },
    {
        id: "m2-3",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["葡萄牙", "西班牙"],
        winner: null,
        page: 2
    },
    {
        id: "m2-4",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["美国", "比利时"],
        winner: null,
        page: 2
    },
    {
        id: "m2-5",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["巴西", "挪威"],
        winner: null,
        page: 2
    },
    {
        id: "m2-6",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["墨西哥", "英格兰"],
        winner: null,
        page: 2
    },
    {
        id: "m2-7",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["阿根廷", "埃及"],
        winner: null,
        page: 2
    },
    {
        id: "m2-8",
        round: "M2",
        name: "谁会晋级？",
        candidates: ["瑞士", "哥伦比亚"],
        winner: null,
        page: 2
    },
    {
        id: "m3-1",
        round: "M3",
        name: "第一场1/4决赛谁会晋级？",
        candidates: ["巴拉圭/法国", "摩洛哥/加拿大"],
        winner: null,
        page: 3
    },
    {
        id: "m3-2",
        round: "M3",
        name: "第二场1/4决赛谁会晋级？",
        candidates: ["西班牙/葡萄牙", "美国/比利时"],
        winner: null,
        page: 3
    },
    {
        id: "m3-3",
        round: "M3",
        name: "第三场1/4决赛谁会晋级？",
        candidates: ["巴西/挪威", "墨西哥/英格兰"],
        winner: null,
        page: 3
    },
    {
        id: "m3-4",
        round: "M3",
        name: "第四场1/4决赛谁会晋级？",
        candidates: ["阿根廷/埃及", "瑞士/哥伦比亚"],
        winner: null,
        page: 3
    },
    {
        id: "m3-5",
        round: "M3",
        name: "第一场半决赛谁会晋级？",
        candidates: [
            "巴拉圭/法国",
            "摩洛哥/加拿大",
            "西班牙/葡萄牙",
            "美国/比利时"
        ],
        winner: null,
        page: 3
    },
    {
        id: "m3-6",
        round: "M3",
        name: "第二场半决赛谁会晋级？",
        candidates: [
            "巴西/挪威",
            "墨西哥/英格兰",
            "阿根廷/埃及",
            "瑞士/哥伦比亚"
        ],
        winner: null,
        page: 3
    },
    {
        id: "m3-7",
        round: "M3",
        name: "谁能夺冠？",
        candidates: [
            "巴拉圭/法国",
            "摩洛哥/加拿大",
            "西班牙/葡萄牙",
            "美国/比利时",
            "巴西/挪威",
            "墨西哥/英格兰",
            "阿根廷/埃及",
            "瑞士/哥伦比亚"
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
    if (page === 1)
        return MIN_PAGE1_PICKS;
    if (page === 2)
        return MIN_PAGE2_PICKS;
    return MIN_PAGE3_PICKS;
}
export function marketsForPage(markets: Market[], page: PlayPage) {
    return markets.filter((m) => m.page === page);
}
export { isPageLocked, pageLocksAt, formatPageLockUtc, formatPageDeadlineDisplay } from "@/lib/page-lock";
export { isMarketLocked, isMarketPickFrozen, marketLocksAt, formatMarketLockDeadlineDisplay, applyLockedMarketPickPreservation, MARKET_LOCKS_AT } from "@/lib/market-lock";
function defaultMarketById(id: string) {
    return DEFAULT_MARKETS.find((m) => m.id === id);
}
function readStoredWinnerRaw(stored: Market | undefined): string | null {
    if (!stored)
        return null;
    const legacy = stored as Market & {
        winnerTeamId?: string | null;
    };
    return stored.winner ?? legacy.winnerTeamId ?? null;
}
function resolvePage1StoredWinner(base: Market, storedById: Map<string, Market>): string | null {
    const slotMatch = base.id.match(/^m1-(\d+)$/);
    if (!slotMatch)
        return null;
    const slot = Number(slotMatch[1]);
    const sourceNum = PAGE1_SOURCE_ORDER[slot - 1];
    const candidates = base.candidates ?? [];
    const tryWinner = (raw: string | null | undefined) => {
        if (raw == null)
            return null;
        const migrated = migratePickTeam(base.id, raw, candidates);
        return candidates.includes(migrated) ? migrated : null;
    };
    const direct = tryWinner(readStoredWinnerRaw(storedById.get(base.id)));
    if (direct)
        return direct;
    if (sourceNum !== slot) {
        const fromSource = tryWinner(readStoredWinnerRaw(storedById.get(`m1-${sourceNum}`)));
        if (fromSource)
            return fromSource;
    }
    for (const [oldSlot, newSlot] of Object.entries(PAGE1_SLOT_MIGRATION_MAP)) {
        if (newSlot !== base.id)
            continue;
        const fromOldSlot = tryWinner(readStoredWinnerRaw(storedById.get(oldSlot)));
        if (fromOldSlot)
            return fromOldSlot;
    }
    for (const [legacyId, modernId] of Object.entries(LEGACY_PAGE1_MARKET_ID_MAP)) {
        if (modernId !== base.id)
            continue;
        const fromLegacy = tryWinner(readStoredWinnerRaw(storedById.get(legacyId)));
        if (fromLegacy)
            return fromLegacy;
    }
    return null;
}
function resolvePage1StoredSettledAt(base: Market, storedById: Map<string, Market>, winner: string | null): string | null {
    if (!winner)
        return null;
    const slotMatch = base.id.match(/^m1-(\d+)$/);
    if (!slotMatch)
        return storedById.get(base.id)?.settledAt ?? null;
    const slot = Number(slotMatch[1]);
    const sourceNum = PAGE1_SOURCE_ORDER[slot - 1];
    const idsToCheck = [base.id];
    if (sourceNum !== slot)
        idsToCheck.push(`m1-${sourceNum}`);
    for (const [oldSlot, newSlot] of Object.entries(PAGE1_SLOT_MIGRATION_MAP)) {
        if (newSlot === base.id)
            idsToCheck.push(oldSlot);
    }
    for (const [legacyId, modernId] of Object.entries(LEGACY_PAGE1_MARKET_ID_MAP)) {
        if (modernId === base.id)
            idsToCheck.push(legacyId);
    }
    for (const id of idsToCheck) {
        const settledAt = storedById.get(id)?.settledAt;
        if (settledAt)
            return settledAt;
    }
    return null;
}
function resolveStoredWinner(base: Market, stored: Market | undefined, storedById: Map<string, Market>): string | null {
    if (base.page === 1) {
        return resolvePage1StoredWinner(base, storedById);
    }
    if (!stored)
        return null;
    const legacy = stored as Market & {
        winnerTeamId?: string | null;
    };
    const rawWinner = stored.winner ?? legacy.winnerTeamId ?? null;
    if (rawWinner == null)
        return null;
    const migrated = migratePickTeam(base.id, rawWinner, base.candidates ?? []);
    return (base.candidates ?? []).includes(migrated) ? migrated : null;
}
export function ensureMarketShape(markets: Market[]): Market[] {
    const storedById = new Map(markets.map((m) => [m.id, m]));
    return DEFAULT_MARKETS.map((base) => {
        const stored = storedById.get(base.id);
        const winner = resolveStoredWinner(base, stored, storedById);
        const settledAt = base.page === 1
            ? resolvePage1StoredSettledAt(base, storedById, winner)
            : winner
                ? stored?.settledAt ?? null
                : null;
        return {
            ...base,
            winner,
            settledAt
        };
    });
}
export function syncMarkets(stored: Market[] | null): Market[] {
    if (!stored || stored.length !== TOTAL_MARKETS) {
        return DEFAULT_MARKETS;
    }
    const usesTeamIds = stored.some((m) => {
        const legacy = m as Market & {
            candidateTeamIds?: string[];
        };
        return legacy.candidateTeamIds != null && m.candidates == null;
    });
    if (usesTeamIds) {
        return ensureMarketShape(stored);
    }
    return ensureMarketShape(stored);
}
