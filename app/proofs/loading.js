import SiteHeader from "@/app/components/SiteHeader";

// Same reasoning as app/loading.js — renders instantly on navigation to
// /proofs so the click feels immediate instead of freezing while the real
// page's DB query round-trips.
export default function ProofsLoading() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <div className="skeleton" style={{ height: 32, width: "60%", borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 16, width: "80%", borderRadius: 6, marginTop: "0.6rem" }} />
        <div className="proof-gallery-grid" style={{ marginTop: "1.5rem" }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="skeleton proof-gallery-thumb"
              style={{ height: 160 + (i % 3) * 60 }}
            />
          ))}
        </div>
      </main>
    </>
  );
}
