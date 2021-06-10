import { DiscordAPIError, GuildMember } from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import logger from "./logger";

function getUserResult(member: GuildMember): UserResult {
  return {
    username: member.user.username,
    discriminator: member.user.discriminator,
    avatar: member.user.avatar,
    roles: member.roles.cache
      .filter((role) => role.id !== member.guild.roles.everyone.id)
      .map((role) => role.id),
  };
}

function getErrorResult(error: Error): ErrorResult {
  let errorMsg: string;
  let ids: string[];
  if (error instanceof DiscordAPIError) {
    if (error.code === 50001) {
      // Missing access
      errorMsg = "guild not found";
    } else if (error.code === 10013) {
      // Unknown User
      errorMsg = "cannot fetch member";
    } else {
      errorMsg = "discord api error";
    }
  } else if (error instanceof ActionError) {
    errorMsg = error.message;
    ids = error.ids;
  } else {
    logger.error(error);
    errorMsg = "unknown error";
  }
  return {
    errors: [
      {
        msg: errorMsg,
        value: ids,
      },
    ],
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { getUserResult, getErrorResult, escapeRegExp };
