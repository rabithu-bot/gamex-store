"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldCheck, Package } from "lucide-react";

export default function MobileTabBar() {
  const pathname = usePathname();

  if (pathname?.startsWith("/mafia")) return null;

  const isHome = pathname === "/";
  const isProofs = pathname?.startsWith("/proofs");
  const isOrders = pathname?.startsWith("/orders") || pathname?.startsWith("/order/");

  return (
    <nav className="mobile-tab-bar" aria-label="Primary">
      <Link href="/" className={`mobile-tab ${isHome ? "active" : ""}`}>
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link href="/proofs" className={`mobile-tab ${isProofs ? "active" : ""}`}>
        <ShieldCheck size={20} />
        <span>Proofs</span>
      </Link>
      <Link href="/orders" className={`mobile-tab ${isOrders ? "active" : ""}`}>
        <Package size={20} />
        <span>My Orders</span>
      </Link>
    </nav>
  );
}
