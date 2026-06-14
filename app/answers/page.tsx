"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS } from "@/data/markets";
import { allPickColumns, findPlayerPick } from "@/lib/market-helpers";
import { isAnswersAnyPublic, isAnswersPagePublic } from "@/lib/public-features";
import type { PlayPage } from "@/types";

type ViewFilter = "all" | PlayPage;

export default function AnswersPage() {
  const { ready, config, players, markets, picks, leaderboard } = useGame();
  const [filter, setFilter] = useState<ViewFilter>("all");

  const page1Public = ready && isAnswersPagePublic(config, 1);
  const page2Public = ready && isAnswersPagePublic(config, 2);
  const anyPublic = page1Public || page2Public;

  useEffect(() => {
    if (!ready) return;
    if (filter === 1 && !page1Public) {
      setFilter(page2Public ? 2 : "all");
    } else if (filter === 2 && !page2Public) {
      setFilter(page1Public ? 1 : "all");
    } else if (filter === "all" && page1Public && !page2Public) {
      setFilter(1);
    } else if (filter === "all" && page2Public && !page1Public) {
      setFilter(2);
    }
  }, [ready, filter, page1Public, page2Public]);

  const columns = useMemo(() => {
    const all = allPickColumns(markets).filter(
      (col) => (col.page === 1 && page1Public) || (col.page === 2 && page2Public)
    );
    if (filter === "all") return all;
    return all.filter((col) => col.page === filter);
  }, [markets, filter, page1Public, page2Public]);

  const sortedPlayers = useMemo(() => {
    const rankById = new Map(leaderboard.map((e) => [e.playerId, e.rank]));
    return [...players].sort((a, b) => {
      const rankA = rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rankB = rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB || a.createdAt.localeCompare(b.createdAt);
    });
  }, [players, leaderboard]);

  const page1ColCount = columns.filter((c) => c.page === 1).length;
  const page2ColCount = columns.filter((c) => c.page === 2).length;
  const showAllFilter = page1Public && page2Public;

  const filterOptions = useMemo(() => {
    const options: { value: ViewFilter; label: string }[] = [];
    if (showAllFilter) options.push({ value: "all", label: "全部题目" });
    if (page1Public) options.push({ value: 1, label: "仅第一页" });
    if (page2Public) options.push({ value: 2, label: "仅第二页" });
    return options;
  }, [showAllFilter, page1Public, page2Public]);

  if (!ready) {
    return (
      <main className="container">
        <p>加载中…</p>
      </main>
    );
  }

  if (!isAnswersAnyPublic(config)) {
    return (
      <main className="container">
        <nav className="nav-bar">
          <Link href="/">← 返回首页</Link>
          <Link href="/leaderboard">排行榜</Link>
          <Link href="/play">进入竞猜</Link>
        </nav>
        <div className="card" style={{ maxWidth: 480, margin: "2rem auto" }}>
          <h1 style={{ marginTop: 0 }}>答题总览尚未开放</h1>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            管理员将在合适的时间开放第一页或第二页的答题总览。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <nav className="nav-bar">
        <Link href="/">← 返回首页</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">进入竞猜</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>答题总览</h1>
      <p className="page-lead">
        每位玩家在各场比赛中的竞猜一览；横向滑动可查看全部题目。
        {!page1Public && page2Public && "（当前仅展示第二页）"}
        {page1Public && !page2Public && "（当前仅展示第一页）"}
      </p>

      {filterOptions.length > 1 && (
        <div className="answers-toolbar">
          {filterOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {players.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>暂无玩家提交，先去竞猜页提交答案吧。</p>
        </div>
      ) : (
        <div className="card table-wrap answers-table-wrap">
          <table className="answers-table">
            <thead>
              {filter === "all" && showAllFilter && (page1ColCount > 0 || page2ColCount > 0) && (
                <tr className="answers-group-row">
                  <th rowSpan={2} className="sticky-col">
                    玩家
                  </th>
                  <th rowSpan={2}>第一页</th>
                  <th rowSpan={2}>第二页</th>
                  <th rowSpan={2}>总分</th>
                  {page1ColCount > 0 && (
                    <th colSpan={page1ColCount} className="group-header">
                      第一页（{page1ColCount} 场）
                    </th>
                  )}
                  {page2ColCount > 0 && (
                    <th colSpan={page2ColCount} className="group-header">
                      第二页（{page2ColCount} 小题）
                    </th>
                  )}
                </tr>
              )}
              <tr>
                {(filter !== "all" || !showAllFilter) && (
                  <>
                    <th className="sticky-col">玩家</th>
                    <th>第一页</th>
                    <th>第二页</th>
                    <th>总分</th>
                  </>
                )}
                {columns.map((col) => (
                  <th key={col.id} title={col.fullLabel}>
                    {col.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => {
                const score = leaderboard.find((e) => e.playerId === player.id)?.totalScore ?? 0;
                return (
                  <tr key={player.id}>
                    <td className="sticky-col player-name">{player.name}</td>
                    <td>
                      {player.pickStats.page1Count}/{MIN_PAGE1_PICKS}
                    </td>
                    <td>
                      {player.pickStats.page2Count}/{MIN_PAGE2_PICKS}
                    </td>
                    <td>{score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}</td>
                    {columns.map((col) => {
                      const pick = findPlayerPick(picks, player.id, col.id);
                      if (!pick) {
                        return (
                          <td key={col.id} className="pick-empty">
                            —
                          </td>
                        );
                      }
                      const isDouble = pick.stake === DOUBLE_STAKE;
                      return (
                        <td
                          key={col.id}
                          className={isDouble ? "pick-double" : undefined}
                          title={isDouble ? `${pick.team}（Double · 20 分）` : pick.team}
                        >
                          {pick.team}
                          {isDouble && <span className="pick-double-badge">×2</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
