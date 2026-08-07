import { Bot } from "lucide-react";
import AiLearningSettings from "@/app/mafia/AiLearningSettings";

export default function AdminAiLearningPage() {
  return (
    <div>
      <h2 className="dashboard-focus-title">
        <Bot size={18} />
        AI Learning
      </h2>
      <AiLearningSettings />
    </div>
  );
}
