const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// Mirrors uploadVideoAttachment (app/lib/videoUpload.js): ask the server
// for a one-time signed params set, then POST the file + those params
// straight to Cloudinary from the browser. Listing photos go through this
// too (not just videos) because a real batch of many full-resolution
// screenshots hits the exact same Vercel serverless request-body cap
// (4.5MB) a single video does — proxying them through a Next.js route at
// all was the bug.
export async function uploadListingImage(file) {
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `${file.name} is over 20MB.` };
  }

  const urlRes = await fetch("/api/admin/listings/image-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  });
  if (!urlRes.ok) {
    const data = await urlRes.json().catch(() => ({}));
    return { ok: false, error: data.error || `Couldn't start the upload for ${file.name}.` };
  }
  const { uploadUrl, fields } = await urlRes.json();

  const form = new FormData();
  form.append("file", file);
  for (const [k, v] of Object.entries(fields || {})) form.append(k, v);

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    return { ok: false, error: data.error?.message || `Upload failed for ${file.name}, please try again.` };
  }

  return { ok: true, publicUrl: data.secure_url };
}

// Uploads every file, stopping at the first failure (rather than a
// partial silent success) so the caller always knows exactly which state
// its listing is actually in before deciding whether to submit the form.
export async function uploadListingImages(files) {
  const publicUrls = [];
  for (const file of files) {
    const result = await uploadListingImage(file);
    if (!result.ok) return { ok: false, error: result.error, uploadedSoFar: publicUrls };
    publicUrls.push(result.publicUrl);
  }
  return { ok: true, publicUrls };
}
