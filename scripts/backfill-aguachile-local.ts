import { adminSavePlayerPagePicks } from "../src/server/game-service";

const PLAYER_ID = "f6dbcd7e-b462-4312-a321-58307af27b9a";

const PAGE3_PICKS = [
  { marketId: "m3-1", team: "摩洛哥" },
  { marketId: "m3-2", team: "西班牙" },
  { marketId: "m3-3", team: "挪威" },
  { marketId: "m3-4", team: "阿根廷" },
  { marketId: "m3-5", team: "西班牙" },
  { marketId: "m3-6", team: "阿根廷" },
  { marketId: "m3-7", team: "西班牙", double: true }
];

async function main() {
  const version = Number(process.argv[2] ?? "352");
  const result = await adminSavePlayerPagePicks(
    PLAYER_ID,
    { page: 3, pagePickInputs: PAGE3_PICKS },
    version
  );
  const m3 = result.picks
    .filter((p) => p.playerId === PLAYER_ID && p.marketId.startsWith("m3-"))
    .sort((a, b) => a.marketId.localeCompare(b.marketId, undefined, { numeric: true }));
  console.log("Saved version:", result.version);
  console.log("page3Count:", result.player.pickStats?.page3Count);
  for (const pick of m3) {
    console.log(`${pick.marketId}: ${pick.team}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
