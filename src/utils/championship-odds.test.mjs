import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import { DEFAULT_MARKETS } from "./src/data/markets.ts";
import {
  buildChampionshipOddsStateFromMarkets,
  computeChampionshipOdds,
  computeScenarioProbability,
  settleChampionshipOddsQuarterFinal
} from "./src/lib/championship-odds.ts";
import { phase3WinnersForScenarioMask } from "./src/lib/top-tier-best-rank.ts";
import { computeRankLockSnapshot } from "./src/lib/rank-lock.ts";
import { buildLeaderboard } from "./src/lib/scoring.ts";
import { applyManualPageLock } from "./src/lib/page-lock.ts";

const markets = DEFAULT_MARKETS.map((market) => ({ ...market }));
const m31France = markets.map((market) =>
  market.id === "m3-1" ? { ...market, winner: "法国" } : market
);

const state = buildChampionshipOddsStateFromMarkets(m31France);
assert(state.markets.get("m3-1")?.get("法国") === 100);
assert(state.markets.get("m3-1")?.get("摩洛哥") === 0);

let pathCount = 0;
let probSum = 0;
const seen = new Set();
for (let mask = 0; mask < 128; mask++) {
  const winners = phase3WinnersForScenarioMask(m31France, mask);
  if (!winners) continue;
  const key = Object.values(winners).join("|");
  if (seen.has(key)) continue;
  seen.add(key);
  pathCount++;
  probSum += computeScenarioProbability(winners, state);
}
assert.equal(pathCount, 64, "M3-1 settled → 64 paths");
assert.ok(probSum > 0.5 && probSum < 1.5, "scenario probabilities roughly sum to ~1");

const franceChampion = phase3WinnersForScenarioMask(m31France, 4);
assert(franceChampion);
const pFrance = computeScenarioProbability(franceChampion, state);
assert.ok(pFrance > 0, "France champion path has positive probability");

const afterSpainQf = buildChampionshipOddsStateFromMarkets(
  m31France.map((market) =>
    market.id === "m3-2" ? { ...market, winner: "西班牙" } : market
  )
);
assert.equal(afterSpainQf.markets.get("m3-2")?.get("西班牙"), 100);
assert.equal(afterSpainQf.markets.get("m3-2")?.get("比利时"), 0);
assert.equal(
  afterSpainQf.markets.get("m3-5")?.get("法国"),
  57.7
);
assert.equal(
  afterSpainQf.markets.get("m3-5")?.get("西班牙"),
  42.3
);
assert.equal(
  afterSpainQf.markets.get("m3-7")?.get("西班牙"),
  23.45
);

const createdAt = "2026-01-01T00:00:00.000Z";
const players = Array.from({ length: 4 }, (_, index) => ({
  id: \`p\${index + 1}\`,
  name: \`Player \${index + 1}\`,
  createdAt,
  pickStats: { page1Count: 8, page2Count: 4, page3Count: 4, totalCount: 16 }
}));
const picks = [];
const config = applyManualPageLock(
  {
    rankLockApplied: true,
    ...computeRankLockSnapshot(buildLeaderboard(players, m31France, picks))
  },
  3,
  true
);
const odds = computeChampionshipOdds(players, m31France, picks, config);
assert(odds);
assert.equal(odds.remainingScenarioCount, 64);
assert.ok(odds.oddsByPlayerId.size >= 1);

console.log("championship-odds smoke tests passed");
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
