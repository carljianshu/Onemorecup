import fs from "node:fs";
import { phase3WinnersForScenarioMask, countRemainingPhase3Scenarios } from "../src/lib/top-tier-best-rank.ts";
import { buildLeaderboard, computePlayerScores } from "../src/lib/scoring.ts";
import { ensureMarketShape } from "../src/data/markets.ts";
import { playerDisplayName } from "../src/lib/player-display.ts";
import { formatScorePlain } from "../src/lib/score-format.ts";

const dataPath = process.argv[2] || "/Users/jianshuqian/Desktop/player_data.json";
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const markets = ensureMarketShape(data.markets);
const { players, picks, config } = data;
const fmt = (n) => formatScorePlain(n);
const name = (id, fallback) => playerDisplayName(players.find((x) => x.id === id), fallback);

console.log("数据来源:", dataPath);
console.log("剩余路径:", countRemainingPhase3Scenarios(markets));
for (const id of ["m3-1", "m3-2", "m3-3", "m3-4", "m3-5", "m3-6", "m3-7"]) {
  const m = markets.find((x) => x.id === id);
  console.log(`${id}: ${m?.winner ?? "未结算"}`);
}

const seen = new Set();
const scenarios = [];
for (let mask = 0; mask < 128; mask++) {
  const w = phase3WinnersForScenarioMask(markets, mask);
  if (!w) continue;
  const key = Object.values(w).join("|");
  if (seen.has(key)) continue;
  seen.add(key);
  const scenarioMarkets = markets.map((m) => (w[m.id] ? { ...m, winner: w[m.id] } : m));
  const lb = buildLeaderboard(players, scenarioMarkets, picks, config);
  const scores = computePlayerScores(players, scenarioMarkets, picks, config);
  scenarios.push({ w, lb, scores });
}

function m3Breakdown(playerId, scores) {
  const ms = scores.get(playerId)?.marketScores || {};
  return ["m3-5", "m3-6", "m3-7"].map((id) => `${id} ${fmt(ms[id] ?? 0)}`).join(" | ");
}

function printBoard(title, s) {
  console.log(`\n=== ${title} ===`);
  console.log(`半决赛 M3-6: ${s.w["m3-6"]} 晋级 | 决赛 M3-7: ${s.w["m3-7"]} 夺冠`);
  console.log("上档:");
  for (const e of s.lb
    .filter((x) => (config.rankLockTopPlayerIds || []).includes(x.playerId))
    .sort((a, b) => a.rank - b.rank)) {
    console.log(`  #${e.rank} ${name(e.playerId, e.name)}  净收益 ${fmt(e.netEarnings)}`);
  }
  console.log("下档:");
  for (const e of s.lb
    .filter((x) => (config.rankLockBottomPlayerIds || []).includes(x.playerId))
    .sort((a, b) => a.rank - b.rank)) {
    console.log(`  #${e.rank} ${name(e.playerId, e.name)}  净收益 ${fmt(e.netEarnings)}`);
  }
  const top = s.lb[0];
  console.log(`总冠军: ${name(top.playerId, top.name)} ${fmt(top.netEarnings)}`);
  console.log(`冠军 M3 分项: ${m3Breakdown(top.playerId, s.scores)}`);
}

for (const s of scenarios) printBoard("路径", s);

const arg = scenarios.find((s) => s.w["m3-7"] === "阿根廷");
const esp = scenarios.find((s) => s.w["m3-7"] === "西班牙");
if (arg) printBoard("阿根廷夺冠（决赛）", arg);
if (esp) printBoard("西班牙夺冠（决赛）", esp);

console.log("\n=== 全员排行榜对比（两种决赛结局） ===");
const allIds = [...new Set(scenarios.flatMap((s) => s.lb.map((e) => e.playerId)))];
const rows = allIds.map((pid) => {
  const a = arg?.lb.find((e) => e.playerId === pid);
  const e = esp?.lb.find((x) => x.playerId === pid);
  const am3 = arg
    ? ["m3-5", "m3-6", "m3-7"].map((id) => fmt(arg.scores.get(pid)?.marketScores?.[id] ?? 0)).join("/")
    : "-";
  const em3 = esp
    ? ["m3-5", "m3-6", "m3-7"].map((id) => fmt(esp.scores.get(pid)?.marketScores?.[id] ?? 0)).join("/")
    : "-";
  return {
    name: name(pid, a?.name || e?.name || pid),
    ar: a?.rank ?? "-",
    ae: fmt(a?.netEarnings ?? 0),
    er: e?.rank ?? "-",
    ee: fmt(e?.netEarnings ?? 0),
    am3,
    em3,
  };
});
rows.sort((a, b) => Number(a.ar) - Number(b.ar));
for (const r of rows) {
  console.log(
    `${r.name}: 阿根廷 #${r.ar} ${r.ae} [M3:${r.am3}] | 西班牙 #${r.er} ${r.ee} [M3:${r.em3}]`,
  );
}
