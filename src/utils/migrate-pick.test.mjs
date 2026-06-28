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
