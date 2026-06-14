import type { NextRequest } from "next/server";
import { patchMarketWinner } from "@/server/game-service";
import { requireAdmin } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ marketId: string }> }
) {
  const auth = requireAdmin(request.headers.get("authorization"));
  if (!auth.ok) return jsonError(auth.error, "需要管理员权限。", auth.status);

  try {
    const { marketId } = await context.params;
    const body = (await request.json()) as { winner?: string | null };
    const state = await patchMarketWinner(marketId, body.winner ?? null, parseVersionHeader(request));
    return jsonOk(state);
  } catch (error) {
    return handleRouteError(error);
  }
}
