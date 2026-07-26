import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "gamex_order_tokens";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — comfortably past the 24h purge window
const MAX_ENTRIES = 25; // FIFO cap so the cookie stays well under the 4KB browser limit

function readTokenMap(cookieStore) {
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function generateAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashAccessToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Read-only — safe to call from Server Components as well as Route Handlers.
export async function getOrderAccessToken(orderId) {
  const cookieStore = await cookies();
  return readTokenMap(cookieStore)[orderId] ?? null;
}

// Route Handlers only (mutates the response's cookies). Merges
// { [orderId]: token } into the buyer's token cookie — a keyed map rather
// than one cookie per order, since a buyer can accumulate several orders on
// the same device over time. Takes the raw token as an argument rather than
// generating one itself, so the caller can persist a matching hash on the
// Order row *before* writing the cookie — generating a token here and a
// different one for the DB would silently make every fresh order
// inaccessible.
export async function setOrderAccessCookie(orderId, token) {
  const cookieStore = await cookies();
  const map = readTokenMap(cookieStore);
  map[orderId] = token;

  const entries = Object.entries(map);
  const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;

  cookieStore.set(COOKIE_NAME, JSON.stringify(Object.fromEntries(trimmed)), {
    httpOnly: true,
    // Matches the existing gamex_session_id cookie's approach: Secure requires
    // HTTPS, which would silently break every order on local http://localhost
    // dev if hardcoded true. Vercel is always HTTPS in production, so this is
    // fully Secure where it actually matters.
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

// `order` must include the `accessTokenHash` field (select it in the caller's
// query). Orders created before this system existed have a null hash and are
// grandfathered through unconditionally — the alternative (fail closed) would
// instantly lock every existing customer out of their own order, including
// ones with live confirmed orders holding real credentials.
export async function assertOrderAccess(orderId, order) {
  if (!order.accessTokenHash) return true;

  const token = await getOrderAccessToken(orderId);
  if (!token) return false;

  const candidate = Buffer.from(hashAccessToken(token), "hex");
  const stored = Buffer.from(order.accessTokenHash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}
