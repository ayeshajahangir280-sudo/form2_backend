require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB, getDBStatus } = require("../config/db");
const registrationRoutes = require("../routes/registrationRoutes");

const app = express();
const port = process.env.PORT || 4000;

const defaultAllowedOrigins = [
  "https://reg-form-1.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

const allowedOrigins = (process.env.CORS_ORIGIN || defaultAllowedOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.disable("x-powered-by");
app.use(cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Indoor Community League 1.0 registration API",
    registrationFee: "AED 50/-",
    matchFee: "AED 40/- per match",
    routes: ["/api/health", "/api/registrations"],
  });
});

app.get("/api/health", (_req, res) => {
  const database = getDBStatus();

  res.json({
    ok: true,
    database: database.connected ? "connected" : "warming",
    readyState: database.readyState,
  });
});

app.post("/api/registrations", (_req, res) => {
  res.status(403).json({
    ok: false,
    message: "Registrations are currently closed.",
  });
});

app.use("/api/registrations", registrationRoutes);
app.use("/api/private-registration-7h4k9m", registrationRoutes);

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  if (error.message === "Only JPG, JPEG, or PNG files are allowed") {
    return res.status(400).json({
      ok: false,
      message: error.message,
      errors: { photo: error.message },
    });
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      ok: false,
      message: "File must be 2 MB or smaller",
      errors: { photo: "File must be 2 MB or smaller" },
    });
  }

  console.error(error);
  return res.status(500).json({
    ok: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Server error. Please try again later."
        : error.message,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });

  connectDB().catch((error) => {
    console.error("Initial MongoDB connection failed:", error.message);
  });
}

module.exports = app;
