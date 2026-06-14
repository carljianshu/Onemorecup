"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useGame } from "@/context/GameContext";
import { MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_TOTAL_PICKS } from "@/data/markets";
import { computeMissingItemCount } from "@/lib/pick-stats";

function scoreClass(score: number) {
  if (score > 0) return "score-positive";
  if (score < 0) return "score-negative";
  return "score-zero";
}

function formatScore(score: number | undefined) {
  if (score === undefined) return "—";
  const text = score.toFixed(2);
  if (score > 0) return `+${text}`;
  return text;
}

export default function LeaderboardPage() {
  const { ready, markets, leaderboard } = useGame();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!ready) {
    return (
      <main className="container">
        <p>加载中…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">← 返回首页</Link>
        <PublicFeatureNavLinks />
        <Link href="/play">进入竞猜</Link>
      </nav>

      <h1 style={{ marginTop: 0 }}>排行榜</h1>

      {leaderboard.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>暂无提交记录，成为第一个参与者吧！</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>玩家</th>
                <th>第一页</th>
                <th>第二页</th>
                <th>总计答题</th>
                <th>总分</th>
                <th>已结算项目数</th>
                <th>缺少的项目数</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <Fragment key={entry.playerId}>
                  <tr>
                    <td>#{entry.rank}</td>
                    <td>{entry.name}</td>
                    <td>
                      {entry.pickStats.page1Count} / {MIN_PAGE1_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.page2Count} / {MIN_PAGE2_PICKS}
                    </td>
                    <td>
                      {entry.pickStats.totalCount} / {MIN_TOTAL_PICKS}
                    </td>
                    <td className={scoreClass(entry.totalScore)}>{formatScore(entry.totalScore)}</td>
                    <td>
                      {entry.settledCount} / {entry.guessedCount}
                    </td>
                    <td>{computeMissingItemCount(entry.pickStats)}</td>
                    <td>
                      <button
                        type="button"
                        className="detail-toggle"
                        onClick={() =>
                          setExpanded(expanded === entry.playerId ? null : entry.playerId)
                        }
                      >
                        {expanded === entry.playerId ? "收起" : "每场得分"}
                      </button>
                    </td>
                  </tr>
                  {expanded === entry.playerId && (
                    <tr className="submission-row">
                      <td colSpan={9}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
                          {markets.map((market) => {
                            const score = entry.marketScores[market.id];
                            return (
                              <span key={market.id} className={scoreClass(score ?? 0)}>
                                {market.id}: {formatScore(score)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
