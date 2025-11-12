import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
import assetRoutes from "./routes/assetsRoutes.js";
import incumbencyRoutes from "./routes/incumbencyRoutes.js";
import raceRoutes from "./routes/raceRoutes.js";
import backgroundRoutes from "./routes/backgroundRoutes.js";
import subraceRoutes from "./routes/subraceRoutes.js";
import adminCharacterRoutes from "./routes/adminCharacterRoutes.js";
import kofiRoutes from "./routes/kofiRoutes.js";
import featRoutes from "./routes/featRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import backupRoutes from "./routes/backupRoutes.js";

import tierRoutes from "./routes/tierRoutes.js";

import adminSpeciesRoutes from "./routes/adminSpeciesRoutes.js";

import dndSourceRoutes from "./routes/dndSourceRoutes.js";
import speciesGroupTypeRoutes from "./routes/speciesGroupTypeRoutes.js";
import adminTraitRoutes from "./routes/adminTraitRoutes.js";

import traitModifierRoutes from "./routes/traitModifierRoutes.js";

import patreonRoutes from "./routes/patreonRoutes.js";

import announcementRoutes from "./routes/announcementRoutes.js";
import adminAnnouncementRoutes from "./routes/adminAnnouncementRoutes.js";
import adminThemeAndGenreCampaignRoutes from "./routes/adminThemeAndGenreCampaignRoutes.js";
import path from "path";
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: [
      process.env.NEXT_PUBLIC_APP_ORIGIN_1,
      process.env.NEXT_PUBLIC_APP_ORIGIN_2,
      process.env.NEXT_PUBLIC_APP_ORIGIN_3,
      process.env.NEXT_PUBLIC_APP_ORIGIN_4,
      process.env.ADMIN_PANEL_ORIGIN_1,
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

app.use("/users", userRoutes);
app.use("/characters", characterRoutes);
app.use("/assets", express.static(path.join(process.cwd(), "public/assets")));

app.use("/api/assets", assetRoutes);
app.use("/api/incumbency", incumbencyRoutes);
app.use("/api/races", raceRoutes);
app.use("/api/subraces", subraceRoutes);
app.use("/api/backgrounds", backgroundRoutes);
app.use("/admin/character", adminCharacterRoutes);
app.use("/api/feats", featRoutes);



app.get("/", (req, res) => {
  res.json({
    status: "✅ Ignite backend running",
    time: new Date().toISOString(),
    adminRoutes: "/admin/character",
  });
});

app.use("/kofi", kofiRoutes);
app.use("/admin", adminRoutes);
app.use("/backup", backupRoutes);
app.use("/tiers", tierRoutes);

app.use("/admin/species", adminSpeciesRoutes);
app.use("/admin/trait", adminTraitRoutes);
app.use("/admin/trait-modifier", traitModifierRoutes);

app.use("/dnd-source", dndSourceRoutes);
app.use("/species-group-type", speciesGroupTypeRoutes);


app.use("/patreon", patreonRoutes);

app.use("/announcements", announcementRoutes);

// admin
app.use("/admin/announcements", adminAnnouncementRoutes);

app.use("/admin/campaign-master", adminThemeAndGenreCampaignRoutes);
export default app;
