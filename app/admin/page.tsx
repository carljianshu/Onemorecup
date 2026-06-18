"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS, MIN_TOTAL_PICKS, PLAY_PAGES, isPageLocked, marketsForPage } from "@/data/markets";
import { answersFeatureLabelKey, translateMarketName } from "@/i18n";
import {
  activeSubQuestions,
  formatMainQuestionProgress,
  hiddenSubQuestions,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import {
  canAdminEnableFeature,
  fromDatetimeLocalValue,
  isAnswersFeaturePublic,
  toDatetimeLocalValue
} from "@/lib/public-features";
import { clearAdminAuthed } from "@/lib/admin-auth";
import { formatScore } from "@/lib/score-format";
import type { AnswersPageFeature } from "@/lib/public-features";
import type { Market, Pick, PlayPage } from "@/types";

function cellForMarket(
  market: Market,
  playerId: string,
  picks: Pick[],
  t: (key: string, values?: Record<string, string | number>) => string
) {
  if (market.page === 1 || market.page === 3) {
    const pick = picks.find((p) => p.playerId === playerId && p.marketId === market.id);
    if (!pick) return t("common.none");
    return pick.stake === DOUBLE_STAKE ? `${pick.team} ×2` : pick.team;
  }
  const answers = playerAnswersFromPicks(picks.filter((p) => p.playerId === playerId));
  const progress = formatMainQuestionProgress(market, answers);
  if (progress.complete) return t("admin.complete");
  if (progress.done === 0) return t("common.none");
  return t("admin.subCount", { done: progress.done, total: progress.total });
}

function PublicFeatureControl({
  feature,
  onMessage
}: {
  feature: AnswersPageFeature;
  onMessage: (msg: { type: "error" | "success" | "warning"; text: string }) => void;
}) {
  const { config, setPublicFeature } = useGame();
  const { t, formatOpensAt } = useLocale();
  const label = t(answersFeatureLabelKey(feature));
  const enabled =
    feature === "answersPage1"
      ? config.answersPage1Public
      : feature === "answersPage2"
        ? config.answersPage2Public
        : config.answersPage3Public;
  const opensAt =
    feature === "answersPage1"
      ? config.answersPage1OpensAt
      : feature === "answersPage2"
        ? config.answersPage2OpensAt
        : config.answersPage3OpensAt;
  const canEnable = canAdminEnableFeature(config, feature);
  const visible = isAnswersFeaturePublic(config, feature);

  function handleOpensAtChange(value: string) {
    setPublicFeature(feature, { opensAt: fromDatetimeLocalValue(value) });
    onMessage({ type: "success", text: t("admin.updatedOpensAt", { label }) });
  }

  function handleToggle() {
    if (!enabled && !canEnable) {
      const formatted = opensAt ? formatOpensAt(opensAt) : null;
      onMessage({
        type: "warning",
        text: t("admin.cannotOpenYet", {
          time: formatted ? `（${formatted}）` : "",
          label
        })
      });
      return;
    }
    setPublicFeature(feature, { public: !enabled });
    onMessage({
      type: "success",
      text: !enabled ? t("admin.opened", { label }) : t("admin.closed", { label })
    });
  }

  return (
    <div className="public-feature-control">
      <div className="public-feature-control-header">
        <strong>{label}</strong>
        <span className={`badge ${visible ? "open" : "locked"}`}>
          {visible
            ? t("admin.visible")
            : enabled
              ? t("admin.enabledPending")
              : t("admin.disabled")}
        </span>
      </div>
      <label className="public-feature-field">
        <span>{t("admin.opensAtLabel")}</span>
        <input
          type="datetime-local"
          value={toDatetimeLocalValue(opensAt)}
          onChange={(e) => handleOpensAtChange(e.target.value)}
        />
      </label>
      {opensAt && !canEnable && (
        <p className="public-feature-hint">
          {t("admin.opensAtHint", { time: formatOpensAt(opensAt) ?? "" })}
        </p>
      )}
      <button
        type="button"
        className={`btn btn-sm ${enabled ? "btn-secondary" : "btn-primary"}`}
        onClick={handleToggle}
        disabled={!enabled && !canEnable}
      >
        {enabled ? t("admin.closeFeature", { label }) : t("admin.openFeature", { label })}
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
  const { t, locale, pageLabel } = useLocale();
  const [message, setMessage] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);

  function scoreFor(playerId: string) {
    const score = leaderboard.find((e) => e.playerId === playerId)?.totalScore ?? 0;
    return formatScore(score);
  }

  function handleCalculate() {
    refreshScores();
    setMessage({ type: "success", text: t("admin.scoresRecalculated") });
  }

  function handleHideSub(marketId: string, subId: string, subLabel: string) {
    if (!confirm(t("admin.confirmHide", { label: subLabel }))) {
      return;
    }
    deleteSubQuestion(marketId, subId);
    setMessage({ type: "success", text: t("admin.hiddenSub", { label: subLabel }) });
  }

  function handleRestoreSub(marketId: string, subId: string, subLabel: string) {
    restoreSubQuestion(marketId, subId);
    setMessage({ type: "success", text: t("admin.restoredSub", { label: subLabel }) });
  }

  async function handleDeletePlayer(playerId: string, playerName: string) {
    if (!confirm(t("admin.confirmDelete", { name: playerName }))) {
      return;
    }
    try {
      await deletePlayer(playerId);
      setMessage({ type: "success", text: t("admin.deletedPlayer", { name: playerName }) });
    } catch {
      setMessage({ type: "error", text: t("admin.deleteFailed") });
    }
  }

  if (!ready) {
    return (
      <main className="container">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <div className="lock-badges">
          {PLAY_PAGES.map((page) => {
            const locked = isPageLocked(config, page);
            return (
              <span key={page} className={`badge ${locked ? "locked" : "open"}`}>
                {pageLabel(page)}：{locked ? t("admin.pageLocked") : t("admin.pageOpen")}
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
          {t("admin.logout")}
        </button>
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("admin.title")}</h1>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={handleCalculate}>
          {t("admin.calcScores")}
        </button>
        {PLAY_PAGES.map((page) => {
          const locked = isPageLocked(config, page);
          return (
            <button
              key={page}
              type="button"
              className={`btn ${locked ? "btn-secondary" : "btn-danger"}`}
              onClick={() => togglePageLocked(page)}
            >
              {locked
                ? t("admin.unlockPage", { page: pageLabel(page) })
                : t("admin.lockPage", { page: pageLabel(page) })}
            </button>
          );
        })}
      </div>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.publicAnswersTitle")}</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          {t("admin.publicAnswersDesc")}
        </p>
        <div className="public-feature-grid">
          <PublicFeatureControl feature="answersPage1" onMessage={setMessage} />
          <PublicFeatureControl feature="answersPage2" onMessage={setMessage} />
          <PublicFeatureControl feature="answersPage3" onMessage={setMessage} />
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.resultsP1", { page: pageLabel(1) })}</h2>
        <div className="admin-grid">
          {marketsForPage(markets, 1).map((market) => (
            <div key={market.id} className="admin-item">
              <strong>
                [{market.round}] {market.id}：{translateMarketName(locale, market.name)}
              </strong>
              <select
                value={market.winner ?? ""}
                onChange={(e) => setMarketWinner(market.id, e.target.value || null)}
              >
                <option value="">{t("admin.unsettled")}</option>
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
        <h2 style={{ marginTop: 0 }}>{t("admin.resultsP2", { page: pageLabel(2) })}</h2>
        {marketsForPage(markets, 2).map((market) => (
          <div key={market.id} className="admin-main-question">
            <strong>
              [{market.round}] {market.id}：{translateMarketName(locale, market.name)}
            </strong>
            <div className="admin-sub-list">
              {activeSubQuestions(market).map((sub) => (
                <div key={sub.id} className="admin-sub-item">
                  <span>{sub.label}</span>
                  <select
                    value={sub.winner ?? ""}
                    onChange={(e) => setSubQuestionWinner(market.id, sub.id, e.target.value || null)}
                  >
                    <option value="">{t("admin.unsettled")}</option>
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
                    {t("admin.hide")}
                  </button>
                </div>
              ))}
              {hiddenSubQuestions(market).map((sub) => (
                <div key={sub.id} className="admin-sub-item admin-sub-item-hidden">
                  <span>{sub.label}</span>
                  <span className="hidden-tag">{t("admin.hidden")}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestoreSub(market.id, sub.id, sub.label)}
                  >
                    {t("admin.restoreHide")}
                  </button>
                </div>
              ))}
              {activeSubQuestions(market).length === 0 && hiddenSubQuestions(market).length === 0 && (
                <p style={{ color: "var(--muted)", margin: 0 }}>{t("admin.noSubs")}</p>
              )}
              {activeSubQuestions(market).length === 0 && hiddenSubQuestions(market).length > 0 && (
                <p style={{ color: "var(--muted)", margin: 0 }}>{t("admin.allSubsHidden")}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.resultsP1", { page: pageLabel(3) })}</h2>
        <div className="admin-grid">
          {marketsForPage(markets, 3).map((market) => (
            <div key={market.id} className="admin-item">
              <strong>
                [{market.round}] {market.id}：{translateMarketName(locale, market.name)}
              </strong>
              <select
                value={market.winner ?? ""}
                onChange={(e) => setMarketWinner(market.id, e.target.value || null)}
              >
                <option value="">{t("admin.unsettled")}</option>
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

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>{t("admin.allPicks")}</h2>
        {players.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>{t("admin.noSubmissions")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("common.player")}</th>
                <th>{t("common.page1Short")}</th>
                <th>{t("common.page2Short")}</th>
                <th>{t("common.page3Short")}</th>
                <th>{t("common.total")}</th>
                {markets.map((market) => (
                  <th key={market.id}>{market.id}</th>
                ))}
                <th>{t("common.score")}</th>
                <th>{t("admin.action")}</th>
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
                    {player.pickStats.page3Count} / {MIN_PAGE3_PICKS}
                  </td>
                  <td>
                    {player.pickStats.totalCount} / {MIN_TOTAL_PICKS}
                  </td>
                  {markets.map((market) => (
                    <td key={market.id}>{cellForMarket(market, player.id, picks, t)}</td>
                  ))}
                  <td>{scoreFor(player.id)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePlayer(player.id, player.name)}
                    >
                      {t("common.delete")}
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
