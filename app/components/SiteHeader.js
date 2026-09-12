import Link from "next/link";
import InstallAppButton from "./InstallAppButton";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="GameX Store" className="brand-logo" />
      </Link>
      <nav className="site-header-nav-desktop">
        <Link href="/proofs">Proofs</Link>
        <Link href="/orders">My Orders</Link>
      </nav>
      <InstallAppButton />
    </header>
  );
}
