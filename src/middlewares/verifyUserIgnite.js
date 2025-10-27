import jwt from "jsonwebtoken";
import supabase from "../utils/db.js";

/**
 * ✅ Full authentication middleware
 * - Validates access token (from cookie or header)
 * - Auto-refreshes using refresh token if access token expired
 * - Verifies user exists in Supabase
 */
export const verifyUserFullAuth = async (req, res, next) => {
  try {
    console.log("🧩 [Auth] Starting verifyUserFullAuth...");

    // === GET TOKEN ===
    const accessToken =
      req.cookies?.ignite_access_token ||
      req.headers.authorization?.split(" ")[1];
    const refreshToken = req.cookies?.ignite_refresh_token;

    if (!accessToken && !refreshToken) {
      console.warn("⚠️ [Auth] No tokens found.");
      return res.status(401).json({ error: "Missing authentication tokens" });
    }

    let decoded;

    // === TRY VERIFY ACCESS TOKEN ===
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      console.log("✅ [Auth] Access token verified:", decoded.email);
    } catch (err) {
      if (err.name === "TokenExpiredError" && refreshToken) {
        console.log("🔄 [Auth] Access token expired, trying refresh...");

        // === VERIFY REFRESH TOKEN ===
        try {
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
          );

          console.log(
            "✅ [Auth] Refresh token verified:",
            refreshDecoded.email
          );

          // === ISSUE NEW ACCESS TOKEN ===
          const newAccessToken = jwt.sign(
            {
              email: refreshDecoded.email,
              id: refreshDecoded.id,
            },
            process.env.JWT_SECRET,
            { expiresIn: "9h" }
          );

          // === SET NEW COOKIE ===
          res.cookie("ignite_access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 9 * 60 * 60 * 1000, // 9 jam
          });

          decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET);
          console.log("♻️ [Auth] Access token refreshed for:", decoded.email);
        } catch (refreshErr) {
          console.warn("❌ [Auth] Invalid refresh token:", refreshErr.message);
          return res
            .status(401)
            .json({ error: "Invalid or expired refresh token" });
        }
      } else {
        console.warn("❌ [Auth] Invalid JWT:", err.message);
        return res
          .status(401)
          .json({ error: "Invalid or expired access token" });
      }
    }

    // === CHECK USER IN SUPABASE ===
    console.log("🔍 [Auth] Checking Supabase for user:", decoded.email);

    const { data, error } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", decoded.email)
      .single();

    if (error || !data) {
      console.warn("❌ [Auth] User not found in Supabase:", error?.message);
      return res.status(401).json({ error: "User not found in Supabase" });
    }

    console.log("✅ [Auth] User verified in Supabase:", data.email);

    // === ATTACH TO REQUEST ===
    req.user = {
      id: data.id,
      email: data.email,
      username: data.username || "Unknown User",
      jwt: decoded,
    };
    req.userId = data.id;

    console.log("🚀 [Auth] Verification passed. Proceeding...");
    next();
  } catch (err) {
    console.error("🔥 [Auth] verifyUserFullAuth error:", err);
    res.status(500).json({ error: "Server error verifying user" });
  }
};
