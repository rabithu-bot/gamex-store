import { QrCode } from "lucide-react";
import SettingsPanel from "@/app/mafia/SettingsPanel";

export default function AdminPaymentQrPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <QrCode size={18} />
        Payment QR Code
      </h2>
      <SettingsPanel />
    </div>
  );
}
