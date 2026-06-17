"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_TOTAL_PICKS, PAGE_LABELS, marketsForPage } from "@/data/markets";
import {
  activeSubQuestions,
  formatMainQuestionProgress,
  hiddenSubQuestions,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import {
  answersFeatureLabel,
  canAdminEnableFeature,
  formatOpensAt,
  fromDatetimeLocalValue,
  isAnswersFeaturePublic,
  toDatetimeLocalValue
} from "@/lib/public-features";
import { clearAdminAuthed } from "@/lib/admin-auth";
import type { AnswersPageFeature } from "@/lib/public-features";
import type { Market, PlayPage } from "@/types";

function cellForMarket(market: Market, playerId: string, picks: ReturnType<typeof useGame>["picks"]) {
  if (market.page === 1) {
    const pick = picks.find((p) => p.playerId === playerId && p.marketId === market.id);
    if (!pick) return "—";
    return pick.stake === DOUBLE_STAKE ? `${pick.team} ×2` : pick.team;
  }
  const answers = playerAnswersFromPicks(picks.filter((p) => p.playerId === playerId));
  const progress = formatMainQuestionProgress(market, answers);
  if (progress.complete) return "✓ 已完成";
  if (progress.done === 0) return "—";
  return `${progress.done}/${progress.total} 小题`;
}

function PublicFeatureControl({
  feature,
  onMessage
}: {
  feature: AnswersPageFeature;
  onMessage: (msg: { type: "error" | "success" | "warning"; text: string }) => void;
}) {
  const { config, setPublicFeature } = useGame();
  const label = answersFeatureLabel(feature);
  const enabled =
    feature === "answersPage1" ? config.answersPage1Public : config.answersPage2Public;
  const opensAt =
    feature === "answersPage1" ? config.answersPage1OpensAt : config.answersPage2OpensAt;
  const canEnable = canAdminEnableFeature(config, feature);
  const visible = isAnswersFeaturePublic(config, feature);

  function handleOpensAtChange(value: string) {
    setPublicFeature(feature, { opensAt: fromDatetimeLocalValue(value) });
    onMessage({ type: "success", text: `已更新「${label}」最早开放时间。` });
  }

  function handleToggle() {
    if (!enabled && !canEnable) {
      onMessage({
        type: "warning",
        text: `未到开放时间${opensAt ? `（${formatOpensAt(opensAt)}）` : ""}，暂无法向玩家开放${label}。`
      });
      return;
    }
    setPublicFeature(feature, { public: !enabled });
    onMessage({
      type: "success",
      text: !enabled ? `已向玩家开放${label}。` : `已关闭${label}，玩家不可见。`
    });
  }

  return (
    <div className="public-feature-control">
      <div className="public-feature-control-header">
        <strong>{label}</strong>
        <span className={`badge ${visible ? "open" : "locked"}`}>
          {visible ? "玩家可见" : enabled ? "已开放，未到展示时间" : "未向玩家开放"}
        </span>
      </div>
      <label className="public-feature-field">
        <span>最早可开放时间（留空表示随时可开放）</span>
        <input
          type="datetime-local"
          value={toDatetimeLocalValue(opensAt)}
          onChange={(e) => handleOpensAtChange(e.target.value)}
        />
      </label>
      {opensAt && !canEnable && (
        <p className="public-feature-hint">将于 {formatOpensAt(opensAt)} 后可向玩家开放。</p>
      )}
      <button
        type="button"
        className={`btn btn-sm ${enabled ? "btn-secondary" : "btn-primary"}`}
        onClick={handleToggle}
        disabled={!enabled && !canEnable}
      >
        {enabled ? `关闭${label}` : `向玩家开放${label}`}
      </button>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminPageContent />
    </AdminGate>
  );
}

function AdminPageContent() {
  const {
    ready,
    players,
    markets,
    picks,
    config,
    leaderboard,
    setMarketWinner,
    setSubQuestionWinner,
    deleteSubQuestion,
    restoreSubQuestion,
    togglePageLocked,
    deletePlayer,
    refreshScores
  } = useGame();
  const [message, setMessage] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);

  function scoreFor(playerId: string) {
    const score = leaderboard.find((e) => e.playerId === playerId)?.totalScore ?? 0;
    const text = score.toFixed(2);
    return score > 0 ? `+${text}` : text;
  }

  function handleCalculate() {
    refreshScores();
    setMessage({ type: "success", text: "分数已重新计算。" });
  }

  function handleHideSub(marketId: string, subId: string, subLabel: string) {
    if (!confirm(`确定隐藏小题「${subLabel}」？隐藏后玩家看不到该题；若其余小题均已作答，将视为答完该大题。`)) {
      return;
    }
    deleteSubQuestion(marketId, subId);
    setMessage({ type: "success", text: `已隐藏小题「${subLabel}」。可在下方「已隐藏小题」中撤回。` });
  }

  function handleRestoreSub(marketId: string, subId: string, subLabel: string) {
    restoreSubQuestion(marketId, subId);
    setMessage({ type: "success", text: `已恢复小题「${subLabel}」。` });
  }

  async function handleDeletePlayer(playerId: string, playerName: string) {
    if (!confirm(`确定删除玩家「${playerName}」及其全部竞猜记录？此操作不可撤销。`)) {
      return;
    }
    try {
      await deletePlayer(playerId);
      setMessage({ type: "success", text: `已删除玩家「${playerName}」。` });
    } catch {
      setMessage({ type: "error", text: "删除失败，请重试。" });
    }
  }

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
        <div className="lock-badges">
          {([1, 2] as PlayPage[]).map((page) => {
            const locked = page === 1 ? config.page1Locked : config.page2Locked;
            return (
              <span key={page} className={`badge ${locked ? "locked" : "open"}`}>
                {PAGE_LABELS[page]}：{locked ? "已锁定" : "开放"}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            clearAdminAuthed();
            window.location.href = "/admin";
          }}
        >
          退出管理
        </button>
      </nav>

      <h1 style={{ marginTop: 0 }}>管理员</h1>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={handleCalculate}>
          计算分数
        </button>
        {([1, 2] as PlayPage[]).map((page) => {
          const locked = page === 1 ? config.page1Locked : config.page2Locked;
          return (
            <button
              key={page}
              type="button"
              className={`btn ${locked ? "btn-secondary" : "btn-danger"}`}
              onClick={() => togglePageLocked(page)}
            >
              {locked ? `解锁${PAGE_LABELS[page]}` : `锁定${PAGE_LABELS[page]}`}
            </button>
          );
        })}
      </div>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>向玩家开放答题总览</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          排行榜始终公开。答题总览默认隐藏，第一页与第二页可分别设置最早开放时间并手动开放。
        </p>
        <div className="public-feature-grid">
          <PublicFeatureControl feature="answersPage1" onMessage={setMessage} />
          <PublicFeatureControl feature="answersPage2" onMessage={setMessage} />
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>录入比赛结果 — {PAGE_LABELS[1]}</h2>
        <div className="admin-grid">
          {marketsForPage(markets, 1).map((market) => (
            <div key={market.id} className="admin-item">
              <strong>
                [{market.round}] {market.id}：{market.name}
              </strong>
              <select
                value={market.winner ?? ""}
                onChange={(e) => setMarketWinner(market.id, e.target.value || null)}
              >
                <option value="">未结算</option>
                {(market.candidates ?? []).map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>录入比赛结果 & 管理小题 — {PAGE_LABELS[2]}</h2>
        {marketsForPage(markets, 2).map((market) => (
          <div key={market.id} className="admin-main-question">
            <strong>
              [{market.round}] {market.id}：{market.name}
            </strong>
            <div className="admin-sub-list">
              {activeSubQuestions(market).map((sub) => (
                <div key={sub.id} className="admin-sub-item">
                  <span>{sub.label}</span>
                  <select
                    value={sub.winner ?? ""}
                    onChange={(e) => setSubQuestionWinner(market.id, sub.id, e.target.value || null)}
                  >
                    <option value="">未结算</option>
                    {sub.candidates.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleHideSub(market.id, sub.id, sub.label)}
                  >
                    隐藏
                  </button>
                </div>
              ))}
              {hiddenSubQuestions(market).map((sub) => (
                <div key={sub.id} className="admin-sub-item admin-sub-item-hidden">
                  <span>{sub.label}</span>
                  <span className="hidden-tag">已隐藏</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestoreSub(market.id, sub.id, sub.label)}
                  >
                    撤回隐藏
                  </button>
                </div>
              ))}
              {activeSubQuestions(market).length === 0 && hiddenSubQuestions(market).length === 0 && (
                <p style={{ color: "var(--muted)", margin: 0 }}>该题暂无小题。</p>
              )}
              {activeSubQuestions(market).length === 0 && hiddenSubQuestions(market).length > 0 && (
                <p style={{ color: "var(--muted)", margin: 0 }}>该题所有小题均已隐藏，可在下方撤回。</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>所有玩家选择</h2>
        {players.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无提交。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>玩家</th>
                <th>第一页</th>
                <th>第二页</th>
                <th>总计</th>
                {markets.map((market) => (
                  <th key={market.id}>{market.id}</th>
                ))}
                <th>总分</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>
                    {player.pickStats.page1Count} / {MIN_PAGE1_PICKS}
                  </td>
                  <td>
                    {player.pickStats.page2Count} / {MIN_PAGE2_PICKS}
                  </td>
                  <td>
                    {player.pickStats.totalCount} / {MIN_TOTAL_PICKS}
                  </td>
                  {markets.map((market) => (
                    <td key={market.id}>{cellForMarket(market, player.id, picks)}</td>
                  ))}
                  <td>{scoreFor(player.id)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePlayer(player.id, player.name)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
