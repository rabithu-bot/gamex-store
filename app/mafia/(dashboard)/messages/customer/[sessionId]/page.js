import CustomerChatThread from "./CustomerChatThread";

export default async function AdminCustomerChatPage({ params }) {
  const { sessionId } = await params;

  // key={sessionId} for the same reason the single-order thread is keyed by
  // orderId — force a full remount when navigating between two customers so
  // no state or in-flight action from the previous conversation can bleed
  // into whichever one is "current" by the time it resolves.
  return <CustomerChatThread key={sessionId} sessionId={sessionId} />;
}
