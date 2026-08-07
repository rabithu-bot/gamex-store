import ChatThread from "./ChatThread";

export default async function AdminChatPage({ params }) {
  const { orderId } = await params;

  // key={orderId} forces a full remount when navigating between two chats.
  // Without it, React reuses the same ChatThread instance across different
  // orders (same component, same position in the tree) — any state or
  // in-flight action still tied to the previous order (a message send, a
  // voice note mid-recording) can then land against whichever order is
  // "current" by the time it resolves, instead of the one it was actually
  // started in. Keying by orderId makes every contact its own component
  // instance with its own clean state, closing that mismatch at the root.
  return <ChatThread key={orderId} orderId={orderId} />;
}
