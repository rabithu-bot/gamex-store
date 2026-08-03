import { PackagePlus } from "lucide-react";
import AddListingPanel from "@/app/mafia/AddListingPanel";

export default function AdminAddListingPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <PackagePlus size={18} />
        Add New Listing
      </h2>
      <AddListingPanel />
    </div>
  );
}
