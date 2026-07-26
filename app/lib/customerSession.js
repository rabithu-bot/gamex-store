import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "gamex_session_id";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Read-only — safe to call from Server Components and Route Handlers alike.
// Returns null if the buyer has never checked out on this device.
export async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// Read-or-create — only callable from Route Handlers / Server Actions (Next.js
// forbids setting cookies from a Server Component render). Every buyer gets a
// stable id on their first checkout, letting them come back later and find
// their orders with no login and no order link to keep track of.
export async function getOrCreateSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return sessionId;
}
