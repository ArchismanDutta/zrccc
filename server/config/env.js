// config/env.js
// Validates and exports all environment variables.
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const required = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

const requiredInProduction = [
  "RESET_TOKEN_SECRET",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing required env variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (isProduction) {
  const missingProd = requiredInProduction.filter((key) => !process.env[key]);
  if (missingProd.length) {
    console.error(
      `❌ Missing required production env variables: ${missingProd.join(", ")}`
    );
    process.exit(1);
  }
}

const mailSecure =
  process.env.MAIL_SECURE !== undefined
    ? process.env.MAIL_SECURE === "true"
    : isProduction; // defaults to true in production, false in development

if (isProduction && !mailSecure) {
  console.warn(
    "⚠️  WARNING: MAIL_SECURE is false in production. TLS for mail is strongly recommended."
  );
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5001", 10),
  MONGODB_URI: process.env.MONGODB_URI,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "15m",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "7d",

  RESET_TOKEN_SECRET: process.env.RESET_TOKEN_SECRET,

  MAIL_SECURE: mailSecure,

  FRONTEND_ORIGINS: (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "localhost",
  IS_PRODUCTION: isProduction,
};
