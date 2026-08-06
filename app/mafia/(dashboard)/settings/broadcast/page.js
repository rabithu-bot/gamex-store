import { Megaphone } from "lucide-react";
import BroadcastSettings from "@/app/mafia/BroadcastSettings";

export default function AdminBroadcastSettingsPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <Megaphone size={18} />
        Broadcast Push
      </h2>
      <BroadcastSettings />
    </div>
  );
}
