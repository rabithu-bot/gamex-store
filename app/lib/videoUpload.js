const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Videos upload straight from the browser to S3 (see app/lib/s3.js for why),
// so sending one is a two-step client-side dance: ask the server for a
// short-lived presigned PUT URL, then PUT the bytes directly to S3. The
// caller's own send-message request only ever carries the resulting URL.
export async function uploadVideoAttachment(getUrlApiPath, file) {
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Video must be under 50MB." };
  }

  const urlRes = await fetch(getUrlApiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  });
  if (!urlRes.ok) {
    const data = await urlRes.json().catch(() => ({}));
    return { ok: false, error: data.error || "Couldn't start the video upload." };
  }
  const { uploadUrl, publicUrl } = await urlRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    return { ok: false, error: "Video upload failed, please try again." };
  }

  return { ok: true, publicUrl };
}
