import { MessageSquareText } from "lucide-react";
import QuickRepliesSettings from "@/app/mafia/QuickRepliesSettings";

export default function AdminQuickRepliesPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <MessageSquareText size={18} />
        Saved Replies
      </h2>
      <QuickRepliesSettings />
    </div>
  );
}
