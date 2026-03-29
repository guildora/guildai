export interface ActionDefinition {
  params: string[]
  description: string
}

export const ACTION_TYPES: Record<string, ActionDefinition> = {
  assign_role: {
    params: ['userId', 'roleId'],
    description: 'Assign a role to a member'
  },
  remove_role: {
    params: ['userId', 'roleId'],
    description: 'Remove a role from a member'
  },
  kick_user: {
    params: ['userId', 'reason'],
    description: 'Kick a user from the server'
  },
  ban_user: {
    params: ['userId', 'reason'],
    description: 'Ban a user from the server'
  },
  create_channel: {
    params: ['name', 'type', 'topic', 'categoryName', 'templateChannelName'],
    description: 'Create a new Discord channel. Use categoryName to place it in a category (permissions sync automatically). Use templateChannelName to copy permissions from an existing channel.'
  },
  delete_channel: {
    params: ['channelName'],
    description: 'Delete a Discord channel (use channelName or channelId)'
  },
  rename_channel: {
    params: ['channelName', 'name'],
    description: 'Rename an existing Discord channel. Use channelName to find it and name for the new name'
  },
  move_channel: {
    params: ['channelName', 'categoryName'],
    description: 'Move a channel to a category (use plain channel/category names, Unicode is auto-normalized)'
  },
  send_message: {
    params: ['channelName', 'content'],
    description: 'Send a message to a channel (use channelName or channelId)'
  },
  delete_message: {
    params: ['channelName', 'messageId'],
    description: 'Delete a message from a channel (use channelName or channelId)'
  },
  create_skill: {
    params: ['name', 'trigger', 'content'],
    description: 'Create a new custom skill in the Skill Library'
  },
  save_memory: {
    params: ['title', 'content', 'summary', 'keywords', 'pinned'],
    description: 'Retain important information about the guild, its members, or events. Set pinned to true for crucial permanent facts.'
  },
  delete_memory: {
    params: ['memoryId'],
    description: 'Delete a saved memory by its ID'
  }
}

export type ActionType = keyof typeof ACTION_TYPES

export function isValidActionType(type: string): type is ActionType {
  return type in ACTION_TYPES
}
