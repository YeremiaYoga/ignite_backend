import {
  listThemes, createTheme, updateTheme, deleteTheme,
  listGenres, createGenre, updateGenre, deleteGenre,
} from "../models/themeAndGenreCampaignModel.js";

function normalize(body) {
  return {
    name: body.name?.trim(),
    description: body.description ?? null,
    public_creation:
      typeof body.public_creation === "boolean"
        ? body.public_creation
        : body.public_creation === "true",
  };
}

/* THEME CONTROLLERS */
export const adminListThemes = async (req, res) => {
  try {
    const data = await listThemes();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const adminCreateTheme = async (req, res) => {
  try {
    const payload = normalize(req.body);

    if (!payload.name)
      return res.status(400).json({ error: "Name is required" });

    const user_id = req.user?.id || null;
    const creator_name =
      req.user?.username || req.user?.email || "admin@ignite";

    const data = await createTheme({
      ...payload,
      user_id,
      creator_name,
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    console.error("adminCreateTheme error:", e.message);
    res.status(400).json({ error: e.message });
  }
};

export const adminUpdateTheme = async (req, res) => {
  try {
    const payload = normalize(req.body);
    const data = await updateTheme(req.params.id, payload);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const adminDeleteTheme = async (req, res) => {
  try {
    await deleteTheme(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

/* GENRE CONTROLLERS */
export const adminListGenres = async (req, res) => {
  try {
    const data = await listGenres();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const adminCreateGenre = async (req, res) => {
  try {
    const payload = normalize(req.body);

    if (!payload.name)
      return res.status(400).json({ error: "Name is required" });

    // ambil data user dari middleware auth
    const user_id = req.user?.id || null;
    const creator_name =
      req.user?.username || req.user?.email || "admin@ignite";

    const data = await createGenre({
      ...payload,
      user_id,
      creator_name,
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    console.error("adminCreateGenre error:", e.message);
    res.status(400).json({ error: e.message });
  }
};

export const adminUpdateGenre = async (req, res) => {
  try {
    const payload = normalize(req.body);
    const data = await updateGenre(req.params.id, payload);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const adminDeleteGenre = async (req, res) => {
  try {
    await deleteGenre(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
