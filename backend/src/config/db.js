import mongoose from "mongoose";

// Cache the connection promise so serverless invocations reuse one connection
// instead of opening a new one per request.
let connection = null;

export const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connection) {
    connection = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}/${m.connection.name}`);
        return m.connection;
      })
      .catch((error) => {
        connection = null; // allow a retry on the next request
        throw error;
      });
  }
  return connection;
};
