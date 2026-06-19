import { getLeaderboardVersion } from "@/server/game-service";
import { handleRouteError, jsonOk } from "@/server/api-helpers";

export async function GET() {
  try {
    const data = await getLeaderboardVersion();
    return jsonOk(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
