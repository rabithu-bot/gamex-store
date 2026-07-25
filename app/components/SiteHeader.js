import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        GAMEX STORE
      </Link>
      <nav>
        <Link href="/orders">My Orders</Link>
      </nav>
    </header>
  );
}
