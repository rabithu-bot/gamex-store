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

const SITE_TITLE = "GameX Store - Official Gaming Accounts Marketplace | Buy & Sell";
const SITE_DESCRIPTION =
  "Buy verified Free Fire, PUBG, and mobile gaming accounts safely on GameX Store. 100% secure transactions directly with verified owners.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
    siteName: "GameX Store",
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "GameX Store" }],
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
// resolve to this site with a proper sitelinks search box entry.
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
