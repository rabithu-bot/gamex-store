import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { getSocialLinks, saveSocialLinks, SOCIAL_LINK_FIELDS } from "@/app/lib/socialLinks";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getSocialLinks());
}

export async function PATCH(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // A blank field is valid (that's how a button gets hidden on the
  // storefront) — only a non-empty value gets validated as a real URL, so
  // a typo doesn't silently save something that will never work.
  for (const field of SOCIAL_LINK_FIELDS) {
    const value = String(body[field] || "").trim();
    if (value && !/^https?:\/\/\S+$/i.test(value)) {
      return NextResponse.json(
        { error: `${field} must be a full link starting with http:// or https://` },
        { status: 400 }
      );
    }
  }

  const saved = await saveSocialLinks(body);
  return NextResponse.json(saved);
}
