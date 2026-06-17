"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PublicFeatureNavLinks } from "@/components/PublicFeatureLinks";
import { useGame } from "@/context/GameContext";
import { DOUBLE_STAKE, MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_TOTAL_PICKS, PAGE_LABELS, isPageLocked, marketsForPage } from "@/data/markets";
import {
  activeSubQuestions,
  doubleIdsForPage,
  findSubQuestion,
  formatMainQuestionProgress,
  initSelectionMap,
  isMainQuestionSkipped,
  MAIN_QUESTION_SKIP,
  mergePickInputsForPageSave,
  validatePage2MainQuestionState
} from "@/lib/market-helpers";
import { countSelections, validatePageSave } from "@/lib/pick-stats";
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

    if (page === 1) {
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
      continue;
    }

    for (const sub of activeSubQuestions(market)) {
      if (isMainQuestionSkipped(market, selections)) continue;
      if (locked && editingPlayerId) {
        const existing = picks.find(
          (p) => p.playerId === editingPlayerId && p.marketId === sub.id
        );
        if (existing) {
          result.push({
            marketId: sub.id,
            team: existing.team,
            double: doubles[market.id] ?? false
          });
        }
        continue;
      }
      if (selections[sub.id] !== null) {
        result.push({
          marketId: sub.id,
          team: selections[sub.id] as string,
          double: doubles[market.id] ?? false
        });
      }
    }
  }

  return result;
}

export default function PlayPage() {
  const { ready, markets, picks, config, currentPlayerId, submitPicks, players } = useGame();
  const [step, setStep] = useState<PlayPage>(1);
  const [name, setName] = useState("");
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
            continue;
          }
          const subMatch = findSubQuestion(markets, pick.marketId);
          if (subMatch) {
            initial[pick.marketId] = pick.team;
            if (pick.stake === DOUBLE_STAKE) initialDoubles[subMatch.market.id] = true;
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
    setSelections((prev) => {
      const next = { ...prev, [pickId]: team };
      const subMatch = findSubQuestion(markets, pickId);
      if (subMatch && team !== null) {
        next[subMatch.market.id] = null;
      }
      return next;
    });
    if (team === null) {
      setDoubles((prev) => {
        const next = { ...prev, [pickId]: false };
        const subMatch = findSubQuestion(markets, pickId);
        if (subMatch) next[subMatch.market.id] = false;
        return next;
      });
    }
    setMessage(null);
  }

  function toggleMainQuestionSkip(marketId: string) {
    const market = markets.find((m) => m.id === marketId);
    if (!market || market.page !== 2) return;

    selectionsDirtyRef.current = true;
    setSelections((prev) => {
      const skipped = prev[marketId] === MAIN_QUESTION_SKIP;
      if (skipped) {
        return { ...prev, [marketId]: null };
      }
      const next = { ...prev, [marketId]: MAIN_QUESTION_SKIP };
      for (const sub of activeSubQuestions(market)) {
        next[sub.id] = null;
      }
      return next;
    });
    setDoubles((prev) => ({ ...prev, [marketId]: false }));
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
    const blocked = pageLocked || !enabled;

    return (
      <button
        type="button"
        className={`team-btn double ${isOn ? "selected" : ""}`}
        onClick={() => toggleDouble(doubleId)}
        disabled={blocked}
        title={enabled ? "双倍投注（20 分）" : hint}
      >
        Double{isOn ? " · 20分" : ""}
      </button>
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setMessage({ type: "error", text: "请输入你的名字。" });
      return;
    }

    if (pageLocked) {
      setMessage({
        type: "warning",
        text: `${PAGE_LABELS[step]} 已锁定，无法修改本页竞猜。`
      });
      return;
    }

    if (step === 2) {
      const structureError = validatePage2MainQuestionState(markets, selections);
      if (structureError) {
        setMessage({ type: "error", text: structureError });
        return;
      }
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
      setMessage({ type: "error", text: validationError });
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
        pageInputs
      );
      setEditingPlayerId(playerId);
      selectionsDirtyRef.current = false;
      const successText =
        step === 1
          ? `第一页已保存！已答 ${savedStats.page1Count}/${MIN_PAGE1_PICKS} 题。锁定前可随时修改。`
          : `第二页已保存！第一页 ${savedStats.page1Count} 题，第二页 ${savedStats.page2Count} 题，总计 ${savedStats.totalCount} 题。锁定前可随时修改。`;
      setMessage({ type: "success", text: successText });
    } catch (error) {
      if (error instanceof ApiError) {
        const text =
          error.code === "DUPLICATE_NAME"
            ? "该名字已被其他玩家使用。"
            : error.code === "TOO_MANY_DOUBLES"
              ? step === 1
                ? "第一页最多只能选 1 题 Double。"
                : "第二页最多只能选 1 道大题 Double。"
              : error.message;
        setMessage({ type: "error", text });
        return;
      }
      const code = error instanceof Error ? error.message : "";
      const text =
        code === "DUPLICATE_NAME"
          ? "该名字已被其他玩家使用。"
          : code === "TOO_MANY_DOUBLES"
            ? step === 1
              ? "第一页最多只能选 1 题 Double。"
              : "第二页最多只能选 1 道大题 Double。"
            : "保存失败，请重试。";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
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
        <PublicFeatureNavLinks />
      </nav>

      <h1 style={{ marginTop: 0 }}>玩家竞猜</h1>

      <div className="page-steps">
        {([1, 2] as PlayPage[]).map((page) => {
          const count = page === 1 ? pickStats.page1Count : pickStats.page2Count;
          const total = page === 1 ? MIN_PAGE1_PICKS : MIN_PAGE2_PICKS;
          return (
            <button
              key={page}
              type="button"
              className={`page-step ${step === page ? "active" : ""} ${isPageLocked(config, page) ? "locked" : ""}`}
              onClick={() => setStep(page)}
            >
              {PAGE_LABELS[page]} · 已答 {count}/{total}
              {isPageLocked(config, page) && " 🔒"}
            </button>
          );
        })}
      </div>

      {step === 2 && (
        <div className="message" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>
          第二页每道大题含 4 个小题：须<strong style={{ color: "var(--text)" }}>全部小题都作答</strong>，或点击大题旁的「不选」跳过该题。只答了部分小题时无法保存。
        </div>
      )}

      {isEditing && !pageLocked && (
        <div className="message success">已加载你上次的竞猜，可随时修改并点击「保存当页」。</div>
      )}

      {pageLocked && (
        <div className="message warning">{PAGE_LABELS[step]} 已锁定，无法再修改本页题目。</div>
      )}

      {step === 1 && (
        <div className="field">
          <label htmlFor="name">你的名字</label>
          <input
            id="name"
            type="text"
            placeholder="输入昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pageLocked}
          />
        </div>
      )}

      <div className="status-bar pick-stats-bar">
        <span>
          第一页已答：<strong>{pickStats.page1Count}</strong> / {MIN_PAGE1_PICKS}
        </span>
        <span>
          第二页已答：<strong>{pickStats.page2Count}</strong> / {MIN_PAGE2_PICKS}
        </span>
        <span>
          总计已答：<strong>{pickStats.totalCount}</strong> / {MIN_TOTAL_PICKS}
        </span>
        <span>
          本页 Double：
          <strong>{pageDoubleId ? pageDoubleId.toUpperCase() : "未选"}</strong>
          <span className="muted-inline">
            （每页最多 1 次{step === 2 ? "，按大题" : ""}，20 分）
          </span>
        </span>
      </div>

      {step === 1 &&
        pageMarkets.map((market) => (
          <section key={market.id} className="card item-card">
            <h3>
              {market.id.toUpperCase()}：{market.name}
            </h3>
            <p className="prompt">请选择：</p>
            <div className="team-options">
              {(market.candidates ?? []).map((team) => (
                <button
                  key={team}
                  type="button"
                  className={`team-btn ${selections[market.id] === team ? "selected" : ""}`}
                  onClick={() => selectAnswer(market.id, team)}
                  disabled={pageLocked}
                >
                  {team}
                </button>
              ))}
              <button
                type="button"
                className={`team-btn skip ${selections[market.id] === null ? "selected" : ""}`}
                onClick={() => selectAnswer(market.id, null)}
                disabled={pageLocked}
              >
                不选
              </button>
              {renderDoubleButton(
                market.id,
                selections[market.id] !== null,
                "请先选择答案再使用 Double"
              )}
            </div>
          </section>
        ))}

      {step === 2 &&
        pageMarkets.map((market) => {
          const progress = formatMainQuestionProgress(market, selections);
          const skipped = progress.skipped;
          return (
            <section key={market.id} className="card item-card">
              <div className="main-question-header">
                <h3>
                  {market.id.toUpperCase()}：{market.name}
                </h3>
                <div className="main-question-actions">
                  <span
                    className={`completion-badge ${progress.complete ? "done" : ""} ${skipped ? "skipped" : ""}`}
                  >
                    {skipped
                      ? "已选择不选"
                      : `小题 ${progress.done}/${progress.total}${progress.complete ? " · 已完成" : ""}`}
                  </span>
                  <button
                    type="button"
                    className={`team-btn skip ${skipped ? "selected" : ""}`}
                    onClick={() => toggleMainQuestionSkip(market.id)}
                    disabled={pageLocked}
                  >
                    不选
                  </button>
                  {renderDoubleButton(
                    market.id,
                    progress.complete,
                    "请先答完本大题全部小题再使用 Double"
                  )}
                </div>
              </div>
              {!skipped &&
                activeSubQuestions(market).map((sub) => (
                  <div key={sub.id} className="sub-question">
                    <h4>{sub.label}</h4>
                    <div className="team-options">
                      {sub.candidates.map((team) => (
                        <button
                          key={team}
                          type="button"
                          className={`team-btn ${selections[sub.id] === team ? "selected" : ""}`}
                          onClick={() => selectAnswer(sub.id, team)}
                          disabled={pageLocked}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </section>
          );
        })}

      {message && (
        <div ref={bottomMessageRef} className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="actions page-nav">
        {step === 2 && (
          <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
            上一页
          </button>
        )}
        {step === 1 && (
          <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
            下一页
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || pageLocked}
        >
          {submitting ? "保存中…" : "保存当页"}
        </button>
      </div>
    </main>
  );
}
