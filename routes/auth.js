const express = require("express");
const router = express.Router();

/**
 * POST /api/auth/google
 * Called after successful Firebase Google login (frontend)
 */
router.post("/google", async (req, res) => {
  try {
    const { uid, name, email, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        message: "Invalid user payload",
      });
    }

    /**
     * TODO (later):
     * - Save user to DB (Mongo/Postgres)
     * - Check if user exists → update / insert
     */

    console.log("✅ Authenticated user:", {
      uid,
      name,
      email,
      photoURL,
    });

    // IMPORTANT: Explicit success response
    return res.status(200).json({
      success: true,
      user: {
        uid,
        name,
        email,
        photoURL,
      },
    });
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
