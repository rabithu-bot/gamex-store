import { NextResponse } from "next/server";

// Template for future CPU/time-heavy work (bulk exports, large media
// processing, report generation, etc.) that shouldn't run on Vercel's
// serverless functions. This route exists in the same codebase deployed to
// both Vercel and EC2, but it's only meant to actually be *called* on the
// EC2-hosted instance (via callEc2Internal in app/lib/ec2Client.js) — its
// Vercel copy just never gets hit in normal operation.
//
// Not wired up to anything yet. Replace the body below with real work when
// a concrete heavy job needs this pattern.
export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.EC2_INTERNAL_SECRET || authHeader !== `Bearer ${process.env.EC2_INTERNAL_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
