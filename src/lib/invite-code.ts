import type { Player } from "@/types";

export const INVITE_CODE = "one";

export function isValidInviteCode(code: string): boolean {
  return code.trim().toLowerCase() === INVITE_CODE;
}

export function findKnownPlayer(
  players: Player[],
  playerId: string | null | undefined,
  name: string
): Player | undefined {
  const byId = playerId ? players.find((p) => p.id === playerId) : undefined;
  if (byId)
    return byId;
  const trimmedName = name.trim();
  if (!trimmedName)
    return undefined;
  return players.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
}

/** 仅新玩家注册需要邀请码；已有玩家（playerId 或同名）更新时跳过。 */
export function assertInviteCodeForRegistration(
  name: string,
  playerId: string | null | undefined,
  players: Player[],
  inviteCode: string | undefined
): void {
  if (findKnownPlayer(players, playerId, name))
    return;
  if (!isValidInviteCode(inviteCode ?? "")) {
    throw new Error("INVITE_CODE_INVALID");
  }
}

/** 关闭注册时仅已在册玩家可保存；否则走邀请码逻辑。 */
export function assertRegistrationAllowed(
  name: string,
  playerId: string | null | undefined,
  players: Player[],
  registrationClosed: boolean,
  inviteCode?: string
): void {
  if (findKnownPlayer(players, playerId, name))
    return;
  if (registrationClosed)
    throw new Error("REGISTRATION_CLOSED");
  assertInviteCodeForRegistration(name, playerId, players, inviteCode);
}

export function isKnownPlayer(
  players: Player[],
  playerId: string | null | undefined,
  name: string
): boolean {
  return findKnownPlayer(players, playerId, name) !== undefined;
}
