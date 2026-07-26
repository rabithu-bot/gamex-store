import { Package } from "lucide-react";
import ListingsPanel from "@/app/mafia/ListingsPanel";

export default function AdminListingsPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <Package size={18} />
        Listings
      </h2>
      <ListingsPanel />
    </div>
  );
}
