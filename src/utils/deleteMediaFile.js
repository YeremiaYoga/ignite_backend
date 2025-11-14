

/**
 * Delete media file on MEDIA server
 * Accepts either:
 *  - fullUrl → "http://localhost:5100/characters/.../file.png"
 *  - urlPath → "/characters/.../file.png"
 *  - raw path → "characters/.../file.png"
 */
export const deleteMediaFile = async (fileUrl, MEDIA_URL, token = null) => {
  try {
    if (!fileUrl) return;

    // 1️⃣ Normalize → extract relative path
    let filePath = fileUrl;

    // If full URL → extract pathname
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      filePath = new URL(fileUrl).pathname; // "/characters/x/y.png"
    }

    // Remove leading "/"
    filePath = filePath.replace(/^\//, "");

    // 2️⃣ Call media delete API
    const resp = await fetch(`${MEDIA_URL}/upload/file`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ file_path: filePath }),
    });

    if (!resp.ok) {
      const msg = await resp.text();
      console.warn(`⚠️ Failed to delete media file:`, fileUrl, msg);
      return false;
    }

    console.log(`🗑️ Deleted media file:`, filePath);
    return true;
  } catch (err) {
    console.error("💥 deleteMediaFile error:", err);
    return false;
  }
};
