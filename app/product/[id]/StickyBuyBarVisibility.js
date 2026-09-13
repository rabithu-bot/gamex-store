"use client";

import { useEffect } from "react";

// The mobile "buy-bar" (fixed above the tab bar — see globals.css) used to
// just animate in once on mount and then stay fixed for the rest of the
// page, including once the buyer has scrolled well past this listing and
// into "Similar Accounts" below. At that point it's a persistent CTA for
// the WRONG product sitting on top of other listings' own cards — a real
// risk of an accidental wrong-account purchase, not just visual clutter.
//
// This only toggles a class; #buy-bar itself is only ever `position:
// fixed` inside the existing mobile media query, so this has no effect at
// desktop widths where the bar is already just inline, non-fixed content.
export default function StickyBuyBarVisibility() {
  useEffect(() => {
    const buyBar = document.getElementById("buy-bar");
    const similarSection = document.getElementById("similar-accounts");
    if (!buyBar || !similarSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        buyBar.classList.toggle("buy-bar-hidden", entry.isIntersecting);
      },
      // Fires as soon as "Similar Accounts" starts entering the bottom 20%
      // of the viewport — hides the bar a beat before its content is
      // actually on-screen, rather than only once it's already visible.
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(similarSection);
    return () => observer.disconnect();
  }, []);

  return null;
}
