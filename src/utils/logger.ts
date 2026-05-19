import winston, { createLogger, format, transports } from "winston";
import { config } from "../config";

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp} ${level}] ${message}`;
});

const logger: winston.Logger = createLogger({
  level: config.loggingLevel,
  format: combine(timestamp(), myFormat),
  transports: [new transports.Console()],
});

export default logger;
