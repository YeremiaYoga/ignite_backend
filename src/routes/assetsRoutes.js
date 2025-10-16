import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

const ROOT = path.join(process.cwd(), "public/assets/foundry_vtt");
const BASE_URL = process.env.PUBLIC_API_URL || "http://localhost:5000";

router.get("/list", (req, res) => {
  const queryPath = req.query.path || "";
  const targetDir = path.join(ROOT, queryPath);

  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });

    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({
        name: e.name,
        path: path.join(queryPath, e.name).replace(/\\/g, "/"),
      }));

    const files = entries
      .filter((e) => e.isFile())
      .filter((e) => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(e.name))
      .map((e) => ({
        name: e.name,
        path: path.join(queryPath, e.name).replace(/\\/g, "/"),
        url: `${BASE_URL}/assets/foundry_vtt/${path
          .join(queryPath, e.name)
          .replace(/\\/g, "/")}`,
      }));

    // Breadcrumbs
    const parts = queryPath.split("/").filter(Boolean);
    const breadcrumbs = [{ name: "assets", path: "" }];
    parts.forEach((part, idx) => {
      breadcrumbs.push({
        name: part,
        path: parts.slice(0, idx + 1).join("/"),
      });
    });

    res.json({ path: queryPath, folders, files, breadcrumbs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
