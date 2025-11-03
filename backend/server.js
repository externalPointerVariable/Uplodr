const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

const authRoutes = require("./routes/user.route");
const mediaRoutes = require("./routes/file.route");

app.use("/api/auth", authRoutes);
app.use("/api/media", mediaRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is healthy ✅" });
});

app.get("/", (req, res) => {
  res.json({ message: "Backend is live ✅" });
});

if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../build");
  app.use(express.static(buildPath));

  app.use((req, res, next) => {
    if (req.method === "GET" && !req.url.startsWith("/api")) {
      res.sendFile(path.resolve(buildPath, "index.html"));
    } else {
      next();
    }
  });
}

app.use((err, req, res, next) => {
  console.error("❌ Internal error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});