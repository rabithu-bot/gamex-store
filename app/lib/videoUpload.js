const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Videos upload straight from the browser to Cloudinary (see
// app/lib/cloudinary.js for why — Vercel's 4.5MB serverless body cap), so
// sending one is a two-step client-side dance: ask the server for a
// one-time signed params set, then POST the file + those params directly
// to Cloudinary. The caller's own send-message request only ever carries
// the resulting URL.
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
  const { uploadUrl, fields } = await urlRes.json();

  const form = new FormData();
  form.append("file", file);
  for (const [k, v] of Object.entries(fields || {})) form.append(k, v);

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    return { ok: false, error: data.error?.message || "Video upload failed, please try again." };
  }

  return { ok: true, publicUrl: data.secure_url };
}
