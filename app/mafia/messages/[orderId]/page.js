import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/session";
import ChatThread from "./ChatThread";

export default async function AdminChatPage({ params }) {
  if (!(await requireAdmin())) {
    redirect("/mafia/login");
  }

  const { orderId } = await params;

  return <ChatThread orderId={Number(orderId)} />;
}
