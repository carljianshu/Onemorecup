/**
 * Smoke tests for pick migration / invalid-pick filtering.
 * Run: node src/utils/migrate-pick.test.mjs
 *
 * Uses dynamic import via tsx when available; falls back to skipping if not.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = `
import { DEFAULT_MARKETS, marketsCatalogDrift, migratePickInputsForMarkets, migratePicksForMarkets, syncMarkets } from "./src/data/markets.ts";

const markets = DEFAULT_MARKETS;
const playerId = "p-test";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) Valid current picks survive migration unchanged (count + teams).
const validPicks = [
  { playerId, marketId: "m1-1", team: "南非", stake: 1 },
  { playerId, marketId: "m1-16", team: "英格兰", stake: 1 },
  { playerId, marketId: "m2-3", team: "西班牙", stake: 2 },
];
const migratedValid = migratePicksForMarkets(validPicks, markets);
assert(migratedValid.length === 3, "valid picks should not be dropped");
assert(migratedValid.every((p) => validPicks.some((v) => v.marketId === p.marketId && v.team === p.team)), "valid teams unchanged");

// 2) Known legacy alias migrates instead of dropping.
const legacyPick = [{ playerId, marketId: "m1-16", team: "塞内加尔/民主刚果", stake: 1 }];
const migratedLegacy = migratePicksForMarkets(legacyPick, markets);
assert(migratedLegacy.length === 1, "legacy pick should migrate");
assert(migratedLegacy[0].team === "民主刚果", "legacy opponent should become 民主刚果");

// 3) Truly invalid pick is dropped (not thrown).
const invalidPick = [{ playerId, marketId: "m1-16", team: "这是一支不存在的队", stake: 1 }];
const migratedInvalid = migratePicksForMarkets(invalidPick, markets);
assert(migratedInvalid.length === 0, "invalid pick should be dropped");

// 4) merge-style inputs: page input wins on duplicate market after migration.
const mergedInputs = [
  { marketId: "m1-16", team: "塞内加尔/民主刚果", double: false },
  { marketId: "m1-16", team: "民主刚果", double: true },
];
const migratedInputs = migratePickInputsForMarkets(mergedInputs, markets);
assert(migratedInputs.length === 1, "deduped to one m1-16");
assert(migratedInputs[0].team === "民主刚果", "later page input wins");
assert(migratedInputs[0].double === true, "double flag preserved");

// 5) M2-2 legacy composite migrates to 加拿大.
const m22Legacy = [{ playerId, marketId: "m2-2", team: "南非/加拿大", stake: 1 }];
const migratedM22 = migratePicksForMarkets(m22Legacy, markets);
assert(migratedM22.length === 1, "m2-2 legacy pick should migrate");
assert(migratedM22[0].team === "加拿大", "m2-2 南非/加拿大 should become 加拿大");

const m22Current = [{ playerId, marketId: "m2-2", team: "加拿大", stake: 1 }];
const migratedM22Current = migratePicksForMarkets(m22Current, markets);
assert(migratedM22Current.length === 1 && migratedM22Current[0].team === "加拿大", "m2-2 加拿大 unchanged");

const m22MoroccoLegacy = [
  { playerId, marketId: "m2-2", team: "荷兰/摩洛哥", stake: 1 },
  { playerId: "p-m22b", marketId: "m2-2", team: "F1/摩洛哥", stake: 1 },
];
const migratedM22Morocco = migratePicksForMarkets(m22MoroccoLegacy, markets);
assert(migratedM22Morocco.length === 2, "m2-2 荷兰/摩洛哥 legacy picks should migrate");
assert(migratedM22Morocco.every((p) => p.team === "摩洛哥"), "m2-2 荷兰/摩洛哥 should become 摩洛哥");

const m22MoroccoCurrent = [{ playerId, marketId: "m2-2", team: "摩洛哥", stake: 1 }];
const migratedM22MoroccoCurrent = migratePicksForMarkets(m22MoroccoCurrent, markets);
assert(migratedM22MoroccoCurrent.length === 1 && migratedM22MoroccoCurrent[0].team === "摩洛哥", "m2-2 摩洛哥 unchanged");

// 5b) M2-5 legacy composite migrates to 巴西.
const m25Legacy = [
  { playerId, marketId: "m2-5", team: "巴西/日本", stake: 1 },
  { playerId: "p-m25b", marketId: "m2-5", team: "巴西/F2", stake: 1 },
];
const migratedM25 = migratePicksForMarkets(m25Legacy, markets);
assert(migratedM25.length === 2, "m2-5 legacy picks should migrate");
assert(migratedM25.every((p) => p.team === "巴西"), "m2-5 legacy options should become 巴西");

const m25Current = [{ playerId, marketId: "m2-5", team: "巴西", stake: 1 }];
const migratedM25Current = migratePicksForMarkets(m25Current, markets);
assert(migratedM25Current.length === 1 && migratedM25Current[0].team === "巴西", "m2-5 巴西 unchanged");

// 6) M3 bracket renames (zone labels and old composites).
const m3Legacy = [
  { playerId: "p-m3a", marketId: "m3-1", team: "荷兰/摩洛哥/南非/加拿大", stake: 1 },
  { playerId: "p-m3b", marketId: "m3-2", team: "西班牙区", stake: 1 },
  { playerId: "p-m3c", marketId: "m3-2", team: "H1区", stake: 1 },
  { playerId: "p-m3d", marketId: "m3-3", team: "墨西哥/英格兰区", stake: 1 },
  { playerId: "p-m3e", marketId: "m3-4", team: "瑞士/哥伦比亚区", stake: 1 },
  { playerId: "p-m3f", marketId: "m3-5", team: "美国/比利时区", stake: 1 },
];
const migratedM3 = migratePicksForMarkets(m3Legacy, markets);
assert(migratedM3.length === 6, "all m3 legacy picks should migrate");
assert(migratedM3.find((p) => p.marketId === "m3-1")?.team === "摩洛哥");

const m3MoroccoCanadaLegacy = [
  { playerId: "p-m3-mc", marketId: "m3-5", team: "荷兰/摩洛哥/加拿大", stake: 1 },
  { playerId: "p-m3-mc2", marketId: "m3-7", team: "荷兰区", stake: 1 },
];
const migratedM3MoroccoCanada = migratePicksForMarkets(m3MoroccoCanadaLegacy, markets);
assert(migratedM3MoroccoCanada.length === 2, "m3 荷兰/摩洛哥/加拿大 legacy picks should migrate");
assert(migratedM3MoroccoCanada.every((p) => p.team === "摩洛哥"), "m3 荷兰/摩洛哥/加拿大 should become 摩洛哥");

const m3MoroccoCanadaDirect = [
  { playerId: "p-m3-mcd", marketId: "m3-1", team: "摩洛哥/加拿大", stake: 1 },
  { playerId: "p-m3-mcd2", marketId: "m3-7", team: "摩洛哥/加拿大", stake: 1 },
];
const migratedM3MoroccoCanadaDirect = migratePicksForMarkets(m3MoroccoCanadaDirect, markets);
assert(migratedM3MoroccoCanadaDirect.every((p) => p.team === "摩洛哥"), "m3 摩洛哥/加拿大 should become 摩洛哥");
assert(migratedM3.filter((p) => p.marketId === "m3-2").every((p) => p.team === "西班牙"));
assert(migratedM3.find((p) => p.marketId === "m3-3")?.team === "英格兰");
assert(migratedM3.find((p) => p.marketId === "m3-4")?.team === "瑞士");
assert(migratedM3.find((p) => p.marketId === "m3-5")?.team === "比利时");

const m3BrazilLegacy = [
  { playerId: "p-m3-br", marketId: "m3-3", team: "巴西/日本/科特迪瓦/挪威", stake: 1 },
  { playerId: "p-m3-bz", marketId: "m3-6", team: "巴西区", stake: 1 },
];
const migratedM3Brazil = migratePicksForMarkets(m3BrazilLegacy, markets);
assert(migratedM3Brazil.length === 2, "m3 brazil bracket legacy picks should migrate");
assert(migratedM3Brazil.every((p) => p.team === "挪威"), "m3 brazil bracket should become 挪威");

const m25NorwayLegacy = [
  { playerId, marketId: "m2-5", team: "科特迪瓦/挪威", stake: 1 },
  { playerId: "p-m25c", marketId: "m2-5", team: "E2/(法国/挪威)", stake: 1 },
];
const migratedM25Norway = migratePicksForMarkets(m25NorwayLegacy, markets);
assert(migratedM25Norway.length === 2, "m2-5 科特迪瓦/挪威 legacy picks should migrate");
assert(migratedM25Norway.every((p) => p.team === "挪威"), "m2-5 科特迪瓦/挪威 should become 挪威");

const m3BrazilBracketLegacy = [
  { playerId: "p-m3-br2", marketId: "m3-6", team: "巴西/科特迪瓦/挪威", stake: 1 },
];
const migratedM3BrazilBracket = migratePicksForMarkets(m3BrazilBracketLegacy, markets);
assert(migratedM3BrazilBracket.length === 1 && migratedM3BrazilBracket[0].team === "挪威");

const m21FranceLegacy = [
  { playerId, marketId: "m2-1", team: "法国/瑞典", stake: 1 },
  { playerId: "p-m21b", marketId: "m2-1", team: "I1/CDFGH3", stake: 1 },
];
const migratedM21France = migratePicksForMarkets(m21FranceLegacy, markets);
assert(migratedM21France.length === 2, "m2-1 法国/瑞典 legacy picks should migrate");
assert(migratedM21France.every((p) => p.team === "法国"), "m2-1 法国/瑞典 should become 法国");

const m3ParaguayFranceLegacy = [
  { playerId, marketId: "m3-1", team: "巴拉圭/法国/瑞典", stake: 1 },
  { playerId: "p-m3-pf", marketId: "m3-7", team: "德国/巴拉圭/法国/瑞典", stake: 1 },
];
const migratedM3ParaguayFrance = migratePicksForMarkets(m3ParaguayFranceLegacy, markets);
assert(migratedM3ParaguayFrance.length === 2, "m3 巴拉圭/法国/瑞典 legacy picks should migrate");
assert(migratedM3ParaguayFrance.every((p) => p.team === "法国"), "m3 巴拉圭/法国/瑞典 should become 法国");

const m3FranceDirect = [
  { playerId: "p-m3-fr", marketId: "m3-1", team: "巴拉圭/法国", stake: 1 },
  { playerId: "p-m3-fr2", marketId: "m3-5", team: "巴拉圭/法国", stake: 1 },
];
const migratedM3FranceDirect = migratePicksForMarkets(m3FranceDirect, markets);
assert(migratedM3FranceDirect.every((p) => p.team === "法国"), "m3 巴拉圭/法国 should become 法国");

const m26MexicoLegacy = [
  { playerId, marketId: "m2-6", team: "墨西哥/厄瓜多尔", stake: 1 },
  { playerId: "p-m26b", marketId: "m2-6", team: "墨西哥/CEFHI3", stake: 1 },
];
const migratedM26Mexico = migratePicksForMarkets(m26MexicoLegacy, markets);
assert(migratedM26Mexico.length === 2, "m2-6 墨西哥/厄瓜多尔 legacy picks should migrate");
assert(migratedM26Mexico.every((p) => p.team === "墨西哥"), "m2-6 墨西哥/厄瓜多尔 should become 墨西哥");

const m3MexicoEnglandLegacy = [
  { playerId, marketId: "m3-3", team: "墨西哥/厄瓜多尔/英格兰/民主刚果", stake: 1 },
  { playerId: "p-m3-me", marketId: "m3-7", team: "墨西哥/英格兰区", stake: 1 },
];
const migratedM3MexicoEngland = migratePicksForMarkets(m3MexicoEnglandLegacy, markets);
assert(migratedM3MexicoEngland.length === 2, "m3 墨西哥/厄瓜多尔/英格兰/民主刚果 legacy picks should migrate");
assert(migratedM3MexicoEngland.every((p) => p.team === "英格兰"), "m3 should drop 厄瓜多尔与民主刚果 from bracket option");

const m3BrazilNorwayDirect = [
  { playerId: "p-m3-bn", marketId: "m3-3", team: "巴西/挪威", stake: 1 },
  { playerId: "p-m3-bn2", marketId: "m3-7", team: "巴西/挪威", stake: 1 },
];
const migratedM3BrazilNorwayDirect = migratePicksForMarkets(m3BrazilNorwayDirect, markets);
assert(migratedM3BrazilNorwayDirect.every((p) => p.team === "挪威"), "m3 巴西/挪威 should become 挪威");

const m3MexicoEnglandDirect = [
  { playerId: "p-m3-me2", marketId: "m3-6", team: "墨西哥/英格兰", stake: 1 },
  { playerId: "p-m3-me3", marketId: "m3-7", team: "墨西哥/英格兰", stake: 1 },
];
const migratedM3MexicoEnglandDirect = migratePicksForMarkets(m3MexicoEnglandDirect, markets);
assert(migratedM3MexicoEnglandDirect.every((p) => p.team === "英格兰"), "m3 墨西哥/英格兰 should become 英格兰");

const m26EnglandLegacy = [
  { playerId, marketId: "m2-6", team: "英格兰/民主刚果", stake: 1 },
  { playerId: "p-m26e", marketId: "m2-6", team: "L1/EHIJK3", stake: 1 },
];
const migratedM26England = migratePicksForMarkets(m26EnglandLegacy, markets);
assert(migratedM26England.length === 2, "m2-6 英格兰/民主刚果 legacy picks should migrate");
assert(migratedM26England.every((p) => p.team === "英格兰"), "m2-6 英格兰/民主刚果 should become 英格兰");

const m24BelgiumLegacy = [
  { playerId, marketId: "m2-4", team: "比利时/塞内加尔", stake: 1 },
  { playerId: "p-m24b", marketId: "m2-4", team: "G1/AEHIJ3", stake: 1 },
];
const migratedM24Belgium = migratePicksForMarkets(m24BelgiumLegacy, markets);
assert(migratedM24Belgium.length === 2, "m2-4 比利时/塞内加尔 legacy picks should migrate");
assert(migratedM24Belgium.every((p) => p.team === "比利时"), "m2-4 比利时/塞内加尔 should become 比利时");

const m3UsaBelgiumLegacy = [
  { playerId, marketId: "m3-2", team: "美国/波黑/比利时/塞内加尔", stake: 1 },
  { playerId: "p-m3-ub", marketId: "m3-7", team: "美国/比利时区", stake: 1 },
];
const migratedM3UsaBelgium = migratePicksForMarkets(m3UsaBelgiumLegacy, markets);
assert(migratedM3UsaBelgium.length === 2, "m3 美国/波黑/比利时/塞内加尔 legacy picks should migrate");
assert(migratedM3UsaBelgium.every((p) => p.team === "比利时"), "m3 should drop 塞内加尔与波黑 from bracket option");

const m24UsaLegacy = [
  { playerId, marketId: "m2-4", team: "美国/波黑", stake: 1 },
  { playerId: "p-m24u", marketId: "m2-4", team: "美国/BEFIJ3", stake: 1 },
];
const migratedM24Usa = migratePicksForMarkets(m24UsaLegacy, markets);
assert(migratedM24Usa.length === 2, "m2-4 美国/波黑 legacy picks should migrate");
assert(migratedM24Usa.every((p) => p.team === "美国"), "m2-4 美国/波黑 should become 美国");

const m3UsaBelgiumCurrentLegacy = [
  { playerId, marketId: "m3-2", team: "美国/波黑/比利时", stake: 1 },
  { playerId: "p-m3-ub2", marketId: "m3-7", team: "待填 4", stake: 1 },
];
const migratedM3UsaBelgiumCurrent = migratePicksForMarkets(m3UsaBelgiumCurrentLegacy, markets);
assert(migratedM3UsaBelgiumCurrent.length === 2, "m3 美国/波黑/比利时 legacy picks should migrate");
assert(migratedM3UsaBelgiumCurrent.every((p) => p.team === "比利时"), "m3 should drop 波黑 from bracket option");

const m23PortugalSpainLegacy = [
  { playerId, marketId: "m2-3", team: "葡萄牙/克罗地亚", stake: 1 },
  { playerId: "p-m23s", marketId: "m2-3", team: "H1/(奥地利/阿尔及利亚)", stake: 1 },
];
const migratedM23PortugalSpain = migratePicksForMarkets(m23PortugalSpainLegacy, markets);
assert(migratedM23PortugalSpain.length === 2, "m2-3 葡萄牙/克罗地亚与西班牙/奥地利 legacy picks should migrate");
assert(migratedM23PortugalSpain.find((p) => p.marketId === "m2-3" && p.team === "葡萄牙")?.team === "葡萄牙");
assert(migratedM23PortugalSpain.find((p) => p.marketId === "m2-3" && p.team === "西班牙")?.team === "西班牙");

const m3SpainPortugalLegacy = [
  { playerId, marketId: "m3-2", team: "西班牙/奥地利/葡萄牙/克罗地亚", stake: 1 },
  { playerId: "p-m3-sp", marketId: "m3-7", team: "H1区", stake: 1 },
];
const migratedM3SpainPortugal = migratePicksForMarkets(m3SpainPortugalLegacy, markets);
assert(migratedM3SpainPortugal.length === 2, "m3 西班牙/奥地利/葡萄牙/克罗地亚 legacy picks should migrate");
assert(migratedM3SpainPortugal.every((p) => p.team === "西班牙"), "m3 should drop 奥地利与克罗地亚 from bracket option");

const m3SpainBelgiumDirect = [
  { playerId, marketId: "m3-2", team: "西班牙/葡萄牙", stake: 1 },
  { playerId: "p-m3-sb", marketId: "m3-5", team: "美国/比利时", stake: 1 },
  { playerId: "p-m3-sb2", marketId: "m3-7", team: "西班牙/葡萄牙", stake: 1 },
];
const migratedM3SpainBelgiumDirect = migratePicksForMarkets(m3SpainBelgiumDirect, markets);
assert(migratedM3SpainBelgiumDirect.length === 3, "m3 西班牙/葡萄牙 and 美国/比利时 direct picks should migrate");
assert(
  migratedM3SpainBelgiumDirect.find((p) => p.marketId === "m3-2")?.team === "西班牙",
  "m3-2 西班牙/葡萄牙 should become 西班牙"
);
assert(
  migratedM3SpainBelgiumDirect.find((p) => p.marketId === "m3-5")?.team === "比利时",
  "m3-5 美国/比利时 should become 比利时"
);
assert(
  migratedM3SpainBelgiumDirect.find((p) => p.marketId === "m3-7")?.team === "西班牙",
  "m3-7 西班牙/葡萄牙 should become 西班牙"
);

const m28SwitzerlandLegacy = [
  { playerId, marketId: "m2-8", team: "瑞士/阿尔及利亚", stake: 1 },
  { playerId: "p-m28b", marketId: "m2-8", team: "瑞士/EFGIJ3", stake: 1 },
];
const migratedM28Switzerland = migratePicksForMarkets(m28SwitzerlandLegacy, markets);
assert(migratedM28Switzerland.length === 2, "m2-8 瑞士/阿尔及利亚 legacy picks should migrate");
assert(migratedM28Switzerland.every((p) => p.team === "瑞士"), "m2-8 瑞士/阿尔及利亚 should become 瑞士");

const m3SwitzerlandBracketLegacy = [
  { playerId, marketId: "m3-4", team: "瑞士/阿尔及利亚/哥伦比亚/加纳", stake: 1 },
  { playerId: "p-m3-sw", marketId: "m3-7", team: "待填 8", stake: 1 },
];
const migratedM3SwitzerlandBracket = migratePicksForMarkets(m3SwitzerlandBracketLegacy, markets);
assert(migratedM3SwitzerlandBracket.length === 2, "m3 瑞士/阿尔及利亚/哥伦比亚/加纳 legacy picks should migrate");
assert(migratedM3SwitzerlandBracket.every((p) => p.team === "瑞士"), "m3 should drop 阿尔及利亚 from bracket option");

const m28ColombiaLegacy = [
  { playerId, marketId: "m2-8", team: "哥伦比亚/加纳", stake: 1 },
  { playerId: "p-m28c", marketId: "m2-8", team: "K1/L3", stake: 1 },
];
const migratedM28Colombia = migratePicksForMarkets(m28ColombiaLegacy, markets);
assert(migratedM28Colombia.length === 2, "m2-8 哥伦比亚/加纳 legacy picks should migrate");
assert(migratedM28Colombia.every((p) => p.team === "哥伦比亚"), "m2-8 哥伦比亚/加纳 should become 哥伦比亚");

const m3ColombiaBracketLegacy = [
  { playerId, marketId: "m3-4", team: "瑞士/哥伦比亚/加纳", stake: 1 },
  { playerId: "p-m3-co", marketId: "m3-7", team: "瑞士/K1区", stake: 1 },
];
const migratedM3ColombiaBracket = migratePicksForMarkets(m3ColombiaBracketLegacy, markets);
assert(migratedM3ColombiaBracket.length === 2, "m3 瑞士/哥伦比亚/加纳 legacy picks should migrate");
assert(migratedM3ColombiaBracket.every((p) => p.team === "瑞士"), "m3 should drop 加纳 from bracket option");

const m27EgyptLegacy = [
  { playerId, marketId: "m2-7", team: "澳大利亚/埃及", stake: 1 },
  { playerId: "p-m27b", marketId: "m2-7", team: "D2/G2", stake: 1 },
];
const migratedM27Egypt = migratePicksForMarkets(m27EgyptLegacy, markets);
assert(migratedM27Egypt.length === 2, "m2-7 澳大利亚/埃及 legacy picks should migrate");
assert(migratedM27Egypt.every((p) => p.team === "埃及"), "m2-7 澳大利亚/埃及 should become 埃及");

const m3ArgentinaEgyptLegacy = [
  { playerId, marketId: "m3-4", team: "阿根廷/佛得角/澳大利亚/埃及", stake: 1 },
  { playerId: "p-m3-ae", marketId: "m3-7", team: "待填 7", stake: 1 },
];
const migratedM3ArgentinaEgypt = migratePicksForMarkets(m3ArgentinaEgyptLegacy, markets);
assert(migratedM3ArgentinaEgypt.length === 2, "m3 阿根廷/佛得角/澳大利亚/埃及 legacy picks should migrate");
assert(migratedM3ArgentinaEgypt.every((p) => p.team === "阿根廷"), "m3 should drop 澳大利亚 from bracket option");

const m27ArgentinaLegacy = [
  { playerId, marketId: "m2-7", team: "阿根廷/佛得角", stake: 1 },
  { playerId: "p-m27a", marketId: "m2-7", team: "阿根廷/H2", stake: 1 },
];
const migratedM27Argentina = migratePicksForMarkets(m27ArgentinaLegacy, markets);
assert(migratedM27Argentina.length === 2, "m2-7 阿根廷/佛得角 legacy picks should migrate");
assert(migratedM27Argentina.every((p) => p.team === "阿根廷"), "m2-7 阿根廷/佛得角 should become 阿根廷");

const m3ArgentinaBracketLegacy = [
  { playerId, marketId: "m3-4", team: "阿根廷/佛得角/埃及", stake: 1 },
  { playerId: "p-m3-ar", marketId: "m3-7", team: "阿根廷区", stake: 1 },
];
const migratedM3ArgentinaBracket = migratePicksForMarkets(m3ArgentinaBracketLegacy, markets);
assert(migratedM3ArgentinaBracket.length === 2, "m3 阿根廷/佛得角/埃及 legacy picks should migrate");
assert(migratedM3ArgentinaBracket.every((p) => p.team === "阿根廷"), "m3 should drop 佛得角 from bracket option");

const staleStored = DEFAULT_MARKETS.map((market) => {
  if (market.id === "m3-2") return { ...market, candidates: ["西班牙/葡萄牙", "美国/比利时"] };
  if (market.id === "m3-5") return { ...market, candidates: ["法国", "摩洛哥", "西班牙/葡萄牙", "美国/比利时"] };
  if (market.id === "m3-7") {
    return {
      ...market,
      candidates: ["法国", "摩洛哥", "西班牙/葡萄牙", "美国/比利时", "挪威", "英格兰", "阿根廷/埃及", "瑞士/哥伦比亚"]
    };
  }
  return market;
});
assert(marketsCatalogDrift(staleStored), "stale stored candidates should be detected");
const resynced = syncMarkets(staleStored);
assert(JSON.stringify(resynced.find((m) => m.id === "m3-2")?.candidates) === JSON.stringify(["西班牙", "比利时"]));
assert(!marketsCatalogDrift(resynced), "resynced markets should match catalog");

console.log("migrate-pick smoke tests passed");
`;

const result = spawnSync("npx", ["--yes", "tsx", "-e", script], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
console.log(result.stdout.trim());
