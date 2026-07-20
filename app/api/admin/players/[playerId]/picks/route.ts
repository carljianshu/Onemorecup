import type { NextRequest } from "next/server";
import { adminSavePlayerPagePicks } from "@/server/game-service";
import { requireAdmin } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";
import type { PlayerPickInput, PlayPage } from "@/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  const auth = requireAdmin(request.headers.get("authorization"));
  if (!auth.ok) return jsonError(auth.error, "需要管理员权限。", auth.status);

  try {
    const { playerId } = await context.params;
    const body = (await request.json()) as {
      page?: PlayPage;
      pagePickInputs?: PlayerPickInput[];
    };
    if (body.page !== 1 && body.page !== 2 && body.page !== 3) {
      return jsonError("INVALID_BODY", "请提供 page（1、2 或 3）。", 400);
    }
    if (!Array.isArray(body.pagePickInputs) || body.pagePickInputs.length === 0) {
      return jsonError("INVALID_BODY", "请提供 pagePickInputs 数组。", 400);
    }
    for (const input of body.pagePickInputs) {
      if (!input?.marketId || !input?.team) {
        return jsonError("INVALID_BODY", "每道题须包含 marketId 与 team。", 400);
      }
    }

    const result = await adminSavePlayerPagePicks(
      playerId,
      { page: body.page, pagePickInputs: body.pagePickInputs },
      parseVersionHeader(request)
    );
    return jsonOk({
      leaderboard: result.leaderboard,
      players: result.players,
      markets: result.markets,
      picks: result.picks,
      config: result.config,
      version: result.version,
      player: result.player,
      pickStats: result.pickStats
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
