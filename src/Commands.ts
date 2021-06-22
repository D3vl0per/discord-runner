/* eslint-disable class-methods-use-this */
import { Discord, Guard, Option, Slash } from "@typeit/discord";
import { CommandInteraction } from "discord.js";
import Main from "./Main";
import { userJoined } from "./service";
import "reflect-metadata";
import NotABot from "./Guards/NotABot";

@Discord()
abstract class Commands {
  @Slash("ping")
  @Guard(NotABot)
  ping(interaction: CommandInteraction): void {
    interaction.reply(
      `Latency is ${
        Date.now() - interaction.createdTimestamp
      }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
    );
  }

  @Slash("join")
  @Guard(NotABot)
  join(
    @Option("code", {
      description: "the join code provided at the website",
      required: true,
    })
    joinCode: number,
    interaction: CommandInteraction
  ): void {
    userJoined(joinCode, interaction.user.id, interaction.guild?.id, true).then(
      (ok) => {
        const message = ok
          ? "You have successfully joined."
          : "Join failed. (wrong join code)";
        interaction.reply(message);
      }
    );
  }
}

export default Commands;
