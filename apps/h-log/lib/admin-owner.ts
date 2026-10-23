import { timingSafeEqual } from "node:crypto";

export const adminPrivateHeaders = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
};

export function authorizeAdminOwner(
  request: Request,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Response | null {
  const deny = (status: number, challenge = false) => new Response(null, {
    status,
    headers: { ...adminPrivateHeaders, ...(challenge ? { "www-authenticate": 'Basic realm="H-Log admin", charset="UTF-8"' } : {}) },
  });
  const key = environment.HLOG_ADMIN_OWNER_KEY ?? "";
  const origin = environment.HLOG_ADMIN_ORIGIN ?? "";
  if (environment.HLOG_ADMIN_ENABLED !== "1" || !/^[a-f0-9]{64}$/.test(key)) return deny(404);
  let configured: URL;
  try { configured = new URL(origin); } catch { return deny(404); }
  const localDevelopment = environment.NODE_ENV !== "production" && configured.protocol === "http:"
    && ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname);
  if (configured.origin !== origin || configured.username || configured.password
    || (configured.protocol !== "https:" && !localDevelopment)) return deny(404);
  // NextURL normalizes loopback addresses to localhost; Host retains the requested authority.
  const authority = request.headers.get("host");
  if (authority?.toLowerCase() !== configured.host) return deny(403);
  const expected = Buffer.from(`Basic ${Buffer.from(`owner:${key}`).toString("base64")}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return deny(401, true);
  if (!["GET", "HEAD"].includes(request.method) && (request.headers.get("origin") !== origin
    || ["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? ""))) return deny(403);
  return null;
}
