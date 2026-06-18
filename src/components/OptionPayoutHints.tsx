"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { formatScorePlain } from "@/lib/score-format";
import { computeOptionPayoutHints } from "@/lib/scoring";
import type { Pick } from "@/types";

export function OptionPayoutHints({
  option,
  candidates,
  questionPicks,
  className
}: {
  option: string;
  candidates: string[];
  questionPicks: Pick[];
  className?: string;
}) {
  const { t } = useLocale();
  const hints = useMemo(
    () => computeOptionPayoutHints(option, candidates, questionPicks),
    [option, candidates, questionPicks]
  );

  if (hints.isVoid) return null;

  return (
    <span className={className ? `option-payout-hints ${className}` : "option-payout-hints"}>
      <span className="option-payout-hints-correct">
        {t("common.payoutIfCorrect", { amount: `+${formatScorePlain(hints.gainPerSlot)}` })}
      </span>
      <span className="option-payout-hints-wrong">
        {t("common.payoutIfWrong", { amount: `-${formatScorePlain(hints.lossPerSlot)}` })}
      </span>
    </span>
  );
}
