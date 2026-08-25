import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import AuroraBackground from "./components/AuroraBackground";
import SplashScreen from "./components/SplashScreen";
import MobileTabBar from "./components/MobileTabBar";
import InAppBrowserBanner from "./components/InAppBrowserBanner";
import RegisterServiceWorker from "./components/RegisterServiceWorker";
import DisableInspect from "./components/DisableInspect";
import { SITE_URL } from "./lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Bold, condensed display face for badges/tags and headings — gives
// category/tier pills a punchier "gamer" look without touching body text.
const rajdhani = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Title: 59 chars. Description: 137 chars — both measured, not guessed,
// to stay under Google's ~60/~155 practical snippet-truncation limits.
const SITE_TITLE = "Buy Free Fire ID Cheap - Verified FF Accounts | GameX Store";
const SITE_DESCRIPTION =
  "Buy verified Free Fire ID cheap — Max Level and Evo Gun accounts, instant delivery, secure UPI payment. India's most trusted FF ID store.";
// Real terms this store actually sells under (confirmed against live
// listing categories) — not a ranking factor (Google has publicly
// ignored the keywords meta tag since 2009), included only because it's
// harmless and a small number of other crawlers/tools still read it.
const SITE_KEYWORDS = [
  "free fire id",
  "buy free fire id",
  "free fire account for sale",
  "ff id buy sell",
  "max level free fire account",
  "free fire evo gun account",
  "free fire cobra gun id",
  "cheap free fire id india",
  "verified free fire account",
];

// Next.js App Router's idiomatic mechanism for the viewport meta tag —
// this renders <meta name="viewport" content="width=device-width,
// initial-scale=1, maximum-scale=1, user-scalable=no" /> in <head>.
// Deliberately used instead of a literal <meta> tag: Next already injects
// its own default viewport tag, and a hand-written one alongside it would
// just be a second, conflicting tag rather than replacing the default.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
    siteName: "GameX Store",
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "GameX Store - Buy Free Fire ID" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/icon.svg"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GameX Store",
  },
};

// Organization + WebSite JSON-LD — trains Google's Knowledge Graph on the
// exact brand name/alternateName so "GameX Store" / "GameXStore" searches
// resolve to this site correctly.
//
// Deliberately NOT included: a WebSite "SearchAction" (the thing that
// earns a sitelinks search box) and any Product "aggregateRating"/review
// markup. The first would point at a search feature this site doesn't
// actually have; the second would be star ratings google displays with
// no real reviews behind them, which is a documented structured-data
// spam violation Google issues manual actions for. Both are easy to add
// for real later — once there's an actual search page, and an actual
// review system — but not before.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GameX Store",
      alternateName: "GameXStore",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description: "Buy and sell verified Free Fire (FF) IDs — Max Level accounts, Evo and Cobra gun IDs, instant delivery.",
      slogan: "India's trusted marketplace to buy Free Fire ID.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "GameX Store",
      alternateName: "GameXStore",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <RegisterServiceWorker />
        <DisableInspect />
        <AuroraBackground />
        <SplashScreen />
        <InAppBrowserBanner />
        <ToastProvider>{children}</ToastProvider>
        <MobileTabBar />
      </body>
    </html>
  );
}
