import { ShoppingBag } from "lucide-react";
import OrdersPanel from "@/app/mafia/OrdersPanel";

export default function AdminOrdersPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <ShoppingBag size={18} />
        Orders
      </h2>
      <OrdersPanel />
    </div>
  );
}
