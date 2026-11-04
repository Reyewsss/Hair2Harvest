import express from 'express';
import sampleRoutes from './modules/sample/sampleRoutes.js';
import { connectToMongoDB } from './config/db.js';
import dotenv from 'dotenv';  
import rateLimiter from './middleware/rateLimiter.js';
import authRoutes from './modules/auth/authRoutes.js';

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5002;

// Connect to MongoDB
connectToMongoDB();

// Middleware to parse JSON requests
app.use(express.json());
app.use(rateLimiter)

// Auth routes
app.use('/api/auth', authRoutes);

// Sample route to test the server
app.use('/api/sample', sampleRoutes);
// -------------------------------

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});