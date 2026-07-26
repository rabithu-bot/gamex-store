import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import AuroraBackground from "./components/AuroraBackground";
import SplashScreen from "./components/SplashScreen";
import MobileTabBar from "./components/MobileTabBar";

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

export const metadata = {
  title: "GAMEX STORE",
  description: "Buy verified gaming accounts directly from the owner, pay securely on-site.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable}`}>
      <body>
        <AuroraBackground />
        <SplashScreen />
        <ToastProvider>{children}</ToastProvider>
        <MobileTabBar />
      </body>
    </html>
  );
}
