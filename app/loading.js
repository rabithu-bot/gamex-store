import SiteHeader from "@/app/components/SiteHeader";

// Next.js renders this instantly the moment navigation to / starts,
// keeping it mounted until the real Server Component below finishes
// fetching — so clicking "Home" (or the logo) never sits on a blank/frozen
// screen while the listings query round-trips to the DB, even though this
// page is still fully dynamic (real availability, not stale cache).
export default function HomeLoading() {
  return (
    <>
      <SiteHeader />
      <main className="container">
        <div className="skeleton" style={{ height: 32, width: "70%", borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 16, width: "50%", borderRadius: 6, marginTop: "0.6rem" }} />
        <div className="listing-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card" style={{ animation: "none" }}>
              <div className="skeleton" style={{ height: 150, borderRadius: 0 }} />
              <div style={{ padding: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="skeleton" style={{ height: 14, width: "80%", borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 12, width: "50%", borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 20, width: "40%", borderRadius: 6, marginTop: "0.3rem" }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
