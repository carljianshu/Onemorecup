import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import {
  computeLockedAnalyticsPickBalanceStats,
  computeLockedAnalyticsPopularPickStats,
  computeLockedAnalyticsUnpopularPickStats,
  marketPicksForPage3Analytics,
  shouldIncludePage3Analytics,
  teamSupportRatesForMarket
} from "./src/lib/answers-analytics.ts";
import { PAGE3_CANYON_MARKET_IDS, PAGE3_SEQUOIA_MARKET_IDS } from "./src/data/markets.ts";
import { isPageLocked } from "./src/lib/page-lock.ts";

const createdAt = "2026-01-01T00:00:00.000Z";
const players = [
  { id: "top1", name: "Top One", createdAt },
  { id: "top2", name: "Top Two", createdAt },
  { id: "bottom1", name: "Bottom One", createdAt }
];

function market(id, page, candidates, winner = null) {
  return { id, page, candidates, winner, label: id };
}

const markets = [
  market("m3-1", 3, ["法国", "巴拉圭"]),
  market("m3-5", 3, ["法国", "西班牙", "阿根廷", "巴西"])
];

const picks = [
  { playerId: "top1", marketId: "m3-1", team: "法国", stake: 1 },
  { playerId: "top2", marketId: "m3-1", team: "法国", stake: 1 },
  { playerId: "bottom1", marketId: "m3-1", team: "法国", stake: 1 },
  { playerId: "top1", marketId: "m3-5", team: "法国", stake: 20 },
  { playerId: "top2", marketId: "m3-5", team: "西班牙", stake: 1 },
  { playerId: "bottom1", marketId: "m3-5", team: "法国", stake: 1 }
];

const config = {
  page3Locked: true,
  rankLockApplied: true,
  rankLockTopPlayerIds: ["top1", "top2"],
  rankLockBottomPlayerIds: ["bottom1"]
};

assert(isPageLocked(config, 3));
assert(shouldIncludePage3Analytics(config));
assert(!shouldIncludePage3Analytics({ ...config, rankLockApplied: false }));

const popular = computeLockedAnalyticsPopularPickStats(players, markets, picks, config);
const top1Popular = popular.rows.find((row) => row.playerId === "top1");
const top2Popular = popular.rows.find((row) => row.playerId === "top2");
const bottomPopular = popular.rows.find((row) => row.playerId === "bottom1");
assert.equal(top1Popular?.matchCount, 2, "top1 picked hot on m3-1 and m3-5");
assert.equal(top2Popular?.matchCount, 1, "top2 picked hot only on m3-1");
assert.equal(bottomPopular?.matchCount, 0, "bottom tier excluded from page 3");

const m31Picks = marketPicksForPage3Analytics(markets.find((m) => m.id === "m3-1"), picks, config);
assert.equal(m31Picks.length, 2, "page 3 analytics pool ignores bottom tier picks");
const m35Rates = teamSupportRatesForMarket(markets.find((m) => m.id === "m3-5"), picks, config);
const m35RatesAll = teamSupportRatesForMarket(markets.find((m) => m.id === "m3-5"), picks, null);
assert.equal(m35Rates?.get("法国"), 66.66666666666667, "France rate uses top-tier pool only");
assert.equal(m35RatesAll?.get("法国"), 75, "all-player pool would count bottom-tier France");

const unpopular = computeLockedAnalyticsUnpopularPickStats(players, markets, picks, config);
const top2Unpopular = unpopular.rows.find((row) => row.playerId === "top2");
assert.equal(top2Unpopular?.matchCount, 1, "top2 picked least popular Spain on m3-5");

const balance = computeLockedAnalyticsPickBalanceStats(markets, picks, config);
const balanceIds = balance.rows.map((row) => row.marketId);
assert(balanceIds.includes("m3-1"));
for (const id of PAGE3_SEQUOIA_MARKET_IDS) {
  assert(!balanceIds.includes(id), \`\${id} excluded from pick balance\`);
}
for (const id of PAGE3_CANYON_MARKET_IDS) {
  if (id === "m3-1") continue;
  assert(!balanceIds.includes(id), \`unsettled \${id} skipped\`);
}

import {
  computeLockedAnalyticsRealWorldComparison,
  computePage3PickDistribution
} from "./src/lib/answers-analytics.ts";
import { PAGE3_BINARY_REAL_WORLD_RATES, PAGE3_MULTI_OPTION_REAL_WORLD_RATES } from "./src/data/page3-real-world-rates.ts";
const distribution = computePage3PickDistribution(markets, picks, config);
const m31 = distribution.find((row) => row.marketId === "m3-1");
const m35 = distribution.find((row) => row.marketId === "m3-5");
assert.equal(m31?.totalSlots, 2, "m3-1 chart excludes bottom-tier slots");
assert(m35?.isMultiOption, "m3-5 should be multi-option chart row");
assert.equal(m35?.options?.length, 4, "m3-5 should list all four options");
assert.equal(m35?.options?.[0]?.team, "法国", "hottest option first");
assert.equal(m35?.options?.[0]?.slots, 2, "France double counts as 2 slots");
assert.equal(m35?.options?.[1]?.team, "西班牙");
assert.equal(m35?.options?.[1]?.slots, 1);

assert.equal(PAGE3_BINARY_REAL_WORLD_RATES.length, 4);
assert.equal(PAGE3_MULTI_OPTION_REAL_WORLD_RATES.length, 3);
assert.equal(
  PAGE3_BINARY_REAL_WORLD_RATES.find((row) => row.favoriteTeam === "法国")?.favoriteRate,
  73.88
);
assert.equal(
  PAGE3_MULTI_OPTION_REAL_WORLD_RATES.find((row) => row.marketId === "m3-7")?.optionRates.length,
  8
);

const realWorld = computeLockedAnalyticsRealWorldComparison(markets, picks, config);
const m35Gap = realWorld.rows.find((row) => row.marketId === "m3-5");
assert(m35Gap?.isMultiOption, "m3-5 real-world row should be multi-option");
assert(m35Gap && m35Gap.maxDeviation >= 0, "m3-5 deviation computed");

console.log("answers-analytics-page3 tests passed");
`;

const result = spawnSync("npx", ["tsx", "--eval", script], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}

console.log(result.stdout.trim());
