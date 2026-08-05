import Link from "next/link";
import Logo from "./Logo";
import InstallAppButton from "./InstallAppButton";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Logo size={28} />
        Game<span className="brand-x">X</span> Store
      </Link>
      <nav className="site-header-nav-desktop">
        <Link href="/proofs">Proofs</Link>
        <Link href="/orders">My Orders</Link>
      </nav>
      <InstallAppButton />
    </header>
  );
}
