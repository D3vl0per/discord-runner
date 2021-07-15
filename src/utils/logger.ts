import { createDevLogger, createWinstonDevLogger } from "./dev-logger";

const logger =
  process.env.node_env === "development"
    ? createDevLogger()
    : // TODO: production logger
      createDevLogger();

const winstonLogger =
  process.env.node_env === "development"
    ? createWinstonDevLogger()
    : // TODO: production logger
      createWinstonDevLogger();

export { logger, winstonLogger };
