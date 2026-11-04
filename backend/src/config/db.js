import mongoose from 'mongoose';

// Function to connect to MongoDB using Mongoose
export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully");
    return mongoose;
  } catch (err) {
    // Keep the process alive so the UI and non-database routes stay usable while
    // the database is unreachable (DNS, IP allowlist or offline development).
    console.error("Error connecting to MongoDB:", err.message);
    console.error("Server is running without a database connection.");
    return null;
  }
}
