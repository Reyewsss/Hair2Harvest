import rateLimit from "../config/upstash.js";

const rateLimiter = async (req, res, next) => {
    // The limiter depends on Upstash Redis. Skip it in development and whenever
    // it is not configured, so a missing cache cannot take the API down.
    if (process.env.NODE_ENV !== "production" || !process.env.UPSTASH_REDIS_REST_URL) {
        return next();
    }

    try {
        const { success } = await rateLimit.limit(req.ip);
        if (!success) {
            return res.status(429).json({ message: "Too many requests. Please try again later." });
        }
        next();
    } catch (error) {
        // Fail open: an unavailable limiter must not block legitimate traffic.
        console.error("Rate limiter unavailable, allowing request:", error.message);
        next();
    }
};

export default rateLimiter;
