"use client";

import { useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { useLocale } from "@/context/LocaleContext";
import { formatMarketHeading, translateMarketCandidate } from "@/i18n";
import { formatScore, formatScorePlain } from "@/lib/score-format";
import {
  computeMaxColdWinStats,
  computeMaxPotentialSingleMatchWinStats,
  computeMaxSingleMatchWinStats,
  computePage1CorrectPickStats,
  computePage1IncorrectPickStats,
  computePage1MarketPickBalanceStats,
  computePage1PopularPickStats,
  computePage1RealWorldComparison,
  computePage1UnpopularPickStats,
  coldSidePickersForMarket,
  type MaxColdWinRow,
  type MaxSingleMatchWinRow,
  type Page1MarketPickBalanceRow,
  type Page1RealWorldComparisonRow,
  type Page1SidePickRow,
  type Page1SidePickStats
} from "@/lib/answers-analytics";
import type { Pick, Player } from "@/types";

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
  markets,
  players,
  picks,
  cardClass,
  showColdPickers = false,
  showStake = false
}: {
  sectionNumber: number;
  label: string;
  rows: Page1MarketPickBalanceRow[];
  markets: { id: string; name: string; candidates?: string[] }[];
  players: Player[];
  picks: Pick[];
  cardClass: "answers-analytics-gap-card-max" | "answers-analytics-gap-card-min";
  showColdPickers?: boolean;
  showStake?: boolean;
}) {
  const { locale, t } = useLocale();
  const nameSeparator = locale === "zh" ? "、" : ", ";
  const marketById = useMemo(
    () => new Map(markets.map((market) => [market.id, market])),
    [markets]
  );

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
          const market = marketById.get(row.marketId);
          const marketLabel = market
            ? formatMarketHeading(locale, market.id, market.name)
            : row.marketId;
          const hotTeam = translateMarketCandidate(locale, row.hotTeam);
          const coldTeam = translateMarketCandidate(locale, row.coldTeam);
          const coldPickerNames = showColdPickers
            ? formatPickerNames(row.marketId, row.coldTeam)
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
              </p>
              {coldPickerNames ? (
                <p className="answers-analytics-gap-meta">
                  {t("answers.analyticsPickBalanceColdPickers", {
                    team: coldTeam,
                    players: coldPickerNames
                  })}
                </p>
              ) : null}
              {showStake && row.stakePerSlot > 0 ? (
                <p className="answers-analytics-gap-meta">
                  {t("answers.analyticsPickBalanceStake", {
                    amount: formatScorePlain(row.stakePerSlot)
                  })}
                </p>
              ) : null}
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
          const marketLabel = market
            ? formatMarketHeading(locale, market.id, market.name)
            : row.marketId;
          const winner = translateMarketCandidate(locale, row.winnerTeam);
          const hotTeam = translateMarketCandidate(locale, row.hotTeam);
          const coldTeam = translateMarketCandidate(locale, row.coldTeam);
          const winnerPickers = coldSidePickersForMarket(row.marketId, row.winnerTeam, players, picks)
            .map((picker) =>
              `${picker.playerName}${picker.isDouble ? t("answers.analyticsMaxWinDoubleNote") : ""}`
            )
            .join(nameSeparator);

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
              </p>
              {winnerPickers ? (
                <p className="answers-analytics-gap-meta">
                  {t("answers.analyticsPickBalanceColdPickers", {
                    team: winner,
                    players: winnerPickers
                  })}
                </p>
              ) : null}
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
  markets: { id: string; name: string }[];
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
          const marketLabel = market
            ? formatMarketHeading(locale, market.id, market.name)
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

export function AnswersDataAnalytics() {
  const { players, markets, picks } = useGame();
  const { t } = useLocale();

  const popularStats = useMemo(
    () => computePage1PopularPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const unpopularStats = useMemo(
    () => computePage1UnpopularPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const realWorldComparison = useMemo(
    () => computePage1RealWorldComparison(markets, picks),
    [markets, picks]
  );
  const maxWinStats = useMemo(
    () => computeMaxSingleMatchWinStats(players, markets, picks),
    [players, markets, picks]
  );
  const maxColdWinStats = useMemo(
    () => computeMaxColdWinStats(markets, picks),
    [markets, picks]
  );
  const maxPotentialWinStats = useMemo(
    () => computeMaxPotentialSingleMatchWinStats(players, markets, picks),
    [players, markets, picks]
  );
  const pickBalanceStats = useMemo(
    () => computePage1MarketPickBalanceStats(markets, picks),
    [markets, picks]
  );
  const correctPickStats = useMemo(
    () => computePage1CorrectPickStats(players, markets, picks),
    [players, markets, picks]
  );
  const incorrectPickStats = useMemo(
    () => computePage1IncorrectPickStats(players, markets, picks),
    [players, markets, picks]
  );

  const formatRate = (value: number) => `${value.toFixed(1)}%`;

  if (players.length === 0) {
    return (
      <div className="card answers-analytics-card">
        <p className="answers-analytics-placeholder">{t("answers.empty")}</p>
      </div>
    );
  }

  const renderSideSection = (
    sectionNumber: number,
    label: string,
    empty: string,
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
          <p className="answers-analytics-item-body answers-analytics-placeholder">{empty}</p>
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

  const renderEmptySection = (sectionNumber: number, label: string, empty: string) => (
    <div className="answers-analytics-item">
      <p className="answers-analytics-leaders-label">
        {sectionNumber}. {label}
      </p>
      <p className="answers-analytics-item-body answers-analytics-placeholder">{empty}</p>
    </div>
  );

  return (
    <div className="answers-analytics-stack">
      <section className="card answers-analytics-section">
        <h2 className="answers-analytics-title">{t("answers.analyticsTitle")}</h2>

        {renderSideSection(
          1,
          t("answers.analyticsPopularLeaders"),
          t("answers.analyticsPopularEmpty"),
          "answers.analyticsPopularCount",
          popularStats
        )}

        {renderSideSection(
          2,
          t("answers.analyticsUnpopularLeaders"),
          t("answers.analyticsUnpopularEmpty"),
          "answers.analyticsUnpopularCount",
          unpopularStats,
          "answers-analytics-leaders-unpopular"
        )}

        {realWorldComparison.topGapRows.length === 0 ? (
          renderEmptySection(3, t("answers.analyticsRealWorldTopGaps"), t("answers.analyticsRealWorldEmpty"))
        ) : (
          <GapBlock
            sectionNumber={3}
            label={t("answers.analyticsRealWorldTopGaps")}
            rows={realWorldComparison.topGapRows}
            formatRate={formatRate}
          />
        )}

        {realWorldComparison.bottomGapRows.length === 0 ? (
          renderEmptySection(4, t("answers.analyticsRealWorldSmallestGaps"), t("answers.analyticsRealWorldEmpty"))
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
            {renderEmptySection(5, t("answers.analyticsPickBalanceMostLopsided"), t("answers.analyticsPickBalanceEmpty"))}
            {renderEmptySection(6, t("answers.analyticsPickBalanceMostBalanced"), t("answers.analyticsPickBalanceEmpty"))}
          </>
        ) : (
          <>
            <PickBalanceCards
              sectionNumber={5}
              label={t("answers.analyticsPickBalanceMostLopsided")}
              rows={pickBalanceStats.mostLopsidedRows}
              markets={markets}
              players={players}
              picks={picks}
              cardClass="answers-analytics-gap-card-max"
              showColdPickers
            />
            <PickBalanceCards
              sectionNumber={6}
              label={t("answers.analyticsPickBalanceMostBalanced")}
              rows={pickBalanceStats.mostBalancedRows}
              markets={markets}
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
          t("answers.analyticsCorrectEmpty"),
          "answers.analyticsSettledCount",
          correctPickStats
        )}

        {renderSideSection(
          8,
          t("answers.analyticsIncorrectLeaders"),
          t("answers.analyticsIncorrectEmpty"),
          "answers.analyticsSettledCount",
          incorrectPickStats
        )}

        {maxPotentialWinStats.topRows.length === 0 ? (
          renderEmptySection(9, t("answers.analyticsMaxPotentialWinLeaders"), t("answers.analyticsMaxPotentialWinEmpty"))
        ) : (
          <MaxWinBlock
            sectionNumber={9}
            label={t("answers.analyticsMaxPotentialWinLeaders")}
            rows={maxPotentialWinStats.topRows}
            markets={markets}
          />
        )}

        {maxWinStats.topRows.length === 0 ? (
          renderEmptySection(10, t("answers.analyticsMaxWinLeaders"), t("answers.analyticsMaxWinEmpty"))
        ) : (
          <MaxWinBlock
            sectionNumber={10}
            label={t("answers.analyticsMaxWinLeaders")}
            rows={maxWinStats.topRows}
            markets={markets}
          />
        )}

        {maxColdWinStats.topRows.length === 0 ? (
          renderEmptySection(11, t("answers.analyticsMaxColdWin"), t("answers.analyticsMaxColdWinEmpty"))
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
    </div>
  );
}
