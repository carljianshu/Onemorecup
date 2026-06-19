/** 排行榜 API 轮询间隔（毫秒）。轮询先打 /api/leaderboard/version，有变化才拉全量。 */
export const LEADERBOARD_POLL_MS = 30_000;

const LIVE_SYNC_PATHS = new Set([
  "/play",
  "/leaderboard",
  "/admin",
  "/answers",
  "/market-results"
]);

/** 当前路由是否需要定时拉取云端数据（首页、规则页等不轮询）。 */
export function pathNeedsLiveSync(pathname: string): boolean {
  return LIVE_SYNC_PATHS.has(pathname);
}
