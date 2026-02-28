import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const requireAuth = async (req, res, next) => {
    try {
        // 1. Check for token in cookies (Primary secure method)
        // 2. Fallback to Authorization header (for mobile apps/Postman testing)
        const token =
            req.cookies?.token ||
            (req.headers.authorization?.startsWith("Bearer ")
                ? req.headers.authorization.split(" ")[1]
                : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if user still exists in DB
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User associated with this token no longer exists",
            });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired",
            });
        }
        return res.status(403).json({
            success: false,
            message: "Invalid token",
        });
    }
};

export const requireTeacher = (req, res, next) => {
    if (!req.user || req.user.userType !== "instructor") {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Instructors only",
        });
    }
    next();
};
