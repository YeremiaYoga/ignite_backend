import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
import assetRoutes from "./routes/assetsRoutes.js";
import incumbencyRoutes from "./routes/incumbencyRoutes.js";
import raceRoutes from "./routes/raceRoutes.js";
import backgroundRoutes from "./routes/backgroundRoutes.js";
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
app.use("/api/backgrounds", backgroundRoutes);

export default app;
