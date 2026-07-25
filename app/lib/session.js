import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

const fallbackSessionSecret = "dev-session-secret-32-chars-long-12345";

function getSessionOptions() {
  return {
    cookieName: "storefront_admin_session",
    password: process.env.SESSION_SECRET ?? fallbackSessionSecret,
    cookieOptions: {
      // Hardcoded false: this runs over plain HTTP (localhost + LAN/mobile testing),
      // and a Secure cookie gets silently dropped by browsers on non-HTTPS, non-localhost
      // origins. Flip to true once this is actually deployed behind HTTPS.
      secure: false,
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
