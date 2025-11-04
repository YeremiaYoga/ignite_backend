
export const verifyAdminRole = (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied: admin only" });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: "Role verification failed" });
  }
};
