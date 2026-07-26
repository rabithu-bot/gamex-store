import ChatThread from "./ChatThread";

export default async function AdminChatPage({ params }) {
  const { orderId } = await params;

  return <ChatThread orderId={orderId} />;
}
