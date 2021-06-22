import { ArgsOf, GuardFunction } from "@typeit/discord";
import { CommandInteraction, Message } from "discord.js";

const IsAPrivateMessage: GuardFunction<ArgsOf<"message"> | CommandInteraction> =
  async (messageOrCommand, _, next) => {
    if ((messageOrCommand as CommandInteraction).channel) {
      if ((messageOrCommand as CommandInteraction).channel.type === "dm") {
        next();
      }
    } else if (
      (messageOrCommand as [message: Message]).length > 0 &&
      (messageOrCommand as [message: Message])[0].channel.type === "dm"
    ) {
      next();
    }
  };

export default IsAPrivateMessage;
