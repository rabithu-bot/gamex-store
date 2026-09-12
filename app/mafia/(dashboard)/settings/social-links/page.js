import { Share2 } from "lucide-react";
import SocialLinksSettings from "@/app/mafia/SocialLinksSettings";

export default function AdminSocialLinksPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <Share2 size={18} />
        Social Links
      </h2>
      <SocialLinksSettings />
    </div>
  );
}
