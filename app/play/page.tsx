"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api-client";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useLocale } from "@/context/LocaleContext";
import { useGame } from "@/context/GameContext";
import {
  DOUBLE_STAKE,
  DISTRIBUTION_ADJUSTMENT_NOTE_MARKET_ID,
  MIN_PAGE1_PICKS,
  MIN_PAGE2_PICKS,
  MIN_PAGE3_PICKS,
  MIN_TOTAL_PICKS,
  STAKE_PER_PICK,
  isPageLocked,
  marketsForPage,
  minPicksForPage,
  pageLocksAt,
  formatPageDeadlineDisplay,
  PLAY_PAGES
} from "@/data/markets";
import { translateMarketName } from "@/i18n";
import { translatePageSaveError } from "@/i18n/validation";
import { doubleIdsForPage, initSelectionMap, mergePickInputsForPageSave } from "@/lib/market-helpers";
import { countSelections, describePickShortfall, validatePageSave } from "@/lib/pick-stats";
import { isValidInviteCode } from "@/lib/invite-code";
import { isPlayerPromoted, promotionCutoffCount } from "@/lib/promotion";
import type { GameConfig, Market, Pick, PlayerPickInput, PlayPage } from "@/types";

function buildPickInputsForPage(
  page: PlayPage,
  markets: Market[],
  selections: Record<string, string | null>,
  doubles: Record<string, boolean>,
  config: GameConfig,
  editingPlayerId: string | null,
  picks: Pick[]
): PlayerPickInput[] {
  const result: PlayerPickInput[] = [];
  const locked = isPageLocked(config, page);

  for (const market of markets) {
    if (market.page !== page) continue;

    if (locked && editingPlayerId) {
      const existing = picks.find(
        (p) => p.playerId === editingPlayerId && p.marketId === market.id
      );
      if (existing) {
        result.push({
          marketId: market.id,
          team: existing.team,
          double: existing.stake === DOUBLE_STAKE
        });
      }
      continue;
    }
    if (selections[market.id] !== null) {
      result.push({
        marketId: market.id,
        team: selections[market.id] as string,
        double: doubles[market.id] ?? false
      });
    }
  }

  return result;
}

export default function PlayPage() {
  const { ready, markets, picks, config, currentPlayerId, submitPicks, players, leaderboard } = useGame();
  const { t, locale, playPageLabel } = useLocale();
  const [step, setStep] = useState<PlayPage>(1);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [doubles, setDoubles] = useState<Record<string, boolean>>({});
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);
  const bottomMessageRef = useRef<HTMLDivElement>(null);
  const selectionsDirtyRef = useRef(false);
  const prevPlayerIdRef = useRef<string | null>(null);

  const isEditing = Boolean(editingPlayerId);
  const pageMarkets = useMemo(() => marketsForPage(markets, step), [markets, step]);
  const pageLocked = isPageLocked(config, step);
  const pageDeadline = formatPageDeadlineDisplay(pageLocksAt(config, step), locale);
  const activePlayerId = editingPlayerId ?? currentPlayerId;
  const page3Promoted = isPlayerPromoted(leaderboard, activePlayerId);
  const pageInputBlocked = pageLocked || (step === 3 && !page3Promoted);
  const promotionCutoff = promotionCutoffCount(leaderboard.length);

  useEffect(() => {
    if (!ready || markets.length === 0) return;

    if (prevPlayerIdRef.current !== currentPlayerId) {
      selectionsDirtyRef.current = false;
      prevPlayerIdRef.current = currentPlayerId;
    }
    if (selectionsDirtyRef.current) return;

    const initial = initSelectionMap(markets);
    const initialDoubles: Record<string, boolean> = {};

    if (currentPlayerId) {
      const player = players.find((p) => p.id === currentPlayerId);
      const playerPicks = picks.filter((pick) => pick.playerId === currentPlayerId);
      if (player) {
        setName(player.name);
        setEditingPlayerId(currentPlayerId);
        for (const pick of playerPicks) {
          if (pick.marketId in initial) {
            initial[pick.marketId] = pick.team;
            if (pick.stake === DOUBLE_STAKE) initialDoubles[pick.marketId] = true;
          }
        }
      }
    }

    setSelections(initial);
    setDoubles(initialDoubles);
  }, [ready, markets, currentPlayerId, players, picks]);

  const pickStats = useMemo(() => countSelections(selections, markets), [selections, markets]);

  const pageDoubleId = useMemo(() => {
    for (const id of doubleIdsForPage(markets, step)) {
      if (doubles[id]) return id;
    }
    return null;
  }, [doubles, markets, step]);

  useEffect(() => {
    if (message?.type === "error" || message?.type === "warning") {
      bottomMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [message]);

  function selectAnswer(pickId: string, team: string | null) {
    selectionsDirtyRef.current = true;
    setSelections((prev) => ({ ...prev, [pickId]: team }));
    if (team === null) {
      setDoubles((prev) => ({ ...prev, [pickId]: false }));
    }
    setMessage(null);
  }

  function toggleDouble(doubleId: string) {
    selectionsDirtyRef.current = true;
    setDoubles((prev) => {
      if (prev[doubleId]) {
        return { ...prev, [doubleId]: false };
      }
      const next = { ...prev };
      for (const id of doubleIdsForPage(markets, step)) {
        next[id] = false;
      }
      next[doubleId] = true;
      return next;
    });
    setMessage(null);
  }

  function renderDoubleButton(doubleId: string, enabled: boolean, hint: string) {
    const isOn = doubles[doubleId] ?? false;
    const blocked = pageInputBlocked || !enabled;

    return (
      <button
        type="button"
        className={`team-btn double ${isOn ? "selected" : ""}`}
        onClick={() => toggleDouble(doubleId)}
        disabled={blocked}
        title={enabled ? t("play.doubleTitle") : hint}
      >
        {t("common.double")}{isOn ? t("play.doublePoints") : ""}
      </button>
    );
  }

  function needsInviteCode() {
    if (activePlayerId) return false;
    const trimmed = name.trim();
    if (!trimmed) return true;
    return !players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setMessage({ type: "error", text: t("play.errName") });
      return;
    }

    if (needsInviteCode() && !isValidInviteCode(inviteCode)) {
      setMessage({ type: "error", text: t("play.errInviteCode") });
      return;
    }

    if (pageInputBlocked) {
      if (step === 3 && !page3Promoted) {
        setMessage({
          type: "warning",
          text: t("play.page3NotPromoted", {
            cutoff: promotionCutoff,
            total: leaderboard.length
          })
        });
        return;
      }
      setMessage({
        type: "warning",
        text: t("play.pageLockedSubmit", { page: playPageLabel(step) })
      });
      return;
    }

    const pageInputs = buildPickInputsForPage(
      step,
      markets,
      selections,
      doubles,
      config,
      editingPlayerId,
      picks
    );
    const pickInputs = mergePickInputsForPageSave(
      step,
      pageInputs,
      markets,
      editingPlayerId,
      picks
    );

    const validationError = validatePageSave(step, pickInputs, markets, pageInputs);
    if (validationError) {
      setMessage({ type: "error", text: translatePageSaveError(t, validationError) });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { playerId, pickStats: savedStats } = await submitPicks(
        name.trim(),
        pickInputs,
        editingPlayerId,
        step,
        pageInputs,
        needsInviteCode() ? inviteCode : undefined
      );
      setEditingPlayerId(playerId);
      selectionsDirtyRef.current = false;
      const successText =
        step === 1
          ? t("play.successP1", { count: savedStats.page1Count, min: MIN_PAGE1_PICKS })
          : step === 3
            ? t("play.successP3", { count: savedStats.page3Count, min: MIN_PAGE3_PICKS })
            : (() => {
              const base = t("play.successP2", {
                p1: savedStats.page1Count,
                p2: savedStats.page2Count,
                total: savedStats.totalCount
              });
              const shortfall = describePickShortfall(savedStats);
              if (!shortfall.hasShortfall) return base;
              return `${base} ${t("play.warnP2Shortfall", {
                missing: shortfall.penaltyItems,
                p2: savedStats.page2Count,
                page2Min: MIN_PAGE2_PICKS,
                total: savedStats.totalCount,
                totalMin: MIN_TOTAL_PICKS,
                penalty: STAKE_PER_PICK,
                penaltyTotal: shortfall.penaltyItems * STAKE_PER_PICK
              })}`;
            })();
      const shortfall = step === 2 ? describePickShortfall(savedStats) : null;
      setMessage({
        type: shortfall?.hasShortfall ? "warning" : "success",
        text: successText
      });
    } catch (error) {
      if (error instanceof ApiError) {
        const text =
          error.code === "DUPLICATE_NAME"
            ? t("play.errDuplicateName")
            : error.code === "INVITE_CODE_INVALID"
              ? t("play.errInviteCode")
              : error.code === "PAGE3_NOT_PROMOTED"
              ? t("play.page3NotPromoted", {
                  cutoff: promotionCutoff,
                  total: leaderboard.length
                })
              : error.code === "TOO_MANY_DOUBLES"
              ? step === 1
                ? t("play.errTooManyDoublesP1")
                : step === 3
                  ? t("play.errTooManyDoublesP3")
                  : t("play.errTooManyDoublesP2")
              : error.message;
        setMessage({ type: "error", text });
        return;
      }
      const code = error instanceof Error ? error.message : "";
      const text =
        code === "DUPLICATE_NAME"
          ? t("play.errDuplicateName")
          : code === "INVITE_CODE_INVALID"
            ? t("play.errInviteCode")
            : code === "PAGE3_NOT_PROMOTED"
            ? t("play.page3NotPromoted", {
                cutoff: promotionCutoff,
                total: leaderboard.length
              })
            : code === "TOO_MANY_DOUBLES"
            ? step === 1
              ? t("play.errTooManyDoublesP1")
              : step === 3
                ? t("play.errTooManyDoublesP3")
                : t("play.errTooManyDoublesP2")
            : t("play.errSave");
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
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
        <PublicFeatureNavLinks />
      </nav>

      <h1 style={{ marginTop: 0 }}>{t("play.title")}</h1>

      <div className="page-steps">
        {PLAY_PAGES.map((page) => {
          const count =
            page === 1
              ? pickStats.page1Count
              : page === 2
                ? pickStats.page2Count
                : pickStats.page3Count;
          const total = minPicksForPage(page);
          const page3Denied = page === 3 && !isPlayerPromoted(leaderboard, activePlayerId);
          return (
            <button
              key={page}
              type="button"
              className={`page-step ${step === page ? "active" : ""} ${isPageLocked(config, page) ? "locked" : ""} ${page3Denied ? "not-promoted" : ""}`}
              onClick={() => setStep(page)}
            >
              {playPageLabel(page)} · {t("play.pageAnswered", { count, total })}
              {isPageLocked(config, page) && " 🔒"}
              {page3Denied && " ⛔"}
            </button>
          );
        })}
      </div>

      {pageDeadline && (
        <div className="page-deadline-banner" role="status">
          {t("play.pageDeadline", { time: pageDeadline })}
        </div>
      )}

      {isEditing && !pageInputBlocked && (
        <div className="message success">{t("play.loadedEdit")}</div>
      )}

      {pageLocked && (
        <div className="message warning">{t("play.pageLocked", { page: playPageLabel(step) })}</div>
      )}

      {step === 3 && !page3Promoted && (
        <div className="message warning">
          {t("play.page3NotPromoted", {
            cutoff: promotionCutoff,
            total: leaderboard.length
          })}
        </div>
      )}

      {step === 1 && (
        <>
          <div className="field">
            <label htmlFor="name">{t("play.yourName")}</label>
            <input
              id="name"
              type="text"
              placeholder={t("play.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pageLocked}
            />
          </div>
          {needsInviteCode() && (
            <div className="field">
              <label htmlFor="invite-code">{t("play.inviteCode")}</label>
              <input
                id="invite-code"
                type="text"
                placeholder={t("play.inviteCodePlaceholder")}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={pageLocked}
                autoComplete="off"
              />
            </div>
          )}
        </>
      )}

      <div className="status-bar pick-stats-bar">
        <span>
          {t("play.page1Answered")}<strong>{pickStats.page1Count}</strong> / {MIN_PAGE1_PICKS}
        </span>
        <span>
          {t("play.page2Answered")}<strong>{pickStats.page2Count}</strong> / {MIN_PAGE2_PICKS}
        </span>
        <span>
          {t("play.page3Answered")}<strong>{pickStats.page3Count}</strong> / {MIN_PAGE3_PICKS}
        </span>
        <span>
          {t("play.totalAnswered")}<strong>{pickStats.totalCount}</strong> / {MIN_TOTAL_PICKS}
        </span>
        <span>
          {t("play.pageDouble")}
          <strong>{pageDoubleId ? pageDoubleId.toUpperCase() : t("play.doubleNone")}</strong>
        </span>
      </div>

      {pageMarkets.map((market) => (
        <Fragment key={market.id}>
          {market.id === DISTRIBUTION_ADJUSTMENT_NOTE_MARKET_ID && (
            <div className="play-distribution-note card" role="note">
              <p>{t("play.page3DistributionNote")}</p>
            </div>
          )}
          <section className="card item-card">
          <h3>
            {market.id.toUpperCase()}：{translateMarketName(locale, market.name)}
          </h3>
          <p className="prompt">{t("play.pleaseChoose")}</p>
          <div className="team-options">
            {(market.candidates ?? []).map((team) => (
              <button
                key={team}
                type="button"
                className={`team-btn ${selections[market.id] === team ? "selected" : ""}`}
                onClick={() => selectAnswer(market.id, team)}
                disabled={pageInputBlocked}
              >
                {team}
              </button>
            ))}
            <button
              type="button"
              className={`team-btn skip ${selections[market.id] === null ? "selected" : ""}`}
              onClick={() => selectAnswer(market.id, null)}
              disabled={pageInputBlocked}
            >
              {t("common.skip")}
            </button>
            {renderDoubleButton(
              market.id,
              selections[market.id] !== null,
              t("play.doubleNeedAnswer")
            )}
          </div>
        </section>
        </Fragment>
      ))}

      {message && (
        <div ref={bottomMessageRef} className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="actions page-nav">
        {step > 1 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep((step - 1) as PlayPage)}
          >
            {t("play.prevPage")}
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep((step + 1) as PlayPage)}
          >
            {t("play.nextPage")}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || pageInputBlocked}
        >
          {submitting ? t("play.saving") : t("play.savePage")}
        </button>
      </div>
    </main>
  );
}
