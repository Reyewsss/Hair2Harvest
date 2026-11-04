import rateLimit from "../config/upstash.js";

const rateLimiter = async (req, res, next) => {
    try {
        const { success } = await rateLimit.limit(req.ip);
        if (!success) {
            return res.status(429).json({ message: "Too many requests. Please try again later." });
        }
        next();
    } catch (error) {
        console.error("Error in rate limiter middleware:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }   
};

export default rateLimiter;