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

// ✅ Increase limit to handle base64 images (10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);   // ✅ ensure route is /api/books

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});