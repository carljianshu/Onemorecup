"use client";

import { useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import { formatMarketMatchup, translateMarketCandidate } from "@/i18n";
import { formatScore, formatScorePlain } from "@/lib/score-format";
import {
  computeMaxColdWinStats,
  computeMaxSingleMatchWinStats,
  computePhase12CorrectPickStats,
  computePhase12IncorrectPickStats,
  computeMaxDoubleSingleMatchWinStats,
  computePhase12MarketPickBalanceStats,
  computePhase12PopularPickStats,
  computePhase12RealWorldComparison,
  computePhase12UnpopularPickStats,
  PHASE12_ANALYTICS_PAGES,
  coldSidePickersForMarket,
  type MaxColdWinRow,
  type MaxSingleMatchWinRow,
  type Page1MarketPickBalanceRow,
  type Page1RealWorldComparisonRow,
  type Page1SidePickRow,
  type Page1SidePickStats
} from "@/lib/answers-analytics";
import type { Market, Pick, Player } from "@/types";

type AnalyticsEmptyKey =
  | "answers.analyticsPopularEmpty"
  | "answers.analyticsUnpopularEmpty"
  | "answers.analyticsRealWorldEmpty"
  | "answers.analyticsPickBalanceEmpty"
  | "answers.analyticsCorrectEmpty"
  | "answers.analyticsIncorrectEmpty"
  | "answers.analyticsDoubleWinEmpty"
  | "answers.analyticsMaxWinEmpty"
  | "answers.analyticsMaxColdWinEmpty";

function groupRowsByCount<T>(
  rows: T[],
  countOf: (row: T) => number,
  nameOf: (row: T) => string,
  nameSeparator: string
): { names: string; count: number }[] {
  const order: number[] = [];
  const namesByCount = new Map<number, string[]>();

  for (const row of rows) {
    const count = countOf(row);
    if (!namesByCount.has(count)) {
      order.push(count);
      namesByCount.set(count, []);
    }
    namesByCount.get(count)!.push(nameOf(row));
  }

  return order.map((count) => ({
    count,
    names: namesByCount.get(count)!.join(nameSeparator)
  }));
}

function LeaderBlock({
  sectionNumber,
  label,
  rows,
  countKey,
  className
}: {
  sectionNumber: number;
  label: string;
  rows: Page1SidePickRow[];
  countKey:
    | "answers.analyticsPopularCount"
    | "answers.analyticsUnpopularCount"
    | "answers.analyticsSettledCount";
  className?: string;
}) {
  const { locale, t } = useLocale();
  const nameSeparator = locale === "zh" ? "、" : ", ";
  const groupedRows = useMemo(
    () =>
      groupRowsByCount(
        rows,
        (row) => row.matchCount,
        (row) => row.playerName,
        nameSeparator
      ),
    [rows, nameSeparator]
  );

  return (
    <div className={`answers-analytics-item answers-analytics-leaders${className ? ` ${className}` : ""}`}>
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <ul className="answers-analytics-leader-list answers-analytics-item-body">
        {groupedRows.map((group) => (
          <li key={group.count}>
            <span className="answers-analytics-leader-name">
              {group.names}
              <span className="answers-analytics-leader-count">
                {" "}
                {t(countKey, { count: group.count })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GapBlock({
  sectionNumber,
  label,
  rows,
  formatRate
}: {
  sectionNumber: number;
  label: string;
  rows: Page1RealWorldComparisonRow[];
  formatRate: (value: number) => string;
}) {
  const { locale, t } = useLocale();

  return (
    <div className="answers-analytics-item answers-analytics-leaders answers-analytics-gap-list">
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <ul className="answers-analytics-leader-list answers-analytics-item-body">
        {rows.map((row) => (
          <li key={row.marketId}>
            <span className="answers-analytics-leader-name">
              {translateMarketCandidate(locale, row.favoriteTeam)} vs{" "}
              {translateMarketCandidate(locale, row.underdogTeam)}
            </span>
            <span className="answers-analytics-leader-count">
              {t("answers.analyticsRealWorldGapDetail", {
                team: translateMarketCandidate(locale, row.favoriteTeam),
                playerFavorite: formatRate(row.playerFavoriteRate),
                realFavorite: formatRate(row.realFavoriteRate),
                deviation: formatRate(row.maxDeviation)
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PickBalanceCards({
  sectionNumber,
  label,
  rows,
  players,
  picks,
  cardClass,
  showColdPickers = false,
  showStake = false
}: {
  sectionNumber: number;
  label: string;
  rows: Page1MarketPickBalanceRow[];
  players: Player[];
  picks: Pick[];
  cardClass: "answers-analytics-gap-card-max" | "answers-analytics-gap-card-min";
  showColdPickers?: boolean;
  showStake?: boolean;
}) {
  const { locale, t } = useLocale();
  const nameSeparator = locale === "zh" ? "、" : ", ";

  const formatPickerNames = (marketId: string, coldTeam: string) => {
    const pickers = coldSidePickersForMarket(marketId, coldTeam, players, picks);
    if (pickers.length === 0)
      return null;
    return pickers
      .map((picker) =>
        `${picker.playerName}${picker.isDouble ? t("answers.analyticsMaxWinDoubleNote") : ""}`
      )
      .join(nameSeparator);
  };

  return (
    <div className="answers-analytics-item answers-analytics-pick-balance-section">
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <div className="answers-analytics-gap-summary answers-analytics-gap-summary-single answers-analytics-item-body">
        {rows.map((row) => {
          const marketLabel = formatMarketMatchup(locale, row.teamA, row.teamB);
          const hotTeam = translateMarketCandidate(locale, row.hotTeam);
          const coldTeam = translateMarketCandidate(locale, row.coldTeam);
          const coldPickerNames = showColdPickers
            ? formatPickerNames(row.marketId, row.coldTeam)
            : null;
          const detailSuffix = coldPickerNames
            ? t("answers.analyticsPickBalanceColdPickers", {
                team: coldTeam,
                players: coldPickerNames
              })
            : showStake && row.stakePerSlot > 0
              ? t("answers.analyticsPickBalanceStake", {
                  amount: formatScorePlain(row.stakePerSlot)
                })
              : null;

          return (
            <article
              key={row.marketId}
              className={`answers-analytics-gap-card ${cardClass}`}
            >
              <p className="answers-analytics-gap-match">{marketLabel}</p>
              <p className="answers-analytics-gap-detail">
                {t("answers.analyticsPickBalanceDetail", {
                  hotTeam,
                  hotSlots: row.hotSlots,
                  coldTeam,
                  coldSlots: row.coldSlots,
                  gap: row.gap
                })}
                {detailSuffix ? ` · ${detailSuffix}` : ""}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MaxColdWinBlock({
  sectionNumber,
  label,
  rows,
  markets,
  players,
  picks
}: {
  sectionNumber: number;
  label: string;
  rows: MaxColdWinRow[];
  markets: { id: string; name: string; candidates?: string[] }[];
  players: Player[];
  picks: Pick[];
}) {
  const { locale, t } = useLocale();
  const nameSeparator = locale === "zh" ? "、" : ", ";
  const marketById = useMemo(
    () => new Map(markets.map((market) => [market.id, market])),
    [markets]
  );

  return (
    <div className="answers-analytics-item answers-analytics-pick-balance-section">
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <div className="answers-analytics-gap-summary answers-analytics-gap-summary-single answers-analytics-item-body">
        {rows.map((row) => {
          const market = marketById.get(row.marketId);
          const candidates = market?.candidates ?? [];
          const marketLabel =
            candidates.length >= 2
              ? formatMarketMatchup(locale, candidates[0]!, candidates[1]!)
              : row.marketId;
          const winner = translateMarketCandidate(locale, row.winnerTeam);
          const hotTeam = translateMarketCandidate(locale, row.hotTeam);
          const coldTeam = translateMarketCandidate(locale, row.coldTeam);
          const winnerPickers = coldSidePickersForMarket(row.marketId, row.winnerTeam, players, picks)
            .map((picker) =>
              `${picker.playerName}${picker.isDouble ? t("answers.analyticsMaxWinDoubleNote") : ""}`
            )
            .join(nameSeparator);
          const pickerSuffix = winnerPickers
            ? t("answers.analyticsPickBalanceColdPickers", {
                team: winner,
                players: winnerPickers
              })
            : null;

          return (
            <article
              key={row.marketId}
              className="answers-analytics-gap-card answers-analytics-gap-card-min"
            >
              <p className="answers-analytics-gap-match">{marketLabel}</p>
              <p className="answers-analytics-gap-detail">
                {t("answers.analyticsMaxColdWinDetail", {
                  winner,
                  hotTeam,
                  hotSlots: row.hotSlots,
                  coldTeam,
                  coldSlots: row.coldSlots,
                  gap: row.gap
                })}
                {pickerSuffix ? ` · ${pickerSuffix}` : ""}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MaxWinBlock({
  sectionNumber,
  label,
  rows,
  markets
}: {
  sectionNumber: number;
  label: string;
  rows: MaxSingleMatchWinRow[];
  markets: { id: string; name: string; candidates?: string[] }[];
}) {
  const { locale, t } = useLocale();
  const nameSeparator = locale === "zh" ? "、" : ", ";
  const marketById = useMemo(
    () => new Map(markets.map((market) => [market.id, market])),
    [markets]
  );
  const groupedRows = useMemo(() => {
    const groups = groupRowsByCount(
      rows,
      (row) => row.winAmount,
      (row) => row.playerName,
      nameSeparator
    );
    const rowByAmount = new Map<number, MaxSingleMatchWinRow[]>();
    for (const row of rows) {
      const list = rowByAmount.get(row.winAmount) ?? [];
      list.push(row);
      rowByAmount.set(row.winAmount, list);
    }
    return groups.map((group) => ({
      ...group,
      sample: rowByAmount.get(group.count)![0]!
    }));
  }, [rows, nameSeparator]);

  return (
    <div className="answers-analytics-item answers-analytics-leaders answers-analytics-max-win-list">
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <ul className="answers-analytics-leader-list answers-analytics-item-body">
        {groupedRows.map((group) => {
          const row = group.sample;
          const market = marketById.get(row.marketId);
          const candidates = market?.candidates ?? [];
          const marketLabel =
            candidates.length >= 2
              ? formatMarketMatchup(locale, candidates[0]!, candidates[1]!)
              : row.marketId;
          const teamLabel = translateMarketCandidate(locale, row.team);
          return (
            <li key={group.count}>
              <span className="answers-analytics-leader-name">
                {group.names}
                <span className="answers-analytics-leader-count">
                  {" "}
                  {t("answers.analyticsMaxWinDetail", {
                    amount: formatScore(row.winAmount),
                    market: marketLabel,
                    team: teamLabel,
                    doubleNote: row.isDouble ? t("answers.analyticsMaxWinDoubleNote") : ""
                  })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AnalyticsSection({
  players,
  markets,
  picks
}: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
}) {
  const { t } = useLocale();

  const popularStats = useMemo(
    () => computePhase12PopularPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const unpopularStats = useMemo(
    () => computePhase12UnpopularPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const realWorldComparison = useMemo(
    () => computePhase12RealWorldComparison(markets, picks),
    [markets, picks]
  );
  const maxWinStats = useMemo(
    () => computeMaxSingleMatchWinStats(players, markets, picks, PHASE12_ANALYTICS_PAGES),
    [players, markets, picks]
  );
  const maxColdWinStats = useMemo(
    () => computeMaxColdWinStats(markets, picks, PHASE12_ANALYTICS_PAGES),
    [markets, picks]
  );
  const pickBalanceStats = useMemo(
    () => computePhase12MarketPickBalanceStats(markets, picks),
    [markets, picks]
  );
  const correctPickStats = useMemo(
    () => computePhase12CorrectPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const incorrectPickStats = useMemo(
    () => computePhase12IncorrectPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const maxDoubleWinStats = useMemo(
    () => computeMaxDoubleSingleMatchWinStats(players, markets, picks, PHASE12_ANALYTICS_PAGES),
    [players, markets, picks]
  );

  const formatRate = (value: number) => `${value.toFixed(1)}%`;

  const renderSideSection = (
    sectionNumber: number,
    label: string,
    emptyKey: AnalyticsEmptyKey,
    countKey:
      | "answers.analyticsPopularCount"
      | "answers.analyticsUnpopularCount"
      | "answers.analyticsSettledCount",
    stats: Page1SidePickStats,
    className?: string
  ) => {
    if (stats.topRows.length === 0) {
      return (
        <div className="answers-analytics-item">
          <p className="answers-analytics-leaders-label">
            {sectionNumber}. {label}
          </p>
          <p className="answers-analytics-item-body answers-analytics-placeholder">{t(emptyKey)}</p>
        </div>
      );
    }
    return (
      <LeaderBlock
        sectionNumber={sectionNumber}
        label={label}
        rows={stats.topRows}
        countKey={countKey}
        className={className}
      />
    );
  };

  const renderEmptySection = (
    sectionNumber: number,
    label: string,
    emptyKey: AnalyticsEmptyKey
  ) => (
    <div className="answers-analytics-item">
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <p className="answers-analytics-item-body answers-analytics-placeholder">{t(emptyKey)}</p>
    </div>
  );

  return (
    <section className="card answers-analytics-section">
      <h2 className="answers-analytics-title">{t("answers.analyticsTitle")}</h2>

      {renderSideSection(
        1,
        t("answers.analyticsPopularLeaders"),
        "answers.analyticsPopularEmpty",
        "answers.analyticsPopularCount",
        popularStats
      )}

      {renderSideSection(
        2,
        t("answers.analyticsUnpopularLeaders"),
        "answers.analyticsUnpopularEmpty",
        "answers.analyticsUnpopularCount",
        unpopularStats,
        "answers-analytics-leaders-unpopular"
      )}

      {realWorldComparison.topGapRows.length === 0 ? (
        renderEmptySection(3, t("answers.analyticsRealWorldTopGaps"), "answers.analyticsRealWorldEmpty")
      ) : (
        <GapBlock
          sectionNumber={3}
          label={t("answers.analyticsRealWorldTopGaps")}
          rows={realWorldComparison.topGapRows}
          formatRate={formatRate}
        />
      )}

      {realWorldComparison.bottomGapRows.length === 0 ? (
        renderEmptySection(4, t("answers.analyticsRealWorldSmallestGaps"), "answers.analyticsRealWorldEmpty")
      ) : (
        <GapBlock
          sectionNumber={4}
          label={t("answers.analyticsRealWorldSmallestGaps")}
          rows={realWorldComparison.bottomGapRows}
          formatRate={formatRate}
        />
      )}

      {pickBalanceStats.rows.length === 0 ? (
        <>
          {renderEmptySection(5, t("answers.analyticsPickBalanceMostLopsided"), "answers.analyticsPickBalanceEmpty")}
          {renderEmptySection(6, t("answers.analyticsPickBalanceMostBalanced"), "answers.analyticsPickBalanceEmpty")}
        </>
      ) : (
        <>
          <PickBalanceCards
            sectionNumber={5}
            label={t("answers.analyticsPickBalanceMostLopsided")}
            rows={pickBalanceStats.mostLopsidedRows}
            players={players}
            picks={picks}
            cardClass="answers-analytics-gap-card-max"
            showColdPickers
          />
          <PickBalanceCards
            sectionNumber={6}
            label={t("answers.analyticsPickBalanceMostBalanced")}
            rows={pickBalanceStats.mostBalancedRows}
            players={players}
            picks={picks}
            cardClass="answers-analytics-gap-card-min"
            showStake
          />
        </>
      )}

      {renderSideSection(
        7,
        t("answers.analyticsCorrectLeaders"),
        "answers.analyticsCorrectEmpty",
        "answers.analyticsSettledCount",
        correctPickStats
      )}

      {renderSideSection(
        8,
        t("answers.analyticsIncorrectLeaders"),
        "answers.analyticsIncorrectEmpty",
        "answers.analyticsSettledCount",
        incorrectPickStats
      )}

      {maxDoubleWinStats.topRows.length === 0 ? (
        renderEmptySection(9, t("answers.analyticsDoubleWinLeaders"), "answers.analyticsDoubleWinEmpty")
      ) : (
        <MaxWinBlock
          sectionNumber={9}
          label={t("answers.analyticsDoubleWinLeaders")}
          rows={maxDoubleWinStats.topRows}
          markets={markets}
        />
      )}

      {maxWinStats.topRows.length === 0 ? (
        renderEmptySection(10, t("answers.analyticsMaxWinLeaders"), "answers.analyticsMaxWinEmpty")
      ) : (
        <MaxWinBlock
          sectionNumber={10}
          label={t("answers.analyticsMaxWinLeaders")}
          rows={maxWinStats.topRows}
          markets={markets}
        />
      )}

      {maxColdWinStats.topRows.length === 0 ? (
        renderEmptySection(11, t("answers.analyticsMaxColdWin"), "answers.analyticsMaxColdWinEmpty")
      ) : (
        <MaxColdWinBlock
          sectionNumber={11}
          label={t("answers.analyticsMaxColdWin")}
          rows={maxColdWinStats.topRows}
          markets={markets}
          players={players}
          picks={picks}
        />
      )}
    </section>
  );
}

export function AnswersDataAnalytics() {
  const { players, markets, picks } = useGame();
  const { t } = useLocale();

  if (players.length === 0) {
    return (
      <div className="card answers-analytics-card">
        <p className="answers-analytics-placeholder">{t("answers.empty")}</p>
      </div>
    );
  }

  return (
    <div className="answers-analytics-stack">
      <AnalyticsSection players={players} markets={markets} picks={picks} />
    </div>
  );
}
