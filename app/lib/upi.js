// The generic, NPCI-documented UPI deep link — the only mechanism every UPI
// app on Android is guaranteed to register a handler for. Individual apps'
// own custom schemes (gpay://, phonepe://, paytmmp://) aren't publicly
// documented for third-party payment initiation and can silently fail, so
// every "pay via X" button below builds this exact same link and lets
// Android's own chooser (or the single installed app) take it from there.
export function buildUpiIntentUrl({ upiId, payeeName, amount, orderId }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `Order_${orderId}`,
  });
  return `upi://pay?${params.toString()}`;
}
