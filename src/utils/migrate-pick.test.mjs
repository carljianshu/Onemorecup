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
import { DEFAULT_MARKETS, migratePickInputsForMarkets, migratePicksForMarkets } from "./src/data/markets.ts";

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
assert(migratedM3.find((p) => p.marketId === "m3-1")?.team === "摩洛哥/加拿大");

const m3MoroccoCanadaLegacy = [
  { playerId: "p-m3-mc", marketId: "m3-5", team: "荷兰/摩洛哥/加拿大", stake: 1 },
  { playerId: "p-m3-mc2", marketId: "m3-7", team: "荷兰区", stake: 1 },
];
const migratedM3MoroccoCanada = migratePicksForMarkets(m3MoroccoCanadaLegacy, markets);
assert(migratedM3MoroccoCanada.length === 2, "m3 荷兰/摩洛哥/加拿大 legacy picks should migrate");
assert(migratedM3MoroccoCanada.every((p) => p.team === "摩洛哥/加拿大"), "m3 荷兰/摩洛哥/加拿大 should become 摩洛哥/加拿大");
assert(migratedM3.filter((p) => p.marketId === "m3-2").every((p) => p.team === "西班牙/葡萄牙"));
assert(migratedM3.find((p) => p.marketId === "m3-3")?.team === "墨西哥/英格兰");
assert(migratedM3.find((p) => p.marketId === "m3-4")?.team === "瑞士/哥伦比亚/加纳");
assert(migratedM3.find((p) => p.marketId === "m3-5")?.team === "美国/比利时");

const m3BrazilLegacy = [
  { playerId: "p-m3-br", marketId: "m3-3", team: "巴西/日本/科特迪瓦/挪威", stake: 1 },
  { playerId: "p-m3-bz", marketId: "m3-6", team: "巴西区", stake: 1 },
];
const migratedM3Brazil = migratePicksForMarkets(m3BrazilLegacy, markets);
assert(migratedM3Brazil.length === 2, "m3 brazil bracket legacy picks should migrate");
assert(migratedM3Brazil.every((p) => p.team === "巴西/挪威"), "m3 brazil bracket should drop 日本与科特迪瓦");

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
assert(migratedM3BrazilBracket.length === 1 && migratedM3BrazilBracket[0].team === "巴西/挪威");

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
assert(migratedM3ParaguayFrance.every((p) => p.team === "巴拉圭/法国"), "m3 巴拉圭/法国/瑞典 should become 巴拉圭/法国");

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
assert(migratedM3MexicoEngland.every((p) => p.team === "墨西哥/英格兰"), "m3 should drop 厄瓜多尔与民主刚果 from bracket option");

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
assert(migratedM3UsaBelgium.every((p) => p.team === "美国/比利时"), "m3 should drop 塞内加尔与波黑 from bracket option");

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
assert(migratedM3UsaBelgiumCurrent.every((p) => p.team === "美国/比利时"), "m3 should drop 波黑 from bracket option");

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
assert(migratedM3SpainPortugal.every((p) => p.team === "西班牙/葡萄牙"), "m3 should drop 奥地利与克罗地亚 from bracket option");

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
assert(migratedM3SwitzerlandBracket.every((p) => p.team === "瑞士/哥伦比亚/加纳"), "m3 should drop 阿尔及利亚 from bracket option");

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
