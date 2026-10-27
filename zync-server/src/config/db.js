import mongoose from "mongoose";
import config from "./env.js";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("[db] Connection failed:", err.message);
    throw err; // server.js catches this and exits
  }

  mongoose.connection.on("disconnected", () =>
    console.warn("[db] MongoDB disconnected")
  );

  mongoose.connection.on("error", (err) =>
    console.error("[db] MongoDB error:", err.message)
  );
}
