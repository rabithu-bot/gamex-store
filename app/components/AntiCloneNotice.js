"use client";

import { useEffect } from "react";

// Two things, both purely informational to a *human* who ends up looking at
// this site's code (view-source, a saved copy, or a browser DevTools
// console) — neither of these tries to instruct or manipulate any AI tool
// someone might be using; that's a different, much shakier idea (an AI
// reading page content isn't bound by instructions embedded in it, and
// planting them is a prompt-injection pattern this project deliberately
// avoids — see app/terms/page.js Section 10 for the real, legal version of
// this restriction instead).
export default function AntiCloneNotice() {
  useEffect(() => {
    // console.error specifically — next.config.mjs strips console.log (and
    // everything else) from production bundles but keeps console.error, so
    // this is the only console call guaranteed to still print after a
    // production build.
    console.error(
      "%cSTOP",
      "color:#ff4d4d;font-size:28px;font-weight:800;font-family:sans-serif;",
    );
    console.error(
      "%cThis site's design, layout, and source code belong to GameX Store and are protected under our Terms & Conditions (gamexstore.com/terms, Section 10). Copying or cloning it — including with AI code-generation tools — is prohibited. If you were sent here while trying to copy this site: please don't. If you have a real business proposal instead, contact us via the channels in the footer.",
      "color:#f1eefc;font-size:13px;font-family:sans-serif;line-height:1.5;",
    );
  }, []);

  return null;
}
