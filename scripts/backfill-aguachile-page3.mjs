#!/usr/bin/env node
/**
 * 管理员代填 Aguachile 第三页竞猜。
 *
 * 用法（需站点已部署 admin picks API，或第三页尚未锁定时走 register）：
 *   SITE_URL=https://你的域名 ADMIN_PASSWORD=Isi node scripts/backfill-aguachile-page3.mjs
 *
 * 可选：ADMIN_PASSWORD 省略时默认 Isi（与 .env.example 一致）。
 */

const SITE_URL = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Isi";
const PLAYER_ID = "f6dbcd7e-b462-4312-a321-58307af27b9a";
const PLAYER_NAME = "Aguachile";

const PAGE3_PICKS = [
  { marketId: "m3-1", team: "摩洛哥" },
  { marketId: "m3-2", team: "西班牙" },
  { marketId: "m3-3", team: "挪威" },
  { marketId: "m3-4", team: "阿根廷" },
  { marketId: "m3-5", team: "西班牙" },
  { marketId: "m3-6", team: "阿根廷" },
  { marketId: "m3-7", team: "西班牙", double: true }
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${data.message ?? data.error ?? response.statusText}`);
  }
  return data;
}

async function adminLogin() {
  return fetchJson(`${SITE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD })
  });
}

async function getVersion() {
  const data = await fetchJson(`${SITE_URL}/api/leaderboard/version`);
  return data.version;
}

async function saveViaAdmin(token, version) {
  return fetchJson(`${SITE_URL}/api/admin/players/${encodeURIComponent(PLAYER_ID)}/picks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "If-Match": String(version)
    },
    body: JSON.stringify({ page: 3, pagePickInputs: PAGE3_PICKS })
  });
}

async function saveViaRegister(version) {
  return fetchJson(`${SITE_URL}/api/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(version)
    },
    body: JSON.stringify({
      name: PLAYER_NAME,
      playerId: PLAYER_ID,
      page: 3,
      pagePickInputs: PAGE3_PICKS,
      pickInputs: PAGE3_PICKS
    })
  });
}

function verifyPicks(data) {
  const picks = data.picks.filter((p) => p.playerId === PLAYER_ID && p.marketId.startsWith("m3-"));
  picks.sort((a, b) => a.marketId.localeCompare(b.marketId, undefined, { numeric: true }));
  console.log("Aguachile M3 picks:");
  for (const pick of picks) {
    console.log(`  ${pick.marketId}: ${pick.team}${pick.stake === 20 ? " ×2" : ""}`);
  }
  const player = data.players.find((p) => p.id === PLAYER_ID);
  if (player?.pickStats) {
    console.log(`pickStats.page3Count = ${player.pickStats.page3Count}`);
  }
}

async function main() {
  if (!SITE_URL) {
    console.error("请设置 SITE_URL，例如：SITE_URL=https://你的域名 node scripts/backfill-aguachile-page3.mjs");
    process.exit(1);
  }

  const version = await getVersion();
  console.log(`当前 version: ${version}`);

  let data;
  try {
    const { token } = await adminLogin();
    console.log("管理员登录成功，使用 admin picks API…");
    data = await saveViaAdmin(token, version);
  } catch (adminError) {
    console.warn(`admin API 失败（${adminError.message}），尝试 register API…`);
    data = await saveViaRegister(version);
  }

  console.log(`保存成功，新 version: ${data.version}`);
  verifyPicks(data);
}

main().catch((error) => {
  console.error("失败:", error.message);
  process.exit(1);
});
