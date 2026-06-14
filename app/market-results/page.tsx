"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useGame } from "@/context/GameContext";
import { buildMarketResultSections, formatPoolAmount } from "@/lib/market-results";
import { isAnswersAnyPublic, isAnswersPagePublic } from "@/lib/public-features";
import type { PlayPage } from "@/types";

type ViewFilter = "all" | PlayPage;

export default function MarketResultsPage() {
  const { ready, config, players, markets, picks } = useGame();
  const [filter, setFilter] = useState<ViewFilter>("all");

  const page1Public = ready && isAnswersPagePublic(config, 1);
  const page2Public = ready && isAnswersPagePublic(config, 2);
  const showAllFilter = page1Public && page2Public;

  const visiblePages = useMemo(() => {
    const pages: PlayPage[] = [];
    if (page1Public) pages.push(1);
    if (page2Public) pages.push(2);
    return pages;
  }, [page1Public, page2Public]);

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

  const sections = useMemo(() => {
    const all = buildMarketResultSections(markets, picks, players, visiblePages);
    if (filter === "all") return all;
    return all.filter((section) => section.page === filter);
  }, [markets, picks, players, visiblePages, filter]);

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
          <h1 style={{ marginTop: 0 }}>单场竞猜结果尚未开放</h1>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            管理员将在合适的时间开放第一页或第二页的竞猜结果。
          </p>
        </div>
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

      <h1 style={{ marginTop: 0 }}>单场竞猜结果</h1>
      <p className="page-lead">
        每道题各选项的竞猜玩家一览。奖金 = 奖池合计 ÷ 加权人数 − 10（Double 计 2 人），Double 玩家再 ×2；任一侧无人选则两侧均为
        0。已录入赛果的题目，猜对选项以绿色边框标出。
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
      ) : sections.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>当前没有可展示的题目。</p>
        </div>
      ) : (
        <div className="market-results-list">
          {sections.map((section) => (
            <section key={section.id} className="card market-result-card">
              <div className="market-result-header">
                <h2 className="market-result-title">{section.title}</h2>
                <span className="market-result-meta">
                  {section.totalPicks} 人作答 · 奖池合计 {formatPoolAmount(section.totalPool)} 分
                </span>
              </div>
              <div className="market-result-options">
                {section.options.map(({ option, picks: optionPicks, basePayout, weightedCount, isWinner }) => (
                  <div
                    key={option}
                    className={`market-result-option${isWinner ? " market-result-option-winner" : ""}`}
                  >
                    <div className="market-result-option-head">
                      <h3 className="market-result-option-label">
                        {option}
                        {isWinner && <span className="market-result-winner-badge">猜对</span>}
                      </h3>
                      <span className="market-result-pool">
                        基础奖金 {formatPoolAmount(basePayout)} 分
                        {weightedCount > 0 && (
                          <span className="market-result-pool-meta">
                            （加权 {weightedCount} 人，Double ×2）
                          </span>
                        )}
                      </span>
                    </div>
                    {optionPicks.length === 0 ? (
                      <p className="market-result-empty">暂无</p>
                    ) : (
                      <ul className="market-result-players">
                        {optionPicks.map((pick) => (
                          <li
                            key={pick.playerId}
                            className={pick.isDouble ? "market-result-player pick-double" : "market-result-player"}
                          >
                            <span className="market-result-player-name">{pick.playerName}</span>
                            <span className="market-result-player-payout">
                              +{formatPoolAmount(pick.payout)}
                              {pick.isDouble && <span className="pick-double-badge">×2</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
