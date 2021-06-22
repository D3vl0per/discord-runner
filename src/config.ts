import * as dotenv from "dotenv";

const envFound = dotenv.config();
if (envFound.error) {
  throw new Error("Couldn't find .env file or volumes in compose.");
}

const nodeEnv = process.env.NODE_ENV || "development";
const discordToken = process.env.DISCORD_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const testGuildId = process.env.TEST_GUILD_ID;
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
if (nodeEnv === "development" && !testGuildId) {
  throw new Error(
    "You need to specify the TEST_GUILD_ID in the .env file if it is running in a development environment."
  );
}

export default {
  nodeEnv,
  testGuildId,
  discordToken,
  backendUrl,
  api,
};
