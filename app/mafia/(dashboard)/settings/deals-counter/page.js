import { Flame } from "lucide-react";
import DealsCounterSettings from "@/app/mafia/DealsCounterSettings";

export default function AdminDealsCounterPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <Flame size={18} />
        Lifetime Deals Counter
      </h2>
      <DealsCounterSettings />
    </div>
  );
}
