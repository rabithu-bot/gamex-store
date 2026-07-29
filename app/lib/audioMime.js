// Candidates in preference order — Chrome/Firefox/Android default to
// webm/opus, Safari (desktop + iOS 14.1+) only supports MediaRecorder with
// mp4. Picking the first the current browser can actually record avoids
// MediaRecorder throwing on construction with no format at all.
const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export function pickSupportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

const EXTENSION_BY_MIME = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

// mimeType strings can carry a codecs= suffix (e.g. "audio/webm;codecs=opus")
// — only the part before ";" maps to a file extension.
export function extensionForMime(mimeType) {
  const base = (mimeType || "").split(";")[0].trim();
  return EXTENSION_BY_MIME[base] || "webm";
}
