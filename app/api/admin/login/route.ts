import { createAdminToken, verifyAdminPassword } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk } from "@/server/api-helpers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    if (!body.password || !verifyAdminPassword(body.password)) {
      return jsonError("UNAUTHORIZED", "密码错误，请重试。", 401);
    }

    const { token, expiresAt } = createAdminToken();
    return jsonOk({ token, expiresAt });
  } catch (error) {
    return handleRouteError(error);
  }
}
