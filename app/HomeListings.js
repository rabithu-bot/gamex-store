"use client";

import { useMemo, useState } from "react";
import { Search, PackageOpen } from "lucide-react";
import ListingCard from "@/app/components/ListingCard";

// Quick-filter pills map to REAL fields already on every listing
// (rareItems / level) — never a decorative filter that doesn't actually
// filter anything.
const QUICK_FILTERS = [
  { id: "evo", label: "Evo Guns", test: (l) => (l.rareItems || []).join(" ").toLowerCase().includes("evo") },
  { id: "level75", label: "Level 75+", test: (l) => Number(l.level) >= 75 },
  { id: "cobra", label: "Cobra Gun", test: (l) => (l.rareItems || []).join(" ").toLowerCase().includes("cobra") },
];

function groupByCategory(listings) {
  const groups = [];
  const indexByKey = new Map();
  for (const listing of listings) {
    const raw = (listing.category || "Other").trim();
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ category: raw, items: [] });
    }
    groups[indexByKey.get(key)].items.push(listing);
  }
  return groups;
}

export default function HomeListings({ listings }) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());

  function toggleFilter(id) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((listing) => {
      if (q) {
        const haystack = `${listing.title} ${listing.category} ${listing.gameUid || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      for (const filterId of activeFilters) {
        const filter = QUICK_FILTERS.find((f) => f.id === filterId);
        if (filter && !filter.test(listing)) return false;
      }
      return true;
    });
  }, [listings, query, activeFilters]);

  const categoryGroups = groupByCategory(filtered);
  const isFiltering = query.trim() !== "" || activeFilters.size > 0;

  return (
    <>
      <div className="storefront-search-row">
        <div className="storefront-search-input-wrap">
          <Search size={16} className="storefront-search-icon" />
          <input
            type="search"
            className="storefront-search-input"
            placeholder="Search by title, category, or UID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search listings"
          />
        </div>
        <div className="storefront-filter-pills">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`storefront-filter-pill ${activeFilters.has(f.id) ? "active" : ""}`}
              onClick={() => toggleFilter(f.id)}
              aria-pressed={activeFilters.has(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isFiltering && filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">
            <PackageOpen size={22} />
          </div>
          <strong>No listings match that search</strong>
          <p className="muted" style={{ marginTop: "0.3rem" }}>
            Try a different keyword or clear the filters above.
          </p>
        </div>
      )}

      {categoryGroups.map(({ category, items }, groupIndex) => (
        <section key={category} style={{ marginTop: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.75rem" }}>{category} Accounts</h3>
          <div className="listing-grid">
            {items.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                priority={!isFiltering && groupIndex === 0 && index < 2}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
