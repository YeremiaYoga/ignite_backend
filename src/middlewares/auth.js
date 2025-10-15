import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const userId = req.cookies.userId;
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (userId) {
      req.userId = userId;
      return next();
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (err) {
        return res.status(403).json({ error: "Invalid or expired JWT token" });
      }
    }

    return res.status(401).json({ error: "Unauthorized: no valid session" });
  } catch (err) {
    console.error("❌ requireAuth error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
