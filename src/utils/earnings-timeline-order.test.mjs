/**
 * Settlement order for earnings / ranking timeline charts.
 * Run: node src/utils/earnings-timeline-order.test.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = `
import { computeEarningsTimeline, PAGE1_SETTLEMENT_ORDER, sortMarketsBySettlementOrder } from "./src/lib/earnings-timeline.ts";
import { ensureMarketShape, DEFAULT_MARKETS } from "./src/data/markets.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const settledMarkets = PAGE1_SETTLEMENT_ORDER.map((id) => ({
  id,
  page: 1,
  winner: "A",
  candidates: ["A", "B"]
}));

const order = sortMarketsBySettlementOrder(settledMarkets).map((m) => m.id);
assert(
  order.join(",") === PAGE1_SETTLEMENT_ORDER.join(","),
  "settled M1 order should match PAGE1_SETTLEMENT_ORDER"
);

const legacySlotWinner = DEFAULT_MARKETS.map((market) =>
  market.id === "m1-12"
    ? { ...market, winner: "西班牙", settledAt: "2026-06-29T12:00:00.000Z" }
    : market
);
const shapedLegacy = ensureMarketShape(legacySlotWinner);
assert(
  shapedLegacy.find((market) => market.id === "m1-4")?.winner === "西班牙",
  "winner stored on legacy slot m1-12 should resolve to m1-4"
);
assert(
  shapedLegacy.find((market) => market.id === "m1-4")?.settledAt === "2026-06-29T12:00:00.000Z",
  "settledAt should follow resolved winner source"
);

const i13 = order.indexOf("m1-13");
const i11 = order.indexOf("m1-11");
const i4 = order.indexOf("m1-4");
assert(i11 > i13, "m1-11 should settle after m1-13");
assert(i4 > i11, "m1-4 should settle after m1-11");
const i8 = order.indexOf("m1-8");
const i10 = order.indexOf("m1-10");
assert(i8 > i4, "m1-8 should settle after m1-4");
assert(i10 > i8, "m1-10 should settle after m1-8");
const i6 = order.indexOf("m1-6");
assert(i6 > i10, "m1-6 should settle after m1-10");
const i15 = order.indexOf("m1-15");
assert(i15 > i6, "m1-15 should settle after m1-6");

const allSettled = ensureMarketShape(
  DEFAULT_MARKETS.map((market) =>
    PAGE1_SETTLEMENT_ORDER.includes(market.id)
      ? { ...market, winner: market.candidates?.[0] ?? "A", settledAt: "2026-06-29T00:00:00.000Z" }
      : market
  )
);
const timelineSteps = computeEarningsTimeline(
  [{ id: "p1", name: "Test", createdAt: "", pickPenalty: 0, pickPenaltyPage3: 0 }],
  allSettled,
  []
).steps.map((step) => step.marketId ?? "start");
assert(
  timelineSteps.join(",") === ["start", ...PAGE1_SETTLEMENT_ORDER].join(","),
  "timeline should list every settled M1 match in order"
);

const shuffled = [...settledMarkets].reverse();
const reshuffled = sortMarketsBySettlementOrder(shuffled).map((m) => m.id);
assert(
  reshuffled.join(",") === PAGE1_SETTLEMENT_ORDER.join(","),
  "sort should be stable regardless of input order"
);

console.log("earnings-timeline-order tests passed");
console.log("Order:", order.join(" -> "));
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
