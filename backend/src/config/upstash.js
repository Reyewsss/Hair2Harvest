import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis'

import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '20 s'), // 5 requests per 20 seconds
});

export default ratelimit;