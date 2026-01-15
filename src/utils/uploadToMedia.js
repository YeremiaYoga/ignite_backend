

/**
 * 🔄 Upload file ke Ignite-Media
 * @param {Object} params
 * @param {Object} params.file 
 * @param {string} params.path 
 * @param {string} params.folderName -
 * @param {string} [params.token] 
 * @param {string} [params.mediaUrl] 
 * @returns {Promise<string|null>} 
 */
export async function uploadToMedia({
  file,
  path,
  folderName,
  token = null,
  mediaUrl = process.env.PUBLIC_MEDIA_URL,
}) {
  if (!file || !file.buffer) {
    console.log(`⚠️ Skip upload: no file provided for path=${path}`);
    return null;
  }

  try {
    const blob = new Blob([file.buffer], { type: file.mimetype });
    const formData = new FormData();
    formData.append("path", path);
    formData.append("folder_name", folderName);
    formData.append("file", blob, file.originalname);

    const response = await fetch(`${mediaUrl}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const msg = await response.text();
      console.error(`❌ Upload failed [${path}/${folderName}]:`, msg);
      return null;
    }

    const result = await response.json();
    const fileUrl =
      result.fullUrl ||
      result.data?.fullUrl ||
      result.url ||
      result.data?.url ||
      null;

    console.log(`✅ Uploaded [${path}/${folderName}] →`, fileUrl);
    return fileUrl;
  } catch (err) {
    console.error(`💥 uploadToMedia error (${path}/${folderName}):`, err);
    return null;
  }
}
