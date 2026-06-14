import type { NextRequest } from "next/server";
import { restoreSubQuestionAction } from "@/server/game-service";
import { requireAdmin } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ marketId: string; subId: string }> }
) {
  const auth = requireAdmin(request.headers.get("authorization"));
  if (!auth.ok) return jsonError(auth.error, "需要管理员权限。", auth.status);

  try {
    const { marketId, subId } = await context.params;
    const state = await restoreSubQuestionAction(marketId, subId, parseVersionHeader(request));
    return jsonOk(state);
  } catch (error) {
    return handleRouteError(error);
  }
}
