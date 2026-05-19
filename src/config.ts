import env from "dotenv";

env.config();

interface Config {
  loggingLevel: string;
  port: string;
  username: string;
  password: string;
  token: string;
  jamfUrl?: string;
  jamfClientId?: string;
  jamfClientSecret?: string;
  allowedGroups: string[];
}

export const config: Config = {
  loggingLevel: process.env.LOGGING_LEVEL || "debug",
  port: process.env.PORT || "8001",
  username: process.env.WEBHOOK_USERNAME || "dynamic",
  password: process.env.WEBHOOK_PASSWORD || "dynamic123",
  token: process.env.WEBHOOK_TOKEN || "token",
  jamfUrl: process.env.JAMF_URL,
  jamfClientId: process.env.JAMF_CLIENT_ID,
  jamfClientSecret: process.env.JAMF_CLIENT_SECRET,
  allowedGroups: process.env.ALLOWED_GROUPS?.split(",") || [],
};
