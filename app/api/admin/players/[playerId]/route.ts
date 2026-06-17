import type { NextRequest } from "next/server";
import { removePlayer } from "@/server/game-service";
import { requireAdmin } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  const auth = requireAdmin(request.headers.get("authorization"));
  if (!auth.ok) return jsonError(auth.error, "需要管理员权限。", auth.status);

  try {
    const { playerId } = await context.params;
    const state = await removePlayer(playerId, parseVersionHeader(request));
    return jsonOk(state);
  } catch (error) {
    return handleRouteError(error);
  }
}
