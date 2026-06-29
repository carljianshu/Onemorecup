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
  { playerId, marketId: "m2-3", team: "西班牙/奥地利", stake: 2 },
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
assert(migratedM3.find((p) => p.marketId === "m3-1")?.team === "荷兰/摩洛哥/加拿大");
assert(migratedM3.filter((p) => p.marketId === "m3-2").every((p) => p.team === "西班牙/奥地利/葡萄牙/克罗地亚"));
assert(migratedM3.find((p) => p.marketId === "m3-3")?.team === "墨西哥/厄瓜多尔/英格兰/民主刚果");
assert(migratedM3.find((p) => p.marketId === "m3-4")?.team === "瑞士/阿尔及利亚/哥伦比亚/加纳");
assert(migratedM3.find((p) => p.marketId === "m3-5")?.team === "美国/波黑/比利时/塞内加尔");

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
