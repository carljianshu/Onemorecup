import { registerPlayer } from "@/server/game-service";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";
import type { PlayerPickInput, PlayPage } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      playerId?: string | null;
      inviteCode?: string;
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

    const result = await registerPlayer(
      {
        name: body.name,
        playerId: body.playerId,
        inviteCode: body.inviteCode,
        pickInputs: body.pickInputs,
        page: body.page,
        pagePickInputs: body.pagePickInputs
      },
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
      pickStats: result.pickStats,
      isUpdate: result.isUpdate
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
