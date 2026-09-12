import SiteHeader from "@/app/components/SiteHeader";

// Same reasoning as app/loading.js — renders instantly on navigation to
// /orders so the click feels immediate. This page stays genuinely dynamic
// (it's scoped to the visitor's own session cookie, so it can't safely be
// cached like Home/Proofs/Product can) — this only covers the wait itself.
export default function OrdersLoading() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 640 }}>
        <div className="skeleton" style={{ height: 28, width: "40%", borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 6, marginTop: "0.5rem" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 66, borderRadius: 16 }} />
          ))}
        </div>
      </main>
    </>
  );
}
