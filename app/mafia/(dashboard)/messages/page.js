import { MessagesSquare } from "lucide-react";
import MessagesPanel from "@/app/mafia/MessagesPanel";

export default function AdminMessagesPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <MessagesSquare size={18} />
        Messages
      </h2>
      <MessagesPanel />
    </div>
  );
}
