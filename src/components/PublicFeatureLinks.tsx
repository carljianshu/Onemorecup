"use client";

import Link from "next/link";
import { useGame } from "@/context/GameContext";
import { isAnswersAnyPublic } from "@/lib/public-features";

export function PublicFeatureLinks({ className }: { className?: string }) {
  const { ready, config } = useGame();

  if (!ready) return null;

  return (
    <>
      <Link className={className ?? "btn btn-secondary"} href="/leaderboard">
        查看排行榜
      </Link>
      {isAnswersAnyPublic(config) && (
        <Link className={className ?? "btn btn-secondary"} href="/answers">
          答题总览
        </Link>
      )}
      {isAnswersAnyPublic(config) && (
        <Link className={className ?? "btn btn-secondary"} href="/market-results">
          单场竞猜结果
        </Link>
      )}
    </>
  );
}

export function PublicFeatureNavLinks() {
  const { ready, config } = useGame();

  if (!ready) return null;

  return (
    <>
      <Link href="/leaderboard">排行榜</Link>
      {isAnswersAnyPublic(config) && <Link href="/answers">答题总览</Link>}
      {isAnswersAnyPublic(config) && <Link href="/market-results">单场竞猜结果</Link>}
    </>
  );
}