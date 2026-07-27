// The generic, NPCI-documented UPI deep link — the only mechanism every UPI
// app on Android is guaranteed to register a handler for. Individual apps'
// own custom schemes (gpay://, phonepe://, paytmmp://) aren't publicly
// documented for third-party payment initiation and can silently fail, so
// every "pay via X" button below builds this exact same link and lets
// Android's own chooser (or the single installed app) take it from there.
//
// Deliberately no `tn` (transaction note) — some receiving banks apply
// fraud/spam heuristics to auto-generated note text on inbound UPI
// collect-style intents, and `tn` is optional per the NPCI spec.
export function buildUpiIntentUrl({ upiId, payeeName, amount }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}
