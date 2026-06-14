# 后端 API（极简）

单文件存储 `data/game-state.json`（VPS/本机）或 `/tmp/onemorecup-data/`（Netlify 回退）。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/register` | 注册 / 更新竞猜 |
| `GET` | `/api/leaderboard` | 读取同一份数据（含排行榜、玩家、选项、配置） |

### POST /api/register

```json
{
  "name": "小明",
  "playerId": "可选，已有玩家传入",
  "page": 1,
  "pagePickInputs": [{ "marketId": "p1-1", "team": "E1" }],
  "pickInputs": [{ "marketId": "p1-1", "team": "E1" }]
}
```

`pickInputs` 为合并两页后的全量；`pagePickInputs` 为当前保存页。

### GET /api/leaderboard

返回 `leaderboard`、`players`、`picks`、`markets`、`config`、`version`。

写请求可带 `If-Match: <version>` 做乐观锁。

## 管理

无管理后台。赛果、锁页、公开答题总览见 [MANUAL_STATE.md](./MANUAL_STATE.md)。  
题目对阵改 `src/data/markets.ts` 后重新部署。

## 本地运行

```bash
npm install
npm run dev
```

## 部署

Netlify 需 `@netlify/plugin-nextjs`，`publish = ".next"`。  
长期赛期建议 VPS + `npm start`，直接编辑 `data/game-state.json`。
