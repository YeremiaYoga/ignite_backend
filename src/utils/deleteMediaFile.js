


export const deleteMediaFile = async (fileUrl, MEDIA_URL, token = null) => {
  try {
    if (!fileUrl) return;

    let filePath = fileUrl;

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      filePath = new URL(fileUrl).pathname; 
    }

    filePath = filePath.replace(/^\//, "");

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
