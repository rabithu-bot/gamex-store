import Link from "next/link";
import { ShoppingBag, Package, MessagesSquare, ShieldCheck } from "lucide-react";
import StatsBar from "./StatsBar";

const SECTIONS = [
  {
    href: "/mafia/orders",
    label: "Orders",
    icon: ShoppingBag,
    description: "Review payment proof and manage buyer orders.",
  },
  {
    href: "/mafia/listings",
    label: "Listings",
    icon: Package,
    description: "Add, edit, and manage gaming accounts for sale.",
  },
  {
    href: "/mafia/messages",
    label: "Messages",
    icon: MessagesSquare,
    description: "Reply to buyers in the support inbox.",
  },
];

export default function Dashboard() {
  return (
    <div>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <span className="dashboard-badge">
            <ShieldCheck size={14} />
            Vault Control
          </span>
          <h1>Admin Dashboard</h1>
        </div>
      </div>

      <StatsBar />

      <div className="dashboard-nav-grid">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="dashboard-nav-card">
            <span className="dashboard-nav-icon">
              <section.icon size={20} />
            </span>
            <strong>{section.label}</strong>
            <span className="muted">{section.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
