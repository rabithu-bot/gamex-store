import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import { prisma } from "@/app/lib/prisma";
import { getSessionId } from "@/app/lib/customerSession";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const sessionId = await getSessionId();
  const orders = sessionId
    ? await prisma.order.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 640 }}>
        <h1>My Orders</h1>
        <p className="muted">Orders linked to this browser — no account or order ID needed.</p>

        {orders.length === 0 && (
          <div className="empty-state">
            <p>No orders yet on this device.</p>
            <Link href="/" className="btn" style={{ marginTop: "1rem", display: "inline-flex" }}>
              Browse listings
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
            {orders.map((o) => (
              <Link key={o.id} href={`/order/${o.id}`} className="panel my-order-row">
                <div>
                  <strong>{o.listingTitle}</strong>
                  <span className="muted">
                    Order #{o.id} · ₹{o.listingPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <span className={`status-pill ${o.status}`}>{o.status.replace("_", " ")}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
