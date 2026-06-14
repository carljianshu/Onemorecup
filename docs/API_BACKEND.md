# 自建后端 API

数据保存在项目目录 `data/game-state.json`（已加入 `.gitignore`）。本地开发与 `next start` 部署均可使用。

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
ADMIN_PASSWORD=你的管理员密码
```

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000 。所有玩家共享同一份 `data/game-state.json`。

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/state` | 全量状态 + 排行榜 |
| PUT | `/api/players/:playerId/picks` | 提交竞猜（`new` 表示新玩家） |
| POST | `/api/admin/login` | 管理员登录，返回 token |
| PATCH | `/api/admin/markets/:marketId` | 第一页录胜者 |
| PATCH | `/api/admin/markets/:marketId/subs/:subId` | 第二页小题胜者 |
| DELETE | `/api/admin/markets/:marketId/subs/:subId` | 隐藏小题 |
| POST | `/api/admin/markets/:marketId/subs/:subId/restore` | 恢复小题 |
| PATCH | `/api/admin/config` | 锁页 / 公开答题总览 |

写请求可带 `If-Match: <version>` 做乐观锁；冲突返回 409。

## Netlify 部署

已配置 `@netlify/plugin-nextjs`，**不再**使用静态导出 `out/`。

注意：Netlify 默认文件系统**不持久**，`data/game-state.json` 在函数冷启动间可能丢失。熟人局长线使用建议：
- 换 VPS / Railway / Fly.io 跑 `next start`，或
- 日后把 `src/server/storage.ts` 换成 Postgres

## 回退

若 API 不可用（例如纯静态托管），前端会自动回退到浏览器 `localStorage`。
