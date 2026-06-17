import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function adminSecret() {
  return process.env.ADMIN_PASSWORD ?? "Isi";
}

export function verifyAdminPassword(password: string) {
  return password === adminSecret();
}

export function createAdminToken() {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp }), "utf-8").toString("base64url");
  const signature = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt: new Date(exp).toISOString() };
}

export function verifyAdminToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(authorization: string | null) {
  if (!verifyAdminToken(authorization)) {
    return { ok: false as const, status: 401, error: "UNAUTHORIZED" };
  }
  return { ok: true as const };
}
