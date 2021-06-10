import * as dotenv from "dotenv";
import { escapeRegExp } from "./utils/utils";

const envFound = dotenv.config();
if (envFound.error) {
  throw new Error("Couldn't find .env file or volumes in compose.");
}

const discordToken = process.env.DISCORD_TOKEN;
const backendUrl = process.env.BACKEND_URL;

let defaultPrefix: string;
if (process.env.DEFAULT_PREFIX) {
  defaultPrefix = escapeRegExp(process.env.DEFAULT_PREFIX);
} else {
  defaultPrefix = "!";
}

const api = {
  prefix: "/api",
  port: process.env.PORT || 8990,
};

if (!discordToken) {
  throw new Error(
    "You need to specify the bot's DISCORD_TOKEN in the .env file."
  );
}
if (!backendUrl) {
  throw new Error("You need to specify the BACKEND_URL in the .env file.");
}

export default {
  discordToken,
  backendUrl,
  defaultPrefix,
  api,
};
