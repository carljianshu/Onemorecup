"use client";
import Link from "next/link";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminBackupPanel } from "@/components/AdminBackupPanel";
import { CloudRefreshButton } from "@/components/CloudRefreshButton";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_PAGE3_PICKS, MIN_TOTAL_PICKS, PLAY_PAGES, isPageLocked, marketsForPage } from "@/data/markets";
import { formatPageLockUtc, isPageAutoLocked, isPageManuallyLocked, pageLocksAt } from "@/lib/page-lock";
import { formatPickTeamAsFifaCodes } from "@/lib/fifa-codes";
import { answersFeatureLabelKey, translateMarketCandidate, translateMarketName } from "@/i18n";
import { fromDatetimeLocalValue, isAnswersFeaturePublic, isEarlyMarketAnswersPublic, toDatetimeLocalValue } from "@/lib/public-features";
import { clearAdminAuthed } from "@/lib/admin-auth";
import { formatPlayerDisplayName } from "@/lib/player-display";
import { formatScore } from "@/lib/score-format";
import type { AnswersPageFeature } from "@/lib/public-features";
import type { Market, Pick, PlayPage } from "@/types";
function cellForMarket(market: Market, playerId: string, picks: Pick[], t: (key: string, values?: Record<string, string | number>) => string) {
    const pick = picks.find((p) => p.playerId === playerId && p.marketId === market.id);
    if (!pick)
        return t("common.none");
    const label = formatPickTeamAsFifaCodes(pick.team);
    return pick.stake === DOUBLE_STAKE ? `${label} ×2` : label;
}
function EarlyMarketAnswersControl({ onMessage }: {
    onMessage: (msg: {
        type: "error" | "success" | "warning";
        text: string;
    }) => void;
}) {
    const { config, setEarlyMarketAnswersPublic } = useGame();
    const { t } = useLocale();
    const label = t("admin.featureAnswersM1_1");
    const enabled = config.answersM1_1Public;
    const visible = isEarlyMarketAnswersPublic(config, "m1-1");
    function handleToggle() {
        setEarlyMarketAnswersPublic(!enabled);
        onMessage({
            type: "success",
            text: !enabled ? t("admin.opened", { label }) : t("admin.closed", { label })
        });
    }
    return (<div className="public-feature-control">
      <div className="public-feature-control-header">
        <strong>{label}</strong>
        <span className={`badge ${visible ? "open" : "locked"}`}>
          {visible ? t("admin.visible") : t("admin.disabled")}
        </span>
      </div>
      <p className="public-feature-hint">{t("admin.featureAnswersM1_1Hint")}</p>
      <button type="button" className={`btn btn-sm ${enabled ? "btn-secondary" : "btn-primary"}`} onClick={handleToggle}>
        {enabled ? t("admin.closeFeature", { label }) : t("admin.openFeature", { label })}
      </button>
    </div>);
}
function PublicFeatureControl({ feature, onMessage }: {
    feature: AnswersPageFeature;
    onMessage: (msg: {
        type: "error" | "success" | "warning";
        text: string;
    }) => void;
}) {
    const { config, setPublicFeature } = useGame();
    const { t, formatOpensAt } = useLocale();
    const label = t(answersFeatureLabelKey(feature));
    const enabled = feature === "answersPage1"
        ? config.answersPage1Public
        : feature === "answersPage2"
            ? config.answersPage2Public
            : config.answersPage3Public;
    const opensAt = feature === "answersPage1"
        ? config.answersPage1OpensAt
        : feature === "answersPage2"
            ? config.answersPage2OpensAt
            : config.answersPage3OpensAt;
    const visible = isAnswersFeaturePublic(config, feature);
    function handleOpensAtChange(value: string) {
        setPublicFeature(feature, { opensAt: fromDatetimeLocalValue(value) });
        onMessage({ type: "success", text: t("admin.updatedOpensAt", { label }) });
    }
    function handleToggle() {
        setPublicFeature(feature, { public: !enabled });
        onMessage({
            type: "success",
            text: !enabled ? t("admin.opened", { label }) : t("admin.closed", { label })
        });
    }
    return (<div className="public-feature-control">
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
        <input type="datetime-local" value={toDatetimeLocalValue(opensAt)} onChange={(e) => handleOpensAtChange(e.target.value)}/>
      </label>
      {opensAt && !visible && enabled && (<p className="public-feature-hint">
          {t("admin.opensAtPlayerHint", { time: formatOpensAt(opensAt) ?? "" })}
        </p>)}
      {opensAt && !enabled && (<p className="public-feature-hint">
          {t("admin.opensAtAutoOpenHint", { time: formatOpensAt(opensAt) ?? "" })}
        </p>)}
      <button type="button" className={`btn btn-sm ${enabled ? "btn-secondary" : "btn-primary"}`} onClick={handleToggle}>
        {enabled ? t("admin.closeFeature", { label }) : t("admin.openFeature", { label })}
      </button>
    </div>);
}
export default function AdminPage() {
    return (<AdminGate>
      <AdminPageContent />
    </AdminGate>);
}
function AdminPageContent() {
    const { ready, players, markets, picks, config, leaderboard, setMarketWinner, togglePageLocked, setRegistrationClosed, deletePlayer, setPlayerInGroup, setPlayerHu, setPhase12EarningsDeductions, setPage3EarningsDeductions, setRankLockApplied, refreshScores } = useGame();
    const { t, locale, pageLabel } = useLocale();
    const [message, setMessage] = useState<{
        type: "error" | "success" | "warning";
        text: string;
    } | null>(null);
    function scoreFor(playerId: string) {
        const score = leaderboard.find((e) => e.playerId === playerId)?.netEarnings ?? 0;
        return formatScore(score);
    }
    function handleCalculate() {
        refreshScores();
        setMessage({ type: "success", text: t("admin.scoresRecalculated") });
    }
    const phase12DeductionsOn = config.phase12EarningsDeductionsApplied;
    const page3DeductionsOn = config.page3EarningsDeductionsApplied;
    const rankLockOn = config.rankLockApplied;
    async function handleTogglePhase12Deductions() {
        const enabling = !phase12DeductionsOn;
        const confirmKey = enabling
            ? "admin.confirmGeneratePenalties"
            : "admin.confirmCancelPenaltiesPhase12";
        if (!confirm(t(confirmKey))) {
            return;
        }
        try {
            await setPhase12EarningsDeductions(enabling);
            setMessage({
                type: "success",
                text: t(enabling ? "admin.penaltiesGenerated" : "admin.penaltiesPhase12Cancelled")
            });
        }
        catch {
            setMessage({ type: "error", text: t("admin.penaltiesGenerateFailed") });
        }
    }
    async function handleTogglePage3Deductions() {
        const enabling = !page3DeductionsOn;
        const confirmKey = enabling
            ? "admin.confirmGeneratePenaltiesPage3"
            : "admin.confirmCancelPenaltiesPage3";
        if (!confirm(t(confirmKey))) {
            return;
        }
        try {
            await setPage3EarningsDeductions(enabling);
            setMessage({
                type: "success",
                text: t(enabling ? "admin.penaltiesPage3Generated" : "admin.penaltiesPage3Cancelled")
            });
        }
        catch {
            setMessage({ type: "error", text: t("admin.penaltiesGenerateFailed") });
        }
    }
    async function handleToggleRankLock() {
        const enabling = !rankLockOn;
        const confirmKey = enabling
            ? "admin.confirmApplyRankLock"
            : "admin.confirmCancelRankLock";
        if (!confirm(t(confirmKey))) {
            return;
        }
        try {
            await setRankLockApplied(enabling);
            setMessage({
                type: "success",
                text: t(enabling ? "admin.rankLockApplied" : "admin.rankLockCancelled")
            });
        }
        catch {
            setMessage({ type: "error", text: t("admin.rankLockFailed") });
        }
    }
    async function handleToggleRegistrationClosed() {
        const closing = !config.registrationClosed;
        try {
            await setRegistrationClosed(closing);
            setMessage({
                type: "success",
                text: t(closing ? "admin.registrationClosedOn" : "admin.registrationClosedOff")
            });
        }
        catch {
            setMessage({ type: "error", text: t("admin.penaltiesGenerateFailed") });
        }
    }
    async function handleDeletePlayer(playerId: string, playerName: string) {
        if (!confirm(t("admin.confirmDelete", { name: playerName }))) {
            return;
        }
        try {
            await deletePlayer(playerId);
            setMessage({ type: "success", text: t("admin.deletedPlayer", { name: playerName }) });
        }
        catch {
            setMessage({ type: "error", text: t("admin.deleteFailed") });
        }
    }
    async function handleToggleInGroup(playerId: string, playerName: string, next: boolean) {
        try {
            await setPlayerInGroup(playerId, next);
            setMessage({
                type: "success",
                text: t(next ? "admin.inGroupPlayerMarked" : "admin.inGroupPlayerUnmarked", {
                    name: playerName
                })
            });
        }
        catch {
            setMessage({ type: "error", text: t("admin.inGroupPlayerUpdateFailed") });
        }
    }
    async function handleToggleHu(playerId: string, playerName: string, next: boolean) {
        try {
            await setPlayerHu(playerId, next);
            setMessage({
                type: "success",
                text: t(next ? "admin.huPlayerMarked" : "admin.huPlayerUnmarked", {
                    name: playerName
                })
            });
        }
        catch {
            setMessage({ type: "error", text: t("admin.huPlayerUpdateFailed") });
        }
    }
    if (!ready) {
        return (<main className="container">
        <p>{t("common.loading")}</p>
      </main>);
    }
    return (<main className="container">
      <nav className="nav-bar">
        <Link href="/">{t("common.backHome")}</Link>
        <div className="lock-badges">
          {PLAY_PAGES.map((page) => {
            const locked = isPageLocked(config, page);
            const status = locked
                ? isPageManuallyLocked(config, page)
                    ? t("admin.pageLockedManual")
                    : isPageAutoLocked(config, page)
                        ? t("admin.pageLockedAuto")
                        : t("admin.pageLocked")
                : t("admin.pageOpen");
            return (<span key={page} className={`badge ${locked ? "locked" : "open"}`}>
                {pageLabel(page)}：{status}
              </span>);
        })}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
            clearAdminAuthed();
            window.location.href = "/admin";
        }}>
          {t("admin.logout")}
        </button>
        <CloudRefreshButton />
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("admin.title")}</h1>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <AdminBackupPanel />

      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={handleCalculate}>
          {t("admin.calcScores")}
        </button>
        <button type="button" className={`btn ${phase12DeductionsOn ? "btn-danger" : "btn-secondary"}`} onClick={() => void handleTogglePhase12Deductions()}>
          {phase12DeductionsOn ? t("admin.cancelPenaltiesPhase12") : t("admin.generatePenalties")}
        </button>
        <button type="button" className={`btn ${page3DeductionsOn ? "btn-danger" : "btn-secondary"}`} onClick={() => void handleTogglePage3Deductions()}>
          {page3DeductionsOn ? t("admin.cancelPenaltiesPage3") : t("admin.generatePenaltiesPage3")}
        </button>
        <button type="button" className={`btn ${rankLockOn ? "btn-danger" : "btn-secondary"}`} onClick={() => void handleToggleRankLock()}>
          {rankLockOn ? t("admin.cancelRankLock") : t("admin.applyRankLock")}
        </button>
        <button type="button" className={`btn ${config.registrationClosed ? "btn-secondary" : "btn-danger"}`} onClick={() => void handleToggleRegistrationClosed()}>
          {config.registrationClosed ? t("admin.openRegistration") : t("admin.closeRegistration")}
        </button>
        {PLAY_PAGES.map((page) => {
            const locked = isPageLocked(config, page);
            return (<button key={page} type="button" className={`btn ${locked ? "btn-secondary" : "btn-danger"}`} onClick={() => togglePageLocked(page)}>
              {locked
                    ? t("admin.unlockPage", { page: pageLabel(page) })
                    : t("admin.lockPage", { page: pageLabel(page) })}
            </button>);
        })}
      </div>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.autoLockTitle")}</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>{t("admin.autoLockDesc")}</p>
        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
          {PLAY_PAGES.map((page) => {
            const at = formatPageLockUtc(pageLocksAt(config, page));
            return (<li key={page}>
                <strong>{pageLabel(page)}</strong>
                {at ? ` — ${at}` : ""}
              </li>);
        })}
        </ul>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.publicAnswersTitle")}</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          {t("admin.publicAnswersDesc")}
        </p>
        <div className="public-feature-grid">
          <EarlyMarketAnswersControl onMessage={setMessage}/>
          <PublicFeatureControl feature="answersPage1" onMessage={setMessage}/>
          <PublicFeatureControl feature="answersPage2" onMessage={setMessage}/>
          <PublicFeatureControl feature="answersPage3" onMessage={setMessage}/>
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.resultsP1", { page: pageLabel(1) })}</h2>
        <div className="admin-grid">
          {marketsForPage(markets, 1).map((market) => (<div key={market.id} className="admin-item">
              <strong>
                [{market.round}] {market.id}：{translateMarketName(locale, market.name)}
              </strong>
              <select value={market.winner ?? ""} onChange={(e) => setMarketWinner(market.id, e.target.value || null)}>
                <option value="">{t("admin.unsettled")}</option>
                {(market.candidates ?? []).map((team) => (<option key={team} value={team}>
                    {translateMarketCandidate(locale, team)}
                  </option>))}
              </select>
            </div>))}
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.resultsP1", { page: pageLabel(2) })}</h2>
        <div className="admin-grid">
          {marketsForPage(markets, 2).map((market) => (<div key={market.id} className="admin-item">
              <strong>
                [{market.round}] {market.id}：{translateMarketName(locale, market.name)}
              </strong>
              <select value={market.winner ?? ""} onChange={(e) => setMarketWinner(market.id, e.target.value || null)}>
                <option value="">{t("admin.unsettled")}</option>
                {(market.candidates ?? []).map((team) => (<option key={team} value={team}>
                    {translateMarketCandidate(locale, team)}
                  </option>))}
              </select>
            </div>))}
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.resultsP1", { page: pageLabel(3) })}</h2>
        <div className="admin-grid">
          {marketsForPage(markets, 3).map((market) => (<div key={market.id} className="admin-item">
              <strong>
                [{market.round}] {market.id}：{translateMarketName(locale, market.name)}
              </strong>
              <select value={market.winner ?? ""} onChange={(e) => setMarketWinner(market.id, e.target.value || null)}>
                <option value="">{t("admin.unsettled")}</option>
                {(market.candidates ?? []).map((team) => (<option key={team} value={team}>
                    {translateMarketCandidate(locale, team)}
                  </option>))}
              </select>
            </div>))}
        </div>
      </section>

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0 }}>{t("admin.allPicks")}</h2>
        {players.length === 0 ? (<p style={{ color: "var(--muted)" }}>{t("admin.noSubmissions")}</p>) : (<table>
            <thead>
              <tr>
                <th>{t("admin.inGroupPlayerLabel")}</th>
                <th>{t("admin.huPlayerLabel")}</th>
                <th>{t("admin.action")}</th>
                <th>{t("common.player")}</th>
                <th>{t("common.page1Short")}</th>
                <th>{t("common.page2Short")}</th>
                <th>{t("common.page3Short")}</th>
                <th>{t("common.total")}</th>
                {markets.map((market) => (<th key={market.id}>{market.id}</th>))}
                <th>{t("common.score")}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (<tr key={player.id}>
                  <td>
                    <label className="admin-in-group-toggle">
                      <input type="checkbox" checked={Boolean(player.inGroupPlayer)} onChange={(e) => handleToggleInGroup(player.id, player.name, e.target.checked)}/>
                      <span>{t("admin.inGroupPlayer")}</span>
                    </label>
                  </td>
                  <td>
                    <label className="admin-in-group-toggle">
                      <input type="checkbox" checked={Boolean(player.huPlayer)} onChange={(e) => handleToggleHu(player.id, player.name, e.target.checked)}/>
                      <span>{t("admin.huPlayer")}</span>
                    </label>
                  </td>
                  <td>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeletePlayer(player.id, player.name)}>
                      {t("common.delete")}
                    </button>
                  </td>
                  <td>{formatPlayerDisplayName(player.name, player)}</td>
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
                  {markets.map((market) => (<td key={market.id}>{cellForMarket(market, player.id, picks, t)}</td>))}
                  <td>{scoreFor(player.id)}</td>
                </tr>))}
            </tbody>
          </table>)}
      </section>
    </main>);
}
