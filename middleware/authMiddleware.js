// @ts-nocheck
import jwt from "jsonwebtoken";

const isAuthenticated = (req, res, next) => {
  try {
    // Accept token from Authorization header (Bearer) or from cookie (jwt-NAC-POLOSARA or token)
    const authHeader = req.headers?.authorization || "";
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const cookieToken = req.cookies?.['jwt-NAC-POLOSARA'] || req.cookies?.token || null;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated", success: false });
    }

    const secrets = [process.env.JWT_SECRET, process.env.SECRET_KEY, "secret-key"];
    let decoded = null;
    for (const s of secrets) {
      if (!s) continue;
      try {
        decoded = jwt.verify(token, s);
        break;
      } catch (err) {
        // try next secret
      }
    }

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token", success: false });
    }

    // attach full decoded payload for use by controllers
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

export default isAuthenticated;
