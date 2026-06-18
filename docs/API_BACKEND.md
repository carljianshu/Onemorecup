# 后端 API

单文件存储：

- **本机 / VPS**：`data/game-state.json`（或 `GAME_STATE_DIR` 指定目录）
- **Netlify**：**Netlify Blobs** 持久化（store 名 `onemorecup-game`），跨部署保留数据
- 可用 `GET /api/leaderboard` 返回的 `storage` 字段确认：`"blob"` 为持久化，`"file"` 表示仍在用临时文件（部署后会丢）

## 玩家接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/register` | 注册 / 更新竞猜 |
| `GET` | `/api/leaderboard` | 读取同一份数据（含排行榜、玩家、选项、配置） |

## 管理员接口（需 `Authorization: Bearer <token>`）

先 `POST /api/admin/login` 传 `{ "password": "..." }` 获取 token。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/admin/login` | 登录 |
| `PATCH` | `/api/admin/markets/:marketId` | 第一页录胜者 |
| `PATCH` | `/api/admin/markets/:marketId/subs/:subId` | 第二页小题胜者 |
| `DELETE` | `/api/admin/markets/:marketId/subs/:subId` | 隐藏小题 |
| `POST` | `/api/admin/markets/:marketId/subs/:subId/restore` | 恢复小题 |
| `PATCH` | `/api/admin/config` | 锁页 / 公开答题总览 |
| `DELETE` | `/api/admin/players/:playerId` | 删除玩家及其全部竞猜 |

网页管理：访问 `/admin`，密码见环境变量 `ADMIN_PASSWORD`（默认 `Isi`）。

也可手改 `data/game-state.json`，见 [MANUAL_STATE.md](./MANUAL_STATE.md)。

题目对阵改 `src/data/markets.ts` 后重新部署。

## 环境变量

```bash
ADMIN_PASSWORD=你的密码
# GAME_STATE_DIR=可选自定义数据目录
```

## 本地运行

```bash
npm install
npm run dev
```
