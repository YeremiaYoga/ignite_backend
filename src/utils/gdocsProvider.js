
export function normalizeGdocHtml(html = "") {
  if (!html) return html;

  return html
    // hapus semua inline color & background
    .replace(/color\s*:\s*#[0-9a-fA-F]{3,6}\s*;?/gi, "")
    .replace(/background-color\s*:\s*#[0-9a-fA-F]{3,6}\s*;?/gi, "")
    .replace(/background\s*:\s*#[0-9a-fA-F]{3,6}\s*;?/gi, "")
    .replace(/background\s*:\s*rgb\([^)]+\)\s*;?/gi, "")
    .replace(/color\s*:\s*rgb\([^)]+\)\s*;?/gi, "")

    // hapus font google docs
    .replace(/font-family\s*:[^;]+;?/gi, "")

    // rapihin style kosong
    .replace(/style="\s*"/gi, "")
    .replace(/style="\s*;?\s*"/gi, "");
}

export async function driveExportHtml({ fileId, accessToken }) {
  if (!fileId) throw new Error("Missing fileId");
  if (!accessToken) throw new Error("Missing accessToken");

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}/export?mimeType=${encodeURIComponent("text/html")}`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Drive export failed (${r.status}): ${t.slice(0, 400)}`);
  }

  const html = await r.text();
  return html;
}

export async function driveGetMeta({ fileId, accessToken }) {
  if (!fileId) throw new Error("Missing fileId");
  if (!accessToken) throw new Error("Missing accessToken");

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?fields=name,mimeType,modifiedTime,webViewLink`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Drive meta failed (${r.status}): ${t.slice(0, 400)}`);
  }

  return r.json();
}


export function extractGdocFileId(input = "") {
  const s = String(input).trim();

  // full URL
  const m = s.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m?.[1]) return m[1];

  // direct fileId
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;

  return "";
}

export async function publicExportHtml({ fileId }) {
  if (!fileId) throw new Error("Missing fileId");

  // WORKS ONLY IF DOC IS PUBLIC / PUBLISHED
  const url = `https://docs.google.com/document/d/${encodeURIComponent(
    fileId
  )}/export?format=html`;

  const r = await fetch(url);

  if (!r.ok) {
    const t = await r.text();
    throw new Error(
      `Public export failed (${r.status}): ${t.slice(0, 400)}`
    );
  }

  return r.text();
}
