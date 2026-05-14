import mongoose from "mongoose";

export const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 6+ options (remove if using older version)
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ Database connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY / 1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
    } else {
      console.error("Max retries reached. Exiting...");
      process.exit(1);
    }
  }
};