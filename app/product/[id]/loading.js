import SiteHeader from "@/app/components/SiteHeader";

// Same reasoning as app/loading.js — renders instantly on navigation to a
// product page so clicking a listing card feels immediate instead of
// freezing while the real page's DB query round-trips.
export default function ProductLoading() {
  return (
    <>
      <SiteHeader />
      <main className="container product-page-main">
        <div className="product-layout">
          <div className="skeleton" style={{ height: 340, borderRadius: 16 }} />
          <div className="product-info">
            <div className="skeleton" style={{ height: 20, width: "35%", borderRadius: 999 }} />
            <div className="skeleton" style={{ height: 30, width: "80%", borderRadius: 8, marginTop: "0.75rem" }} />
            <div className="skeleton" style={{ height: 26, width: "40%", borderRadius: 8, marginTop: "0.75rem" }} />
            <div className="skeleton" style={{ height: 48, borderRadius: 12, marginTop: "1.25rem" }} />
            <div className="skeleton" style={{ height: 48, borderRadius: 999, marginTop: "1rem" }} />
          </div>
        </div>
      </main>
    </>
  );
}
