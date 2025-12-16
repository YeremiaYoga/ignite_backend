// src/controllers/gdocsController.js

import {
  driveExportHtml,
  driveGetMeta,
  publicExportHtml,
  extractGdocFileId,
  normalizeGdocHtml,
  sanitizeGdocHtml,
  stripHtmlBody,
} from "../utils/gdocsProvider.js";

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export const exportGdocHtmlHandler = async (req, res) => {
  try {
    const fileId = req.query.fileId;
    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const html = await driveExportHtml({
      fileId,
      accessToken: token,
    });

    let title = "";
    try {
      const meta = await driveGetMeta({
        fileId,
        accessToken: token,
      });
      title = meta?.name || "";
    } catch (_) {}

    return res.json({
      ok: true,
      mode: "oauth",
      fileId,
      title,
      html,
    });
  } catch (err) {
    console.error("❌ exportGdocHtmlHandler:", err?.message || err);
    return res.status(500).json({
      error: "Failed export gdoc html (oauth)",
      details: err?.message,
    });
  }
};

/**
 * =========================================================
 * META (OAUTH)
 * =========================================================
 * GET /api/gdocs/meta?fileId=...
 * Header: Authorization: Bearer <google_access_token>
 */
export const gdocMetaHandler = async (req, res) => {
  try {
    const fileId = req.query.fileId;
    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const meta = await driveGetMeta({
      fileId,
      accessToken: token,
    });

    return res.json({
      ok: true,
      mode: "oauth",
      fileId,
      meta,
    });
  } catch (err) {
    console.error("❌ gdocMetaHandler:", err?.message || err);
    return res.status(500).json({
      error: "Failed get gdoc meta",
      details: err?.message,
    });
  }
};

export const importGdocHandler = async (req, res) => {
  try {
    const rawInput = req.body?.url || req.body?.fileId;
    if (!rawInput) {
      return res.status(400).json({ error: "Missing url or fileId" });
    }

    const fileId = extractGdocFileId(rawInput);
    if (!fileId) {
      return res
        .status(400)
        .json({ error: "Invalid Google Doc link or fileId" });
    }

    const token = getBearerToken(req);

    let html = "";
    let title = "";
    let mode = "public";

    if (token) {
      // 🔐 OAUTH MODE
      const rawHtml = await driveExportHtml({
        fileId,
        accessToken: token,
      });
      html = normalizeGdocHtml(rawHtml);
      //   const rawHtml = await driveExportHtml({
      //     fileId,
      //     accessToken: token,
      //   });

      //   html = sanitizeGdocHtml(normalizeGdocHtml(rawHtml));
      mode = "oauth";

      try {
        const meta = await driveGetMeta({
          fileId,
          accessToken: token,
        });
        title = meta?.name || "";
      } catch (_) {}
    } else {
      // 🌍 PUBLIC MODE
      const rawHtml = await publicExportHtml({ fileId });
      html = normalizeGdocHtml(rawHtml);

      //       const rawHtml = await publicExportHtml({ fileId });
      // html = sanitizeGdocHtml(normalizeGdocHtml(rawHtml));
      // html = sanitizeGdocHtml(
      //   normalizeGdocHtml(stripHtmlBody(rawHtml))
      // );

      mode = "public";
    }

    return res.json({
      ok: true,
      mode,
      fileId,
      title,
      html,
    });
  } catch (err) {
    console.error("❌ importGdocHandler:", err?.message || err);
    return res.status(500).json({
      error: "Failed to import Google Doc",
      hint: "If not using Google login, make sure the document is public or published to the web",
      details: err?.message,
    });
  }
};
