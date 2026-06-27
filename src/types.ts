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
  /** 管理员标注：群内玩家（不影响规则与计分） */
  inGroupPlayer?: boolean;
  /** 管理员生成：1/16、1/8 未答满扣收益（美元） */
  pickPenalty?: number;
  /** 管理员生成：1/4 决赛及以后未答满扣收益（美元，仅晋级区） */
  pickPenaltyPage3?: number;
}

export interface Market {
  id: string;
  round: string;
  name: string;
  page: PlayPage;
  winner: string | null;
  candidates?: string[];
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
  /** 管理员可手动开关；到达 opensAt 后若仍关闭会自动打开（每轮计划仅一次） */
  answersPage1Public: boolean;
  /** 管理员可手动开关；到达 opensAt 后若仍关闭会自动打开（每轮计划仅一次） */
  answersPage2Public: boolean;
  /** 管理员可手动开关；到达 opensAt 后若仍关闭会自动打开（每轮计划仅一次） */
  answersPage3Public: boolean;
  /** 可选：第一页最早可开放/展示时间（ISO） */
  answersPage1OpensAt: string | null;
  answersPage2OpensAt: string | null;
  answersPage3OpensAt: string | null;
  /** 该页预设开放时间已触发过自动开放（避免管理员关闭后再次自动打开） */
  answersPage1ScheduleOpenApplied: boolean;
  answersPage2ScheduleOpenApplied: boolean;
  answersPage3ScheduleOpenApplied: boolean;
  /** 管理员已开启 1/16·1/8 扣收益 */
  phase12EarningsDeductionsApplied: boolean;
  /** 管理员已开启 1/4+ 扣收益 */
  page3EarningsDeductionsApplied: boolean;
  /** 1/4 决赛及以后页面锁定后定格晋级名单的时间（UTC ISO） */
  promotionLockedAt: string | null;
  /** 定格时晋级玩家 id（前 2/3，按当时 netEarnings 降序） */
  promotedPlayerIds: string[] | null;
  /** 定格时淘汰玩家 id（后 1/3，按当时 netEarnings 降序，名次不再与晋级区交叉） */
  eliminatedPlayerIds: string[] | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  /** 竞猜结算毛收益 */
  totalScore: number;
  /** 扣除未答满扣收益后的净收益 */
  netEarnings: number;
  pickPenalty: number;
  pickPenaltyPage3: number;
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
