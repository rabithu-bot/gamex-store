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

export async function requireAdmin() {
  const session = await getSession();
  return Boolean(session.isAdmin);
}
