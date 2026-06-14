import { getGameState } from "@/server/game-service";
import { handleRouteError, jsonOk } from "@/server/api-helpers";

export async function GET() {
  try {
    const state = await getGameState();
    return jsonOk(state);
  } catch (error) {
    return handleRouteError(error);
  }
}
