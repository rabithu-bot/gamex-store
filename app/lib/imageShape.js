// Reads just enough of a PNG/JPEG buffer to check it's actually an image and
// pull out its width/height — no full image-processing dependency needed
// for two integers. Anything we can't confidently parse (WEBP/GIF, or a
// malformed file) is left alone by callers rather than rejected, since a
// false rejection of a genuine screenshot is worse than letting an
// unrecognized-but-real one through — this is a cheap sanity filter for
// obviously-wrong uploads (camera photos, tiny icons), not real content
// verification.

export function isRecognizedImage(buffer) {
  if (buffer.length < 4) return false;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true; // PNG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // JPEG
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return true;
  if (buffer.toString("ascii", 0, 3) === "GIF") return true;
  return false;
}

export function getImageDimensions(buffer) {
  // PNG: fixed-position IHDR chunk — width/height are the first 8 bytes
  // after the 8-byte signature + 4-byte length + 4-byte "IHDR" tag.
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG: scan markers for the first Start-Of-Frame segment carrying
  // dimensions, skipping everything else (APPn/EXIF/COM/etc.) by its own
  // declared segment length.
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      const segmentLength = buffer.readUInt16BE(offset + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + segmentLength;
    }
  }

  return null;
}
