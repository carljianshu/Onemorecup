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

`netlify.toml` 已配置：

- `publish = ".next"`（不能是站点根目录 `.`，否则会报错）
- `output: "standalone"`（`next.config.ts`，Netlify 插件需要）
- `@netlify/plugin-nextjs`

### 若仍报 publish directory 错误

在 Netlify → **Site configuration** → **Build & deploy** → **Build settings**：

1. **Publish directory** 填 `.next`，或**留空**（以 `netlify.toml` 为准）
2. **不要**填 `.` 或 `/`
3. 保存后 **Trigger deploy**

### 环境变量

设置 `ADMIN_PASSWORD` 后重新部署。

### 数据持久化

Netlify 上 JSON 文件仍可能不持久，赛期建议 Railway/VPS。

## 回退

若 API 不可用（例如纯静态托管），前端会自动回退到浏览器 `localStorage`。
