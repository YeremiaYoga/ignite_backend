export const requireAuth = (req, res, next) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  req.userId = userId;
  next();
};
