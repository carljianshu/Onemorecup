import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import {
  applyRankLockTierSort,
  computeRankLockSnapshot,
  isRankLockApplied
} from "./src/lib/rank-lock.ts";
import { promotionCutoffCount } from "./src/lib/promotion.ts";
import { buildLeaderboard } from "./src/lib/scoring.ts";

const createdAt = "2026-01-01T00:00:00.000Z";

function entry(id, netEarnings) {
  return { playerId: id, netEarnings, createdAt };
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
