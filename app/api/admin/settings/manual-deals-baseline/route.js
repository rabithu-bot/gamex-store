import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import {
  getManualDealsBaseline,
  getLifetimeOrderCount,
  setManualDealsBaseline,
} from "@/app/lib/lifetimeOrderCount";

// Admin-only override for the publicly-displayed "deals completed" figure —
// exists so the owner can account for real sales history this site's own
// order table never saw (pre-website/offline/Instagram-era deals), NOT a
// mechanism for entering an arbitrary marketing number. The auto-tracked
// count is always returned alongside it so the admin panel can show both
// side by side rather than asking the admin to guess what they're overriding.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [manual, auto] = await Promise.all([getManualDealsBaseline(), getLifetimeOrderCount()]);
  return NextResponse.json({ manual, auto });
}

export async function PATCH(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { value } = await request.json().catch(() => ({}));

  // Empty/null clears the override and reverts to the real auto-tracked count.
  if (value === null || value === "" || value === undefined) {
    await setManualDealsBaseline(null);
    const auto = await getLifetimeOrderCount();
    return NextResponse.json({ manual: null, auto });
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000_000) {
    return NextResponse.json(
      { error: "Enter a whole number between 0 and 10,000,000, or leave it blank." },
      { status: 400 }
    );
  }

  await setManualDealsBaseline(parsed);
  const auto = await getLifetimeOrderCount();
  return NextResponse.json({ manual: parsed, auto });
}
