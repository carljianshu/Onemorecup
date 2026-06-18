import { NextResponse } from "next/server";
import { VersionConflictError } from "@/server/storage";

export function jsonOk<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json({ error: code, message, ...extra }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof VersionConflictError) {
    return jsonError("VERSION_CONFLICT", "数据已被他人更新，请刷新后重试。", 409);
  }

  if (error instanceof Error) {
    const map: Record<string, { message: string; status: number }> = {
      DUPLICATE_NAME: { message: "该名字已被其他玩家使用。", status: 400 },
      DUPLICATE_MARKET: { message: "存在重复的题目。", status: 400 },
      TOO_MANY_DOUBLES: { message: "Double 题目数量超出限制。", status: 400 },
      INVALID_MARKET: { message: "题目无效。", status: 400 },
      INVALID_TEAM: { message: "选项无效。", status: 400 },
      PAGE_LOCKED: { message: "该页已锁定，无法修改。", status: 400 },
      PAGE3_NOT_PROMOTED: {
        message: "你未进入晋级区，无法作答1/4决赛及以后的题目。",
        status: 403
      },
      PLAYER_NOT_FOUND: { message: "玩家不存在。", status: 404 }
    };
    const mapped = map[error.message];
    if (mapped) {
      return jsonError(error.message, mapped.message, mapped.status);
    }
    if (error.message && !error.message.startsWith("VERSION_")) {
      return jsonError("VALIDATION_ERROR", error.message, 400);
    }
  }

  console.error(error);
  return jsonError("INTERNAL_ERROR", "服务器错误，请稍后重试。", 500);
}

export function parseVersionHeader(request: Request) {
  const raw = request.headers.get("if-match");
  if (!raw) return undefined;
  const version = Number(raw);
  return Number.isFinite(version) ? version : undefined;
}
