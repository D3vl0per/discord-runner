/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import { Message } from "discord.js";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { userJoined } from "./service";
import logger from "./utils/logger";
import config from "./config";

async function prefixBehaviour(message: Message) {
  const prefix = Main.prefixes.get(message.guild.id);
  if (prefix) {
    return prefix;
  }

  return config.defaultPrefix;
}

@Discord(prefixBehaviour)
abstract class Commands {
  @Command("ping")
  @Guard(NotABot)
  ping(command: CommandMessage): void {
    command.reply(
      `Latency is ${
        Date.now() - command.createdTimestamp
      }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
    );
  }

  @Command("join :joinCode")
  @Guard(NotABot)
  join(command: CommandMessage): void {
    const { joinCode } = command.args;
    logger.debug(
      `User joined (${joinCode}, "discord", ${command.author.id}, ${command.guild.id})`
    );
    userJoined(joinCode, command.author.id, command.guild.id);
    command.delete().then();
  }
}

export default Commands;
