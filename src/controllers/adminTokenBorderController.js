// controllers/adminTokenBordersController.js
import {
  getTokenBorders,
  getTokenBorderById,
  createTokenBorder,
  updateTokenBorder,
  deleteTokenBorder,
} from "../models/tokenBorderModel.js";
import { uploadToMedia } from "../utils/uploadToMedia.js";
import { deleteMediaFile } from "../utils/deleteMediaFile.js";

function slugifyName(name = "") {
  return (
    name
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "token-border"
  );
}

function parseIsPaid(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
}

// ================== LIST ==================
export const listTokenBordersAdmin = async (req, res) => {
  try {
    const borders = await getTokenBorders();
    res.json({ success: true, data: borders });
  } catch (err) {
    console.error("💥 listTokenBordersAdmin error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch token borders" });
  }
};

// ================== DETAIL ==================
export const getTokenBorderAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const border = await getTokenBorderById(id);

    if (!border) {
      return res
        .status(404)
        .json({ success: false, error: "Token border not found" });
    }

    res.json({ success: true, data: border });
  } catch (err) {
    if (err.code === "PGRST116") {
      return res
        .status(404)
        .json({ success: false, error: "Token border not found" });
    }
    console.error("💥 getTokenBorderAdmin error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch token border" });
  }
};

// ================== CREATE ==================
export const addTokenBorderAdmin = async (req, res) => {
  try {
    console.log("🧩 [addTokenBorderAdmin] raw body:", req.body);
    console.log("🧩 [addTokenBorderAdmin] raw files:", req.files);

    const rawBody = req.body || {};
    const parsed =
      typeof rawBody.data === "string" ? JSON.parse(rawBody.data) : rawBody;

    if (!parsed.name) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required field: name" });
    }

    const folderName = slugifyName(parsed.name);

    const token =
      req.cookies?.ignite_access_token ||
      req.user?.jwt?.token ||
      req.headers.authorization?.split(" ")[1] ||
      null;

    // 1 file gambar: "image"
    const imageUrl = await uploadToMedia({
      file: req.files?.["image"]?.[0],
      path: "token-borders",
      folderName,
      token,
    });

    const isPaid = parseIsPaid(parsed.is_paid, false);

    const allowedFields = ["name", "description", "image_url", "is_paid"];

    const baseData = {
      ...parsed,
      image_url: imageUrl || parsed.image_url || null,
      is_paid: isPaid,
    };

    const cleanData = Object.fromEntries(
      Object.entries(baseData).filter(([k]) => allowedFields.includes(k))
    );

    const border = await createTokenBorder(cleanData);

    res.status(201).json({
      success: true,
      message: "✅ Token border created successfully",
      data: border,
    });
  } catch (err) {
    console.error("💥 addTokenBorderAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================== UPDATE ==================
export const editTokenBorderAdmin = async (req, res) => {
  try {
    console.log("🛠 [ADMIN] editTokenBorderAdmin invoked");
    const { id } = req.params;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    let existing;
    try {
      existing = await getTokenBorderById(id);
    } catch (err) {
      if (err.code === "PGRST116") {
        console.warn("⚠️ Token border not found for update:", id);
        return res
          .status(404)
          .json({ success: false, error: "Token border not found" });
      }
      throw err;
    }

    if (!existing) {
      console.warn("⚠️ Token border not found for update:", id);
      return res
        .status(404)
        .json({ success: false, error: "Token border not found" });
    }

    const parsed =
      typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

    const folderName = slugifyName(parsed.name || existing.name);

    const token =
      req.cookies?.ignite_access_token ||
      req.user?.jwt?.token ||
      req.headers.authorization?.split(" ")[1] ||
      null;

    const files = req.files || {};

    // handle image update
    let imagePath = existing.image_url || null;

    if (files["image"] && files["image"][0]) {
      const newUrl = await uploadToMedia({
        file: files["image"][0],
        path: "token-borders",
        folderName,
        token,
        mediaUrl: MEDIA_URL,
      });

      if (newUrl) {
        if (existing.image_url && existing.image_url !== newUrl) {
          await deleteMediaFile(existing.image_url, MEDIA_URL, token).catch(
            (err) => {
              console.warn(
                "⚠️ Failed to delete old token border image:",
                err?.message || err
              );
            }
          );
        }
        imagePath = newUrl;
      }
    }

    const isPaid = parseIsPaid(parsed.is_paid, existing.is_paid);

    // jangan izinkan override field sensitif
    const forbiddenFields = ["id", "created_at", "updated_at"];
    forbiddenFields.forEach((f) => delete parsed[f]);

    const updatedPayload = {
      name: parsed.name ?? existing.name,
      description: parsed.description ?? existing.description,
      image_url: imagePath ?? parsed.image_url ?? existing.image_url ?? null,
      is_paid: isPaid,
    };

    const result = await updateTokenBorder(id, updatedPayload);

    console.log("✅ Token border updated:", result?.id, result?.name);
    res.json({
      success: true,
      message: "✅ Token border updated successfully",
      data: result,
    });
  } catch (err) {
    console.error("💥 editTokenBorderAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================== DELETE ==================
export const deleteTokenBorderAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;

    let existing;
    try {
      existing = await getTokenBorderById(id);
    } catch (err) {
      if (err.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Token border not found" });
      }
      throw err;
    }

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Token border not found" });
    }

    const token =
      req.cookies?.ignite_access_token ||
      req.user?.jwt?.token ||
      req.headers.authorization?.split(" ")[1] ||
      null;

    const tasks = [];

    if (existing.image_url) {
      tasks.push(
        deleteMediaFile(existing.image_url, MEDIA_URL, token).catch((err) => {
          console.warn(
            "⚠️ Failed to delete token border image:",
            err?.message || err
          );
        })
      );
    }

    await Promise.all(tasks);

    await deleteTokenBorder(id);

    res.json({
      success: true,
      message: "✅ Token border & media deleted successfully",
    });
  } catch (err) {
    console.error("💥 deleteTokenBorderAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
