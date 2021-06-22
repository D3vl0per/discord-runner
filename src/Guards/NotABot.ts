import { ArgsOf, GuardFunction } from "@typeit/discord";
import { CommandInteraction, Message } from "discord.js";
import "reflect-metadata";

const NotABot: GuardFunction<ArgsOf<"message"> | CommandInteraction> = async (
  messageOrCommand,
  _,
  next
) => {
  if ((messageOrCommand as CommandInteraction).user) {
    if (!(messageOrCommand as CommandInteraction).user.bot) {
      next();
    }
  } else if (
    (messageOrCommand as [message: Message]).length > 0 &&
    (messageOrCommand as [message: Message])[0].author &&
    !(messageOrCommand as [message: Message])[0].author.bot
  ) {
    next();
  }
};

export default NotABot;
