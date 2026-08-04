// Calls an "/api/internal/*" route on the EC2-hosted copy of this same
// codebase instead of running the work in Vercel's serverless functions —
// for anything CPU/time-heavy enough that it shouldn't share a Vercel
// function's execution-time and memory limits. EC2_INTERNAL_URL points at
// the EC2 box directly (e.g. "http://13.203.86.60:3000"), not the public
// gamexstore.com domain, since Vercel owns that DNS name.
export async function callEc2Internal(path, { method = "POST", body } = {}) {
  const base = process.env.EC2_INTERNAL_URL;
  const secret = process.env.EC2_INTERNAL_SECRET;
  if (!base || !secret) {
    throw new Error("EC2_INTERNAL_URL / EC2_INTERNAL_SECRET are not configured");
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`EC2 internal call to ${path} failed: ${res.status}`);
  }
  return res.json();
}
