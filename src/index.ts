import bodyParser from "body-parser";
import http from "http";
import express from "express";
import morgan from "morgan";

import { config } from "./config";
import logger from "./utils/logger";
import webhook from "./webhook";

const app = express();

app.use(bodyParser.json());

app.use(morgan("combined"));

app.disable("x-powered-by");
app.disable("etag");

app.use("/", webhook);

http.createServer(app).listen(config.port, () => {
  logger.info(`server running on port: ${config.port}`);
});
