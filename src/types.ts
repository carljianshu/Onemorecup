export type PlayPage = 1 | 2 | 3;

export interface PickStats {
  page1Count: number;
  page2Count: number;
  page3Count: number;
  totalCount: number;
}

export interface Player {
  id: string;
  name: string;
  createdAt: string;
  pickStats: PickStats;
}

export interface SubQuestion {
  id: string;
  label: string;
  candidates: [string, string];
  deleted: boolean;
  winner: string | null;
}

export interface Market {
  id: string;
  round: string;
  name: string;
  page: PlayPage;
  winner: string | null;
  candidates?: string[];
  subQuestions?: SubQuestion[];
}

export type StakeAmount = 10 | 20;

export interface Pick {
  playerId: string;
  marketId: string;
  team: string;
  stake: StakeAmount;
}

export interface GameConfig {
  page1Locked: boolean;
  page2Locked: boolean;
  page3Locked: boolean;
  /** UTC ISO；到达后自动锁定，管理员手动解锁可覆盖至下次手动锁定 */
  page1LocksAt: string | null;
  page2LocksAt: string | null;
  page3LocksAt: string | null;
  page1LockOverridden: boolean;
  page2LockOverridden: boolean;
  page3LockOverridden: boolean;
  /** 管理员手动开放后，玩家可见答题总览第一页 */
  answersPage1Public: boolean;
  /** 管理员手动开放后，玩家可见答题总览第二页 */
  answersPage2Public: boolean;
  /** 管理员手动开放后，玩家可见答题总览第三页 */
  answersPage3Public: boolean;
  /** 可选：第一页最早可开放/展示时间（ISO） */
  answersPage1OpensAt: string | null;
  answersPage2OpensAt: string | null;
  answersPage3OpensAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  totalScore: number;
  settledCount: number;
  /** 该玩家已提交竞猜的项目数 */
  guessedCount: number;
  pickStats: PickStats;
  marketScores: Record<string, number>;
}

export interface PlayerPickInput {
  marketId: string;
  team: string;
  double?: boolean;
}
