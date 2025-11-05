

/**
 * 🔄 Upload file ke Ignite-Media
 * @param {Object} params
 * @param {Object} params.file - File dari multer (req.files["img"][0])
 * @param {string} params.path - Path utama (misal: "species" / "characters")
 * @param {string} params.folderName - Nama folder (misal: nama species / publicId)
 * @param {string} [params.token] - Bearer token optional
 * @param {string} [params.mediaUrl] - Override PUBLIC_MEDIA_URL env
 * @returns {Promise<string|null>} URL file yang diupload atau null jika gagal
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
