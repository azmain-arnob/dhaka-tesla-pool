import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const port = Number(process.env.PORT ?? 5000);
const nodeEnv = process.env.NODE_ENV ?? "development";
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a valid positive integer");
}

export const env = {
  PORT: port,
  NODE_ENV: nodeEnv,
  DATABASE_URL: databaseUrl,
  JWT_SECRET: jwtSecret,
} as const;