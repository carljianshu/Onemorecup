import type { NextRequest } from "next/server";
import { patchPlayerInGroup, removePlayer } from "@/server/game-service";
import { requireAdmin } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  const auth = requireAdmin(request.headers.get("authorization"));
  if (!auth.ok) return jsonError(auth.error, "需要管理员权限。", auth.status);

  try {
    const { playerId } = await context.params;
    const body = (await request.json()) as { inGroupPlayer?: boolean };
    if (typeof body.inGroupPlayer !== "boolean") {
      return jsonError("INVALID_BODY", "请提供 inGroupPlayer（true/false）。", 400);
    }
    const state = await patchPlayerInGroup(
      playerId,
      body.inGroupPlayer,
      parseVersionHeader(request)
    );
    return jsonOk(state);
  } catch (error) {
    return handleRouteError(error);
  }
}

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
