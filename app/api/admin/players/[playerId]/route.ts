import type { NextRequest } from "next/server";
import { patchPlayerHu, patchPlayerInGroup, removePlayer } from "@/server/game-service";
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
    const body = (await request.json()) as { inGroupPlayer?: boolean; huPlayer?: boolean };
    const hasInGroup = typeof body.inGroupPlayer === "boolean";
    const hasHu = typeof body.huPlayer === "boolean";
    if (!hasInGroup && !hasHu) {
      return jsonError("INVALID_BODY", "请提供 inGroupPlayer 或 huPlayer（true/false）。", 400);
    }
    if (body.inGroupPlayer !== undefined && typeof body.inGroupPlayer !== "boolean") {
      return jsonError("INVALID_BODY", "inGroupPlayer 须为 true/false。", 400);
    }
    if (body.huPlayer !== undefined && typeof body.huPlayer !== "boolean") {
      return jsonError("INVALID_BODY", "huPlayer 须为 true/false。", 400);
    }

    const version = parseVersionHeader(request);
    let state = hasInGroup
      ? await patchPlayerInGroup(playerId, body.inGroupPlayer!, version)
      : null;
    if (hasHu) {
      state = await patchPlayerHu(
        playerId,
        body.huPlayer!,
        hasInGroup ? state!.version : version
      );
    }
    return jsonOk(state!);
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
