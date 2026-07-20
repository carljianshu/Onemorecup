import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import {
  applyRankLockTierSort,
  computeRankLockSnapshot,
  filterPicksForPage3MarketResultsDisplay,
  filterPicksForParimutuelPool,
  isPlayerInRankLockBottomTier,
  isRankLockApplied,
  parimutuelPoolUsesTopTierOnly
} from "./src/lib/rank-lock.ts";
import { buildMarketResultSections } from "./src/lib/market-results.ts";
import { promotionCutoffCount } from "./src/lib/promotion.ts";
import {
  buildLeaderboard,
  computeParimutuelBreakdown,
  computeProjectedStakeBreakdown,
  settlePickGroup
} from "./src/lib/scoring.ts";
import {
  calculatePage3PickPenalty,
  isExemptFromPage3PickPenalty
} from "./src/lib/pick-penalty.ts";
import { validatePageSave } from "./src/lib/pick-stats.ts";

const createdAt = "2026-01-01T00:00:00.000Z";

function entry(id, netEarnings) {
  return { playerId: id, netEarnings, createdAt };
}

function pick(playerId, marketId, team, stake = 1) {
  return { playerId, marketId, team, stake };
}

assert.equal(promotionCutoffCount(31), 21, "31 players -> top 21 at promotion line");

const leaderboard = Array.from({ length: 31 }, (_, i) =>
  entry(\`p\${i + 1}\`, 100 - i)
);
const snapshot = computeRankLockSnapshot(leaderboard);
assert.equal(snapshot.rankLockTopPlayerIds?.length, 21);
assert.equal(snapshot.rankLockBottomPlayerIds?.length, 10);

const config = {
  rankLockApplied: true,
  rankLockAppliedAt: snapshot.rankLockAppliedAt,
  rankLockTopPlayerIds: snapshot.rankLockTopPlayerIds,
  rankLockBottomPlayerIds: snapshot.rankLockBottomPlayerIds
};
assert(isRankLockApplied(config));

const bottomId = snapshot.rankLockBottomPlayerIds[0];
const topId = snapshot.rankLockTopPlayerIds[snapshot.rankLockTopPlayerIds.length - 1];
assert(isPlayerInRankLockBottomTier(config, bottomId));
assert(!isPlayerInRankLockBottomTier(config, topId));
assert(!isPlayerInRankLockBottomTier(config, null));
assert(!isPlayerInRankLockBottomTier({ ...config, rankLockApplied: false }, bottomId));
const shuffled = [
  entry(bottomId, 999),
  entry(topId, 1),
  ...leaderboard.filter((e) => e.playerId !== bottomId && e.playerId !== topId)
];
const sorted = applyRankLockTierSort(shuffled, config);
const bottomRank = sorted.findIndex((e) => e.playerId === bottomId);
const topRank = sorted.findIndex((e) => e.playerId === topId);
assert(topRank < bottomRank, "bottom tier with higher score still ranks after top tier");
assert.equal(topRank, 20, "lowest top-tier player stays in top block");
assert.equal(bottomRank, 21, "highest bottom-tier player starts at rank 22 block");

const players = leaderboard.map((e, i) => ({
  id: e.playerId,
  name: \`Player \${i + 1}\`,
  createdAt,
  pickStats: { page1Count: 0, page2Count: 0, page3Count: 0, totalCount: 0 }
}));
const built = buildLeaderboard(players, [], [], config);
const firstBottomIdx = built.findIndex((e) =>
  snapshot.rankLockBottomPlayerIds.includes(e.playerId)
);
assert.equal(firstBottomIdx, 21, "bottom tier starts after all 21 top-tier players");
assert.equal(built[0].playerId, snapshot.rankLockTopPlayerIds[0]);

const market = { id: "m3-1", page: 3 };
const topPicks = snapshot.rankLockTopPlayerIds.map((playerId, index) =>
  pick(playerId, "m3-1", index % 2 === 0 ? "A" : "B")
);
const bottomPicks = snapshot.rankLockBottomPlayerIds.map((playerId) =>
  pick(playerId, "m3-1", "A")
);
const allPicks = [...topPicks, ...bottomPicks];

assert.equal(
  filterPicksForParimutuelPool(allPicks, { config, market, viewerPlayerId: null }).length,
  21,
  "aggregate page-3 pool uses top 21 only"
);
assert.equal(
  filterPicksForParimutuelPool(allPicks, { config, market, viewerPlayerId: topId }).length,
  21,
  "top-tier viewer uses top 21 only"
);
assert.equal(
  filterPicksForParimutuelPool(allPicks, { config, market, viewerPlayerId: bottomId }).length,
  31,
  "bottom-tier viewer uses all picks"
);
assert(parimutuelPoolUsesTopTierOnly(config, market, null));
assert(parimutuelPoolUsesTopTierOnly(config, market, topId));
assert(!parimutuelPoolUsesTopTierOnly(config, market, bottomId));

const aggregateBreakdown = computeProjectedStakeBreakdown(allPicks, "m3-1", {
  config,
  market,
  viewerPlayerId: null
});
const topBreakdown = computeProjectedStakeBreakdown(allPicks, "m3-1", {
  config,
  market,
  viewerPlayerId: topId
});
const bottomBreakdown = computeProjectedStakeBreakdown(allPicks, "m3-1", {
  config,
  market,
  viewerPlayerId: bottomId
});
assert(aggregateBreakdown);
assert(topBreakdown);
assert(bottomBreakdown);
assert.equal(
  aggregateBreakdown.stakePerSlot,
  topBreakdown.stakePerSlot,
  "aggregate and top-tier stake match"
);
assert.notEqual(
  aggregateBreakdown.stakePerSlot,
  bottomBreakdown.stakePerSlot,
  "bottom-tier stake differs when bottom picks skew the pool"
);

const settledTop = settlePickGroup("A", allPicks, "m3-1", { config, market });
assert(settledTop[topId] !== undefined);
assert(settledTop[bottomId] !== undefined);
assert.notEqual(
  settledTop[topId],
  settledTop[bottomId],
  "top and bottom tiers can settle against different pools"
);

const winnerBreakdown = computeParimutuelBreakdown("A", allPicks, "m3-1", {
  config,
  market,
  viewerPlayerId: null
});
assert(winnerBreakdown);
assert.equal(
  winnerBreakdown.stakePerSlot,
  aggregateBreakdown.stakePerSlot,
  "aggregate payout breakdown uses top-tier pool"
);

assert(isExemptFromPage3PickPenalty(bottomId, config));
assert(!isExemptFromPage3PickPenalty(topId, config));

const bottomStats = { page1Count: 8, page2Count: 8, page3Count: 0, totalCount: 16 };
assert.equal(
  calculatePage3PickPenalty(bottomStats, true, bottomId, config),
  0,
  "bottom tier exempt from page-3 earnings deductions when rank lock is on"
);
assert.equal(
  calculatePage3PickPenalty(bottomStats, true, topId, config),
  80,
  "top tier still subject to page-3 earnings deductions"
);

assert.notEqual(
  validatePageSave(3, [], [], [], { playerId: bottomId, config }),
  null,
  "bottom tier still cannot save page 3 without minimum picks"
);

const m3Picks = [
  { playerId: topId, marketId: "m3-1", team: "法国", stake: 1 },
  { playerId: bottomId, marketId: "m3-1", team: "摩洛哥", stake: 1 },
];
const m3Sections = buildMarketResultSections(
  [{ id: "m3-1", round: "M3", name: "test", candidates: ["法国", "摩洛哥"], winner: null, page: 3 }],
  m3Picks,
  players,
  new Set(["m3-1"]),
  "zh",
  config
);
assert.equal(m3Sections[0].totalPicks, 1, "page-3 market results should only count top-tier picks");
assert.equal(m3Sections[0].options.flatMap((o) => o.picks).length, 1);
assert.equal(m3Sections[0].options.flatMap((o) => o.picks)[0].playerId, topId);

console.log("rank-lock smoke tests passed");
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
