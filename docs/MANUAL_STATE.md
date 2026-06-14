# 手动编辑 game-state.json

数据文件默认路径：`data/game-state.json`（与项目根目录同级）。

## 文件结构

```json
{
  "version": 1,
  "payload": {
    "players": [],
    "picks": [],
    "markets": [],
    "config": {
      "page1Locked": false,
      "page2Locked": false,
      "answersPage1Public": false,
      "answersPage2Public": false,
      "answersPage1OpensAt": null,
      "answersPage2OpensAt": null
    }
  }
}
```

每次手改后请将 **`version` 加 1**。服务运行中改完保存即可；若用 `npm start` 可多刷新页面确认。

## 录第一页胜者

在 `payload.markets` 中找到大题，设置 `winner` 为 `candidates` 中的原文：

```json
{ "id": "p1-3", "winner": "A2" }
```

## 录第二页小题胜者

```json
{
  "id": "p2-1-s2",
  "winner": "选项文案",
  "deleted": false
}
```

## 隐藏小题

```json
"deleted": true
```

## 锁页

```json
"config": {
  "page1Locked": true,
  "page2Locked": false
}
```

## 公开答题总览

```json
"config": {
  "answersPage1Public": true,
  "answersPage2Public": false,
  "answersPage1OpensAt": null
}
```

`opensAt` 可填 ISO 时间，如 `"2026-07-01T08:00:00.000Z"`。

## 不要手改

- `players[].pickStats` — 玩家保存时自动计算
- 排行榜 — 由服务端根据 `picks` + `markets` 实时计算

## 题目对阵

编辑 `src/data/markets.ts` 中的 `DEFAULT_MARKETS`，提交并部署。  
`markets` 里已有赛果时，部署后若条数与默认一致会保留已录入的 `winner`。
