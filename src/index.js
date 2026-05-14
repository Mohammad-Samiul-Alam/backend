import express from "express";
import cors from "cors";
import "dotenv/config";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

job.start();

// Increase JSON payload limit to 10MB (enough for base64 images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// Connect to DB before starting server
await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});