import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function POST(request) {
  let payload = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password } = payload;
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  // Fail closed: no insecure "admin"/"admin12345" fallback. If the env vars
  // aren't configured, nobody gets in — not even with the old default.
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 });
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.isAdmin = true;
  // Start of the 24h window checked by getAdminSessionStatus() — every
  // fresh login resets it, same as any normal "session expires 24h after
  // you last signed in" scheme.
  session.loginTime = Date.now();
  await session.save();

  return NextResponse.json({ ok: true });
}
