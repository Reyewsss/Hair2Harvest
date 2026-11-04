import express from 'express';
import sampleRoutes from './modules/sample/sampleRoutes.js';
import { connectToMongoDB } from './config/db.js';
import dotenv from 'dotenv';  
import rateLimiter from './middleware/rateLimiter.js';
import authRoutes from './modules/auth/authRoutes.js';
import supplierRoutes from './modules/suppliers/supplierRoutes.js';
import collectionRoutes from './modules/collections/collectionRoutes.js';
import labResultRoutes from './modules/lab-results/labResultRoutes.js';
import qualityRoutes from './modules/quality/qualityRoutes.js';
import experimentRoutes from './modules/experiments/experimentRoutes.js';

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

// Supplier registration and verification
app.use('/api/suppliers', supplierRoutes);

// Pickups, weight logs and raw-hair inventory
app.use('/api/collections', collectionRoutes);

// Batch-linked laboratory results
app.use('/api/lab-results', labResultRoutes);

// Quality thresholds, evaluation and admin-authorised status changes
app.use('/api/quality', qualityRoutes);

// Planting experiments, growth logs and traceability
app.use('/api/experiments', experimentRoutes);

// Sample route to test the server
app.use('/api/sample', sampleRoutes);
// -------------------------------

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});