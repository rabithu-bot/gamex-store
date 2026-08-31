import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

const fallbackSessionSecret = "dev-session-secret-32-chars-long-12345";

function getSessionOptions() {
  return {
    cookieName: "storefront_admin_session",
    password: process.env.SESSION_SECRET ?? fallbackSessionSecret,
    cookieOptions: {
      // Secure in production (Vercel is always HTTPS), off in dev so the
      // cookie isn't silently dropped when testing from a phone over plain
      // http:// on the LAN. Same pattern as the buyer's order-token cookie
      // in orderAccessToken.js — this one guards the admin session, so it's
      // the last cookie on the site that should be sent in the clear.
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, getSessionOptions());
}

// Checked against session.loginTime (set at successful login) rather than
// only the cookie's own maxAge, so an expired-by-age session is
// distinguishable from "never logged in" — the dashboard layout uses that
// distinction to show a "session expired" toast only when it's actually true.
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// "none" (no session / never logged in), "expired" (was valid, past 24h),
// or "ok". Every admin API route only cares about ok-vs-not (see
// requireAdmin below); the dashboard layout is the one place that needs
// the finer distinction to redirect with the right message.
//
// Deliberately read-only — never destroys the cookie itself. This runs
// from the dashboard layout (a Server Component) as well as Route
// Handlers, and Next only allows cookie writes from the latter; a stale
// cookie is harmless left in place since every check re-validates
// loginTime from scratch rather than trusting isAdmin alone. The one place
// that actually needs it gone (the login page, after redirect) clears it
// through /api/admin/logout, which is a real Route Handler.
export async function getAdminSessionStatus() {
  const session = await getSession();
  if (!session.isAdmin) return "none";
  if (!session.loginTime || Date.now() - session.loginTime > SESSION_MAX_AGE_MS) {
    return "expired";
  }
  return "ok";
}

export async function requireAdmin() {
  return (await getAdminSessionStatus()) === "ok";
}
