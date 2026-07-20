import { calculateScores } from "./scoring.js";

function run(label, players, markets, picks) {
  console.log("\n" + "=".repeat(60));
  console.log(label);
  console.log("=".repeat(60));
  const result = calculateScores(players, markets, picks);
  console.log(JSON.stringify(result, null, 2));
}

const players = [
  { id: "p1", name: "Carl" },
  { id: "p2", name: "Bob" },
  { id: "p3", name: "Alice" },
  { id: "p4", name: "Dave" }
];

const r16 = {
  id: "r16_1",
  round: "R16",
  name: "R16-1",
  candidates: ["France", "Mexico"],
  winner: "France"
};

// 1. 只有一人猜对 → 全员同对，得 0
run(
  "场景1：只有 Carl 参与且猜对",
  [{ id: "p1", name: "Carl" }],
  [r16],
  [{ playerId: "p1", marketId: "r16_1", team: "France", stake: 10 }]
);

// 2. 有对有错
run(
  "场景2：Carl 对，Bob 错",
  players.slice(0, 2),
  [r16],
  [
    { playerId: "p1", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "Mexico", stake: 10 }
  ]
);

// 3. 全员猜错
run(
  "场景3：三人都猜错（不同错队）",
  players.slice(0, 3),
  [r16],
  [
    { playerId: "p1", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p3", marketId: "r16_1", team: "Mexico", stake: 10 }
  ]
);

// 4. winner 未公布
run(
  "场景4：胜者未公布",
  players.slice(0, 2),
  [{ ...r16, winner: null }],
  [
    { playerId: "p1", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "Mexico", stake: 10 }
  ]
);

// 5. 1 人对 3 人错
run(
  "场景5：Carl 对，三人错",
  players,
  [r16],
  [
    { playerId: "p1", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p3", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p4", marketId: "r16_1", team: "Mexico", stake: 10 }
  ]
);

// 6. 2 人对 2 人错
run(
  "场景6：两人对，两人错",
  players,
  [r16],
  [
    { playerId: "p1", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p3", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p4", marketId: "r16_1", team: "Mexico", stake: 10 }
  ]
);

// 7. 多个 market 累计
const qf = {
  id: "qf_1",
  round: "QF",
  name: "QF-1",
  candidates: ["France", "Brazil", "Argentina", "Germany"],
  winner: "Brazil"
};

run(
  "场景7：两个 market 累计（R16 + QF）",
  players.slice(0, 3),
  [r16, qf],
  [
    { playerId: "p1", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p3", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p1", marketId: "qf_1", team: "Brazil", stake: 10 },
    { playerId: "p2", marketId: "qf_1", team: "France", stake: 10 },
    { playerId: "p3", marketId: "qf_1", team: "Argentina", stake: 10 }
  ]
);

// 8. 有人没参与某 market
run(
  "场景8：Dave 没参与，其余三人有对有错",
  players,
  [r16],
  [
    { playerId: "p1", marketId: "r16_1", team: "France", stake: 10 },
    { playerId: "p2", marketId: "r16_1", team: "Mexico", stake: 10 },
    { playerId: "p3", marketId: "r16_1", team: "France", stake: 10 }
  ]
);

console.log("\n");
