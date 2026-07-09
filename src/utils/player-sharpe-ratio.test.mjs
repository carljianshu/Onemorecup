import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import {
  computePlayerSharpeRatio,
  settledMarketEarningsSeries,
  sharpeRatioFromEarningsSeries
} from "./src/lib/player-sharpe-ratio.ts";

const markets = [
  { id: "m1-1", winner: "A", candidates: ["A", "B"], page: 1 },
  { id: "m1-2", winner: "C", candidates: ["C", "D"], page: 1 },
  { id: "m2-1", winner: null, candidates: ["E", "F"], page: 2 },
];
const picks = [
  { playerId: "p1", marketId: "m1-1", team: "A", stake: 1 },
  { playerId: "p1", marketId: "m1-2", team: "D", stake: 1 },
];
const marketScores = { "m1-1": 10, "m1-2": -10 };

assert.deepEqual(
  settledMarketEarningsSeries("p1", markets, picks, marketScores),
  [10, -10],
  "only settled markets; missed unsettled excluded"
);

assert.equal(sharpeRatioFromEarningsSeries([10, -10]), 0);
assert.equal(sharpeRatioFromEarningsSeries([10, 0]), 2);

const missedPick = [
  { playerId: "p2", marketId: "m1-1", team: "A", stake: 1 },
];
assert.deepEqual(
  settledMarketEarningsSeries("p2", markets, missedPick, { "m1-1": 10, "m1-2": -5 }),
  [10, 0],
  "settled market without a pick counts as 0"
);

assert.equal(
  computePlayerSharpeRatio("p2", markets, missedPick, { "m1-1": 10, "m1-2": -5 }),
  2
);

assert.equal(sharpeRatioFromEarningsSeries([]), null);
assert.equal(sharpeRatioFromEarningsSeries([0, 0]), null);

console.log("player-sharpe-ratio smoke tests passed");
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
