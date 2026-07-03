/**
 * Settlement order for earnings / ranking timeline charts.
 * Run: node src/utils/earnings-timeline-order.test.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = `
import { PAGE1_SETTLEMENT_ORDER, sortMarketsBySettlementOrder } from "./src/lib/earnings-timeline.ts";

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

const i4 = order.indexOf("m1-4");
const i8 = order.indexOf("m1-8");
const i10 = order.indexOf("m1-10");
const i13 = order.indexOf("m1-13");
assert(i4 > i13, "m1-4 should settle after the first nine M1 matches");
assert(i8 > i4, "m1-8 should settle after m1-4");
assert(i10 > i8, "m1-10 should settle after m1-8");

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
