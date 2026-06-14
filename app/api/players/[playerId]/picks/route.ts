import type { NextRequest } from "next/server";
import { putPlayerPicks } from "@/server/game-service";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";
import type { PlayerPickInput, PlayPage } from "@/types";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      pickInputs?: PlayerPickInput[];
      page?: PlayPage;
      pagePickInputs?: PlayerPickInput[];
    };

    if (!body.name?.trim()) {
      return jsonError("VALIDATION_ERROR", "请输入你的名字。");
    }
    if (!body.pickInputs || !body.page || !body.pagePickInputs) {
      return jsonError("VALIDATION_ERROR", "请求参数不完整。");
    }

    const result = await putPlayerPicks(
      playerId,
      {
        name: body.name,
        pickInputs: body.pickInputs,
        page: body.page,
        pagePickInputs: body.pagePickInputs
      },
      parseVersionHeader(request)
    );

    return jsonOk({
      player: result.player,
      picks: result.picks.filter((pick) => pick.playerId === result.player.id),
      pickStats: result.pickStats,
      isUpdate: result.isUpdate,
      players: result.players,
      markets: result.markets,
      config: result.config,
      leaderboard: result.leaderboard,
      version: result.version
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
