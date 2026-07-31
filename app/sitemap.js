import { prisma } from "@/app/lib/prisma";
import { SITE_URL } from "@/app/lib/siteUrl";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const listings = await prisma.listing.findMany({
    where: { status: "available" },
    select: { id: true, createdAt: true },
  });

  const staticRoutes = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/proofs`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const productRoutes = listings.map((listing) => ({
    url: `${SITE_URL}/product/${listing.id}`,
    lastModified: listing.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
