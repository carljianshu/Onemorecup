# 云端同步设置（Supabase 免费版）

配置后，所有玩家和管理员会看到**同一份**竞猜数据；未配置时仍只用本机浏览器存储。

## 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 注册并登录  
2. **New project** → 选区域、设数据库密码 → 等待创建完成  

## 2. 建表

在 Dashboard → **SQL** → **New query**，粘贴并运行 `supabase/schema.sql` 里的全部 SQL。

## 3. 开启 Realtime（可选，推荐）

Dashboard → **Database** → **Replication** → 找到 `game_state` 表并开启。  
开启后别人提交竞猜会更快同步到你这边；不开启也能用，只是主要靠保存后刷新。

## 4. 复制 API 密钥

Dashboard → **Project Settings** → **API**：

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. 本地开发

复制 `.env.example` 为 `.env.local`，填入上面两个值：

```bash
cp .env.example .env.local
npm run dev
```

## 6. Netlify 生产环境

Netlify → 你的站点 → **Site configuration** → **Environment variables**，添加同样的两个变量，然后重新部署。

## 说明

- 免费额度对个人小局足够用  
- 当前 RLS 策略允许任何人读写 `game_state`（适合熟人局）；不要放敏感信息  
- 每台设备仍在本机记住「当前玩家是谁」（`currentPlayerId`），只有竞猜数据走云端  
