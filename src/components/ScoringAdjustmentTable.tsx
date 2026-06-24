"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { formatScorePlain } from "@/lib/score-format";
import { buildStandardAdjustmentTableRows } from "@/lib/scoring";

const PARTICIPANT_COUNT = 10;

export function ScoringAdjustmentTable() {
  const { t } = useLocale();
  const rows = useMemo(() => buildStandardAdjustmentTableRows(PARTICIPANT_COUNT), []);

  return (
    <section className="card scoring-rules-table-card">
      <h2 className="scoring-rules-block-title">{t("scoringRules.adjustmentTableTitle")}</h2>
      <p className="scoring-rules-body">{t("scoringRules.adjustmentTableLead")}</p>
      <div className="table-wrap">
        <table className="scoring-rules-table">
          <thead>
            <tr>
              <th>{t("scoringRules.adjustmentColCorrect")}</th>
              <th>{t("scoringRules.adjustmentColWrong")}</th>
              <th>{t("scoringRules.adjustmentColStd")}</th>
              <th>{t("scoringRules.adjustmentColFactor")}</th>
              <th>{t("scoringRules.adjustmentColStake")}</th>
              <th>{t("scoringRules.adjustmentColWinnerEarning")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.correctCount}-${row.wrongCount}`}>
                <td>{row.correctCount}</td>
                <td>{row.wrongCount}</td>
                <td>{formatScorePlain(row.scoreStd)}</td>
                <td>{formatScorePlain(row.adjustment)}</td>
                <td>{formatScorePlain(row.stakePerSlot)}</td>
                <td>{formatScorePlain(row.winnerEarning)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
