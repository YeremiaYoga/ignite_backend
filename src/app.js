import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
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

export default app;
