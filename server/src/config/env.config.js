import dotenv from "dotenv";
dotenv.config();

const getEnv = (key, fallback) => {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    console.warn(`[Config] WARNING: Missing environment variable: ${key}`);
    return "";
  }
  return value ?? fallback;
};

const env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", "5000")),
  MONGO_URI: getEnv("MONGO_URI"),
  DB_NAME: getEnv("DB_NAME", "queueless"),
  ALLOWED_ORIGINS: getEnv("ALLOWED_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),
  ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET", "dev_access_secret"),
  REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET", "dev_refresh_secret"),
  ACCESS_TOKEN_EXPIRATION: getEnv("ACCESS_TOKEN_EXPIRATION", "15m"),
  REFRESH_TOKEN_EXPIRATION: getEnv("REFRESH_TOKEN_EXPIRATION", "7d"),
  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID", ""),
  RESEND_API_KEY: getEnv("RESEND_API_KEY", ""),
  FROM_EMAIL: getEnv("FROM_EMAIL", "noreply@queueless.app"),
  OPENAI_API_KEY: getEnv("OPENAI_API_KEY", ""),
  OPENAI_MODEL: getEnv("OPENAI_MODEL", ""),
  DOCUMENT_STORAGE_PATH: getEnv("DOCUMENT_STORAGE_PATH", "./private-documents"),
  DOCUMENT_RETENTION_DAYS: Number(getEnv("DOCUMENT_RETENTION_DAYS", "90")),
  DEMO_MODE: getEnv("DEMO_MODE", "true") === "true",
  TOKEN_QR_SECRET: getEnv("TOKEN_QR_SECRET"),
};

if (isNaN(env.PORT)) env.PORT = 5000;

if (!env.TOKEN_QR_SECRET || env.TOKEN_QR_SECRET.length < 32) {
  throw new Error("TOKEN_QR_SECRET must be configured with at least 32 characters.");
}

export default Object.freeze(env);
