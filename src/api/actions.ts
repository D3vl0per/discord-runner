import {
  GuildMember,
  PartialGuildMember,
  Collection,
  Role,
  Permissions,
  GuildChannel,
  MessageEmbed,
  Guild,
  Channel,
} from "discord.js";
import Main from "../Main";
import logger from "../utils/logger";
import {
  ActionError,
  CreateChannelParams,
  CreateRoleResult,
  DeleteChannelAndRoleParams,
  DiscordChannel,
  InviteResult,
  ManageRolesParams,
  UserResult,
} from "./types";
import {
  getErrorResult,
  getUserDiscordId,
  getUserResult,
} from "../utils/utils";
import config from "../config";

const DiscordServerNames: { [guildId: string]: [name: string] } = {};

const notifyAccessedChannels = async (
  member: GuildMember | PartialGuildMember,
  addedRoles: Collection<string, Role>,
  guildName: string
) => {
  const accessedRoles = addedRoles.map((r) => r.id);
  const accessedChannels = member.guild.channels.cache.filter(
    (channel) =>
      channel.type !== "GUILD_CATEGORY" &&
      !channel.isThread() &&
      channel.permissionOverwrites.cache.some(
        (po) =>
          accessedRoles.some((ar) => ar === po.id) &&
          po.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      )
  ) as Collection<string, GuildChannel>;

  const sortedChannels = accessedChannels.reduce<
    Map<string | null, GuildChannel[]>
  >((acc, value) => {
    let channels = acc.get(value?.parent?.name);
    if (!channels) {
      channels = [];
    }
    channels.push(value);
    acc.set(value?.parent?.name, channels);
    return acc;
  }, new Map());

  const multipleChannels = accessedChannels.size > 1;
  const embed = new MessageEmbed({
    title: `You got access to ${
      multipleChannels ? "these channels" : "this channel"
    } with the \`${guildName}\` guild in \`${member.guild.name}\`:`,
    color: `#${config.embedColor}`,
  });

  const categoryEmoji = Main.Client.emojis.cache.get("908436219317342208");
  const privateChannelEmoji =
    Main.Client.emojis.cache.get("908436261444915230");

  sortedChannels.forEach((channel, key) => {
    const fieldValue = channel
      .map(
        (c) =>
          `[${privateChannelEmoji}${c.name}](https://discord.com/channels/${member.guild.id}/${c.id})`
      )
      .join("\n");
    embed.addField(
      `${categoryEmoji}${key || "Without Category"}`,
      fieldValue.length < 1025 ? fieldValue : fieldValue.substring(0, 1024)
    );
  });

  member.send({ embeds: [embed] }).catch(logger.error);
};

const manageRoles = async (
  params: ManageRolesParams,
  isUpgrade: boolean
): Promise<UserResult> => {
  logger.verbose(`manageRoles params: ${JSON.stringify(params)}, ${isUpgrade}`);
  const { userHash, guildId, roleId, message } = params;

  const guild = await Main.Client.guilds.fetch(guildId);
  const discordId = await getUserDiscordId(userHash);

  if (!discordId)
    throw new Error(`PlatformUserId doesn't exists for ${userHash} userHash.`);

  const member = await guild.members.fetch(discordId);

  const roleManager = await guild.roles.fetch();

  const roleIds = [roleManager.find((r) => r.id === roleId).id];

  const rolesToManage = roleManager.filter((role) => roleIds.includes(role.id));

  if (rolesToManage.size !== roleIds.length) {
    const missingRoleIds = roleIds.filter(
      (id) => !rolesToManage.map((role) => role.id).includes(id)
    );
    throw new ActionError("missing role(s)", missingRoleIds);
  }

  if (
    (isUpgrade && roleIds.some((id) => !member.roles.cache.has(id))) ||
    (!isUpgrade && roleIds.some((id) => member.roles.cache.has(id)))
  ) {
    let updatedMember: GuildMember;
    if (isUpgrade) {
      updatedMember = await member.roles.add(rolesToManage);
    } else {
      updatedMember = await member.roles.remove(rolesToManage);
    }

    if (isUpgrade) {
      await notifyAccessedChannels(updatedMember, rolesToManage, message);
    }

    return getUserResult(updatedMember);
  }

  return getUserResult(member);
};

const generateInvite = async (
  guildId: string,
  inviteChannelId: string
): Promise<InviteResult> => {
  logger.verbose(`generateInvite params: ${guildId}`);
  const cachedInvite = Main.inviteDataCache.get(guildId);
  logger.verbose(`cached invite code: ${cachedInvite?.code}`);

  if (cachedInvite && cachedInvite.inviteChannelId === inviteChannelId) {
    return {
      code: cachedInvite.code,
    };
  }

  const guild = await Main.Client.guilds.fetch(guildId);
  const invite = await guild.invites.create(inviteChannelId, { maxAge: 0 });
  logger.verbose(`generated invite code: ${invite.code}`);

  Main.inviteDataCache.set(guildId, {
    code: invite.code,
    inviteChannelId,
  });

  if (cachedInvite && cachedInvite.inviteChannelId !== inviteChannelId) {
    logger.verbose(`deleting old invite: ${cachedInvite.code}`);
    guild.invites.fetch().then((invites) => {
      invites
        .find((i) => i.code === cachedInvite.code)
        ?.delete()
        .catch(logger.error);
    });
  }

  return {
    code: invite.code,
  };
};

const isMember = async (
  guildId: string,
  userHash: string
): Promise<UserResult> => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const discordId = await getUserDiscordId(userHash);

  if (!discordId)
    throw new Error(`PlatformUserId doesn't exists for ${userHash} userHash.`);

  const member = await guild.members.fetch(discordId);

  return getUserResult(member);
};

const removeUser = async (guildId: string, userHash: string): Promise<void> => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const discordId = await getUserDiscordId(userHash);

  if (!discordId)
    throw new Error(`PlatformUserId doesn't exists for ${userHash} userHash.`);

  const member = await guild.members.fetch(discordId);

  await member.kick();
};

const createChannel = async (params: CreateChannelParams) => {
  logger.verbose(`createChannel params: ${JSON.stringify(params)}`);
  const { guildId, roleId, channelName, categoryName } = params;
  const guild = await Main.Client.guilds.fetch(guildId);

  const everyone = guild.roles.cache.find((r) => r.name === "@everyone");
  logger.verbose(`createChannel params: ${JSON.stringify(everyone)}`);

  const createdChannel = await guild.channels.create(channelName, {
    type: "GUILD_TEXT",
  });
  // TODO modify  and simplify below
  if (guildId === "886314998131982336") {
    const category = guild.channels.cache.find(
      (c) => c.name.toUpperCase() === "GUILDS-3" && c.type === "GUILD_CATEGORY"
    );

    await (
      guild.channels.cache.find(
        (c) => c.name === createdChannel.name && !c.isThread()
      ) as GuildChannel
    ).setParent(category.id);
  }
  // categoryName param is ID, TODO modify
  if (categoryName) {
    const category = guild.channels.cache.find(
      (c) => c.id === categoryName && c.type === "GUILD_CATEGORY"
    );
    if (category) {
      await createdChannel.setParent(category.id);
    }
  }

  createdChannel.permissionOverwrites.set([
    {
      id: everyone.id,
      deny: Permissions.FLAGS.VIEW_CHANNEL,
    },
    {
      id: roleId,
      allow: [
        Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.ATTACH_FILES,
        Permissions.FLAGS.EMBED_LINKS,
        Permissions.FLAGS.READ_MESSAGE_HISTORY,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
        Permissions.FLAGS.VIEW_CHANNEL,
      ],
      deny: [Permissions.FLAGS.CREATE_INSTANT_INVITE],
    },
  ]);
  return createdChannel;
};

const deleteRole = async (guildId: string, roleId: string): Promise<Role> => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const deletedRole = guild.roles.cache.find((r) => r.id === roleId).delete();
  return deletedRole;
};

const deleteChannel = async (
  guildId: string,
  channelName: string
): Promise<Channel> => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const deletedChannel = guild.channels.cache
    .find((r) => r.name.toLowerCase() === channelName.toLowerCase())
    .delete();
  return deletedChannel;
};

const deleteChannelAndRole = async (
  params: DeleteChannelAndRoleParams
): Promise<boolean> => {
  logger.verbose(`deleteChannelAndRole params: ${JSON.stringify(params)}`);
  const { guildId, roleId, channelName } = params;

  try {
    await deleteRole(guildId, roleId);
    await deleteChannel(guildId, channelName);
    return true;
  } catch (error) {
    logger.error(getErrorResult(error));
    return false;
  }
};

const createRole = async (
  guildId: string,
  roleName: string
): Promise<CreateRoleResult> => {
  logger.verbose(`createRole params: ${guildId}, ${roleName}`);
  const guild = await Main.Client.guilds.fetch(guildId);

  const role = await guild.roles.create({
    name: roleName,
    hoist: true,
    reason: `Created by ${Main.Client.user.username} for an Agora Space community level.`,
  });
  logger.verbose(`role created: ${role.id}`);

  return { id: role.id };
};

const updateRoleName = async (
  guildId: string,
  roleId: string,
  newRoleName: string
) => {
  logger.verbose(
    `updateRoleName params: ${guildId}, ${roleId}, ${newRoleName}`
  );
  const guild = await Main.Client.guilds.fetch(guildId);

  const role = await guild.roles.fetch(roleId);

  const updatedRole = await role.edit(
    { name: newRoleName },
    `Updated by ${Main.Client.user.username} because the role name has changed in Guild.`
  );

  return updatedRole;
};

const isIn = async (guildId: string): Promise<boolean> => {
  logger.verbose(`isIn params: ${guildId}`);

  try {
    await Main.Client.guilds.fetch(guildId);
    logger.verbose("isIn: true");
    return true;
  } catch (error) {
    if (error.code === 50001) {
      logger.verbose("isIn: false");
      return false;
    }
    logger.verbose("isIn: error");
    throw error;
  }
};

const listChannels = async (
  guildId: string
): Promise<DiscordChannel[] | undefined> => {
  logger.verbose(`listChannels params: ${guildId}`);
  let guild: Guild;
  try {
    guild = await Main.Client.guilds.fetch(guildId);
  } catch (error) {
    if (error.code === 50001) {
      logger.verbose(`listChannels: guild not found`);
      throw new ActionError("Guild not found.", [guildId]);
    }
    throw error;
  }

  const channels = guild.channels.cache
    .filter(
      (c) =>
        c.type === "GUILD_TEXT" &&
        c
          .permissionsFor(guild.roles.everyone)
          .has(Permissions.FLAGS.VIEW_CHANNEL)
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      category: c.parent.name.toUpperCase(),
    }));

  logger.verbose(`listChannels result: ${JSON.stringify(channels)}`);
  return channels;
};

const listAdministeredServers = async (userHash: string) => {
  logger.verbose(`listAdministeredServers params: ${userHash}`);
  const discordId = await getUserDiscordId(userHash);

  if (!discordId)
    throw new Error(`PlatformUserId doesn't exists for ${userHash} userHash.`);

  const administeredServers = Main.Client.guilds.cache
    .filter((g) =>
      g.members.cache.get(discordId)?.permissions.has("ADMINISTRATOR")
    )
    .map((g) => ({ name: g.name, id: g.id }));

  logger.verbose(`listAdministeredServers result: ${administeredServers}`);
  return administeredServers;
};

const getCategories = async (inviteCode: string) => {
  const invite = await Main.Client.fetchInvite(inviteCode);
  const guild = await Main.Client.guilds.fetch(invite.guild.id);
  const categories = guild.channels.cache
    .filter((c) => c.type === "GUILD_CATEGORY")
    .map((c) => ({ id: c.id, name: c.name }));
  return {
    serverId: invite.guild.id,
    categories,
  };
};

const getGuild = async (guildId: string) => {
  if (DiscordServerNames[guildId]) {
    return DiscordServerNames[guildId];
  }
  const guild = await Main.Client.guilds.fetch(guildId);
  DiscordServerNames[guildId] = guild.name as any;
  return guild.name;
};

const getRole = async (guildId: string, roleId: string) => {
  const guild = await Main.Client.guilds.fetch(guildId);
  const role = guild.roles.cache.find((r) => r.id === roleId);
  return { serverName: guild.name, roleName: role.name };
};

export {
  manageRoles,
  generateInvite,
  isMember,
  removeUser,
  createRole,
  updateRoleName,
  isIn,
  listChannels,
  listAdministeredServers,
  createChannel,
  getCategories,
  getGuild,
  getRole,
  deleteChannelAndRole,
};
