import env from "dotenv";

env.config();

interface Config {
  loggingLevel: string;
  port: string;
  username: string;
  password: string;
  token: string;
  fleetUrl?: string;
  fleetToken?: string;
  allowedLabels: string[];
}

export const config: Config = {
  loggingLevel: process.env.LOGGING_LEVEL || "debug",
  port: process.env.PORT || "8001",
  username: process.env.WEBHOOK_USERNAME || "dynamic",
  password: process.env.WEBHOOK_PASSWORD || "dynamic123",
  token: process.env.WEBHOOK_TOKEN || "token",
  fleetUrl: process.env.FLEET_URL,
  fleetToken: process.env.FLEET_TOKEN,
  allowedLabels:
    process.env.ALLOWED_LABELS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [],
};
