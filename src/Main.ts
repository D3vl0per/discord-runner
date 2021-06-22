/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Client } from "@typeit/discord";
import { Intents } from "discord.js";
import api from "./api/api";
import config from "./config";
import NotABot from "./Guards/NotABot";
import "reflect-metadata";
import logger from "./utils/logger";

class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  static start(): void {
    api();

    this._client = new Client({
      intents: [Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES],
      guards: [NotABot],
      slashGuilds: process.env.NODE_ENV ? undefined : ["844222532994727957"],
    });

    this._client.login(
      config.discordToken,
      `${__dirname}/*.ts`,
      `${__dirname}/*.js`
    );

    this._client.once("ready", async () => {
      await this._client.clearSlashes();
      await this._client.initSlashes();

      logger.info("Bot started");
    });

    this._client.on("interaction", (interaction) => {
      this._client.executeSlash(interaction);
    });
  }
}
Main.start();

export default Main;
