import { ShieldCheck } from "lucide-react";
import ProofsSettings from "@/app/mafia/ProofsSettings";

export default function AdminProofsSettingsPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <ShieldCheck size={18} />
        Proofs
      </h2>
      <ProofsSettings />
    </div>
  );
}
