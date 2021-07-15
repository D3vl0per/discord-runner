import express from "express";
import config from "../config";
import { createWinstonDevLogger } from "../utils/dev-logger";
import { logger } from "../utils/logger";
import router from "./router";

const createApi = () => {
  const api = express();

  api.use(createWinstonDevLogger());

  api.use(express.json());
  api.use(config.api.prefix, router());

  api.listen(config.api.port, () =>
    logger.info(`API listening on ${config.api.port}`)
  );

  return api;
};

export default createApi;
