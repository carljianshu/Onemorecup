"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { formatScorePlain, roundScore } from "@/lib/score-format";
import { computeOptionPayoutHints } from "@/lib/scoring";
import type { Pick } from "@/types";

export function OptionPayoutHints({
  option,
  candidates,
  questionPicks,
  marketId,
  className,
  slotMultiplier = 1
}: {
  option: string;
  candidates: string[];
  questionPicks: Pick[];
  marketId?: string;
  className?: string;
  /** Double 为 2 个计分位，展示该玩家本题总得失。 */
  slotMultiplier?: number;
}) {
  const { t } = useLocale();
  const hints = useMemo(
    () => computeOptionPayoutHints(option, candidates, questionPicks, marketId),
    [option, candidates, questionPicks, marketId]
  );

  if (hints.isVoid) return null;

  const gain = roundScore(hints.gainPerSlot * slotMultiplier);
  const loss = roundScore(hints.lossPerSlot * slotMultiplier);

  return (
    <span className={className ? `option-payout-hints ${className}` : "option-payout-hints"}>
      <span className="option-payout-hints-correct">
        {t("common.payoutIfCorrect", { amount: `+${formatScorePlain(gain)}` })}
      </span>
      <span className="option-payout-hints-wrong">
        {t("common.payoutIfWrong", { amount: `-${formatScorePlain(loss)}` })}
      </span>
    </span>
  );
}
