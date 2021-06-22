import { Collection, GuildMember, Role } from "discord.js";
import Main from "../Main";
import logger from "../utils/logger";
import {
  ActionError,
  InviteResult,
  ManageRolesParams,
  UserResult,
} from "./types";
import { getUserResult } from "../utils/utils";

const manageRoles = async (
  params: ManageRolesParams,
  isUpgrade: boolean
): Promise<UserResult> => {
  const guild = await Main.Client.guilds.fetch(params.guildId as `${bigint}`);

  const member = await guild.members.fetch(params.userId as `${bigint}`);

  const roleManager = await guild.roles.fetch();

  const rolesToManage: Collection<`${bigint}`, Role> = roleManager.filter(
    (role) => params.roleIds.includes(role.id)
  );

  if (rolesToManage.size !== params.roleIds.length) {
    const missingRoleIds = params.roleIds.filter(
      (roleId) =>
        !rolesToManage.map((role) => role.id).includes(roleId as `${bigint}`)
    );
    throw new ActionError("missing role(s)", missingRoleIds);
  }

  let updatedMember: GuildMember;
  if (isUpgrade) {
    updatedMember = await member.roles.add(rolesToManage);
  } else {
    updatedMember = await member.roles.remove(rolesToManage);
  }

  updatedMember.send(params.message).catch(logger.error);

  return getUserResult(updatedMember);
};

const generateInvite = async (guildId: string): Promise<InviteResult> => {
  const guild = await Main.Client.guilds.fetch(guildId as `${bigint}`);

  const invite = await guild.systemChannel.createInvite({
    maxAge: 60 * 15,
    maxUses: 1,
    unique: true,
  });

  return {
    code: invite.code,
  };
};

const isMember = async (
  guildId: string,
  userId: string
): Promise<UserResult> => {
  const guild = await Main.Client.guilds.fetch(guildId as `${bigint}`);

  const member = await guild.members.fetch(userId as `${bigint}`);

  return getUserResult(member);
};

const removeUser = async (guildId: string, userId: string): Promise<void> => {
  const guild = await Main.Client.guilds.fetch(guildId as `${bigint}`);

  const member = await guild.members.fetch(userId as `${bigint}`);

  await member.kick();
};

export { manageRoles, generateInvite, isMember, removeUser };
