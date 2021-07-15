import { createLogger, format, transports } from "winston";
import expressWinston from "express-winston";

expressWinston.requestWhitelist.push("body");
expressWinston.responseWhitelist.push("body");

const { printf, combine, colorize, timestamp, errors } = format;

const devLogFormat = printf(
  (log) => `${log.timestamp} ${log.level}: ${log.stack || log.message}`
);

const expressDevLogFormat = printf((log) => {
  let formatString = `${log.timestamp} ${log.level}: ${log.message}`;
  if (log.meta?.req?.body) {
    formatString += `\nbody: ${JSON.stringify(log.meta.req.body)}`;
  }
  if (log.meta?.res) {
    formatString += `\nres: ${JSON.stringify(log.meta.res)}`;
  }
  return formatString;
});

const getLoggerOptions = (isExpress: boolean) => ({
  level: isExpress ? "info" : "debug",
  format: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    isExpress ? expressDevLogFormat : devLogFormat
  ),
  transports: [new transports.Console()],
  meta: true,
});

const createDevLogger = () => createLogger(getLoggerOptions(false));

const createWinstonDevLogger = () =>
  expressWinston.logger(getLoggerOptions(true));

export { createDevLogger, createWinstonDevLogger };
