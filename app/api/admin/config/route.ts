import type { NextRequest } from "next/server";
import { patchGameConfig } from "@/server/game-service";
import { requireAdmin } from "@/server/auth";
import { handleRouteError, jsonError, jsonOk, parseVersionHeader } from "@/server/api-helpers";
import type { AnswersPageFeature } from "@/lib/public-features";
import type { PlayPage } from "@/types";
export async function PATCH(request: NextRequest) {
    const auth = requireAdmin(request.headers.get("authorization"));
    if (!auth.ok)
        return jsonError(auth.error, "需要管理员权限。", auth.status);
    try {
        const body = (await request.json()) as {
            page?: PlayPage;
            locked?: boolean;
            feature?: AnswersPageFeature;
            public?: boolean;
            opensAt?: string | null;
            answersM1_1Public?: boolean;
        };
        const state = await patchGameConfig({
            page: body.page,
            pageLocked: body.locked,
            feature: body.feature,
            public: body.public,
            opensAt: body.opensAt,
            answersM1_1Public: body.answersM1_1Public
        }, parseVersionHeader(request));
        return jsonOk(state);
    }
    catch (error) {
        return handleRouteError(error);
    }
}
