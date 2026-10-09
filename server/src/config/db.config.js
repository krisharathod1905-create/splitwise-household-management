import mongoose from "mongoose";
import env from "#config/env.config.js";

let isConnected = false;
let mongoMemoryServer = null;

export const connectDB = async () => {
  if (isConnected) return;

  // Reduce Mongoose buffer timeout so it doesn't hang for 10s if disconnected
  mongoose.set("bufferTimeoutMS", 3000);

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      dbName: env.DB_NAME,
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to Primary Database: ${conn.connection.host} / ${env.DB_NAME}`);
  } catch (error) {
    console.warn(`[MongoDB] Primary DB unavailable (${error.message}). Launching In-Memory Database Fallback...`);

    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();

      const conn = await mongoose.connect(memUri, { dbName: env.DB_NAME });
      isConnected = true;
      console.log(`[MongoDB] In-Memory DB Active at ${memUri}`);

      // Automatically populate in-memory database with demo data
      const { seedDatabase } = await import("../scripts/seed.js");
      await seedDatabase();
      console.log("[MongoDB] In-Memory DB successfully seeded with demo offices, services, staff, and tokens!");
    } catch (memErr) {
      console.error("[MongoDB] Failed to launch In-Memory DB:", memErr.message);
    }
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
  isConnected = false;
  console.log("[MongoDB] Disconnected.");
};
