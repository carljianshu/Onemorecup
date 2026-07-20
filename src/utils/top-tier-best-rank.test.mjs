import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import { DEFAULT_MARKETS } from "./src/data/markets.ts";
import {
  countRemainingPhase3Scenarios,
  computeTopTierBestRank,
  phase3WinnersForScenarioMask,
  shouldComputeTopTierBestRank
} from "./src/lib/top-tier-best-rank.ts";
import { computeRankLockSnapshot } from "./src/lib/rank-lock.ts";
import { buildLeaderboard } from "./src/lib/scoring.ts";
import { applyManualPageLock } from "./src/lib/page-lock.ts";

const createdAt = "2026-01-01T00:00:00.000Z";
const players = Array.from({ length: 4 }, (_, index) => ({
  id: \`p\${index + 1}\`,
  name: \`Player \${index + 1}\`,
  createdAt,
  pickStats: { page1Count: 8, page2Count: 4, page3Count: 4, totalCount: 16 }
}));
const picks = [];
const markets = DEFAULT_MARKETS.map((market) => ({ ...market }));

assert.equal(countRemainingPhase3Scenarios(markets), 128, "all page-3 markets unsettled → 128 paths");

const mask0 = phase3WinnersForScenarioMask(markets, 0);
assert(mask0);
assert.equal(mask0["m3-5"], mask0["m3-1"]);
assert.equal(mask0["m3-7"], mask0["m3-5"]);

const settledQf1 = markets.map((market) =>
  market.id === "m3-1" ? { ...market, winner: "法国" } : market
);
assert.equal(countRemainingPhase3Scenarios(settledQf1), 64, "one QF settled → 64 paths");

const config = applyManualPageLock(
  {
    rankLockApplied: true,
    ...computeRankLockSnapshot(buildLeaderboard(players, markets, picks))
  },
  3,
  true
);
assert(shouldComputeTopTierBestRank(config));

const withoutLock = computeTopTierBestRank(players, markets, picks, {
  ...config,
  rankLockApplied: false
});
assert.equal(withoutLock, null);

const result = computeTopTierBestRank(players, markets, picks, config);
assert(result);
assert.equal(result.remainingScenarioCount, 128);
assert.equal(result.bestRankByPlayerId.size, 3, "top 3 of 4 players on rank lock");

const allSettled = markets.map((market) => {
  if (!market.id.startsWith("m3-"))
    return market;
  return { ...market, winner: market.candidates[0] };
});
const singlePath = computeTopTierBestRank(players, allSettled, picks, config);
assert(singlePath);
assert.equal(singlePath.remainingScenarioCount, 1);

console.log("top-tier-best-rank smoke tests passed");
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
