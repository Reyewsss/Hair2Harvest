import jwt from "jsonwebtoken";
import { User } from "../authModel.js";
import { COOKIE_NAME } from "../utils/generateTokenAndSetCookie.js";

// Reads the session cookie and loads the user fresh from the database, so a role change,
// deactivation or password reset takes effect on the very next request.
export const verifyToken = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "session") return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(payload.id);
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please sign in again." });
  }
};