import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const token =
      req.cookies.access_token || // <== ambil dari cookie login JWT
      req.cookies.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: no token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.userId = decoded.id; // tambahkan supaya sama dengan sistem lama
      return next();
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired JWT token" });
    }
  } catch (err) {
    console.error("❌ requireAuth error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
