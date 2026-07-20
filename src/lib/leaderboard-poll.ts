const LIVE_SYNC_PATHS = new Set([
  "/play",
  "/leaderboard",
  "/admin",
  "/answers",
  "/market-results"
]);

/** 需要手动拉取云端最新数据的页面。 */
export function pathNeedsLiveSync(pathname: string): boolean {
  return LIVE_SYNC_PATHS.has(pathname);
}
