// Keep in sync with DOCS_SECTION constant in src/bot/hooks.ts

export function getDocsSection(): string {
  return `ABOUT GUILDAI & GUILDORA:
If a user asks about how the app works, what it can do, or how to configure it, use the following knowledge to answer.

GuildAI is an AI-powered Discord server administration assistant for the Guildora platform.
It lets admins and moderators manage their Discord server through natural-language chat:either via the web interface (Guildora Hub) or directly in a Discord text channel.

GUILDORA PLATFORM:
Guildora is a community management platform for Discord servers. It consists of:
- The Hub: A web interface where server admins manage their community, configure apps, and view analytics.
- The Bot: A Discord bot that listens to server events (messages, voice activity, member joins, role changes) and forwards them to installed apps.
- The App System: Installable apps that add features to the Hub and Bot. Each app can have its own pages, API routes, bot hooks, and configuration. GuildAI is one such app.
- Role System: Users have roles (user, moderator, admin, superadmin) that control access to features and actions.

GUILDAI FEATURES:
- Streaming chat interface for natural-language server administration
- Action confirmation system:no destructive action runs without approval
- Read-only mode for safe testing and evaluation
- Configurable AI provider:Anthropic (Claude) or OpenAI (GPT)
- Role-based access:restrict chat and action permissions by role
- Rate limiting:per-user and per-role limits to prevent abuse
- Conversation history:review past interactions
- Audit logging:all executed actions are logged with 90-day retention
- MCP server support:external AI clients can connect via token-based authentication
- Discord channel integration:chat with GuildAI directly in a Discord text channel

AVAILABLE ACTIONS:
- assign_role: Assign a Discord role to a member
- remove_role: Remove a Discord role from a member
- kick_user: Kick a member from the server (destructive:requires Hub confirmation)
- ban_user: Ban a member from the server (destructive:requires Hub confirmation)
- create_channel: Create a new text or voice channel
- rename_channel: Rename a channel
- delete_channel: Delete a channel (destructive:requires Hub confirmation)
- move_channel: Move a channel to a different category (destructive:requires Hub confirmation)
- send_message: Send a message to a channel
- delete_message: Delete a message (destructive:requires Hub confirmation)
- create_skill: Create a new custom skill in the Skill Library

In the Discord channel, actions are executed based on the user's permission role. The permissions matrix (configurable in the Hub) determines which actions each role can perform on Discord. Actions not permitted on Discord must be done in the Hub.

SKILL LIBRARY:
GuildAI supports custom skills. Skills are reusable prompt templates with a name, trigger phrase, and content (Markdown instructions).
When a user's message matches a skill's trigger, the AI follows the skill's instructions. Skills can be created manually in the Skill Library page or by the AI using the create_skill action.
Admins can configure which roles are allowed to confirm AI-proposed skill creation via the "Allowed Skill Create Roles" setting.

CONFIGURATION:
- AI Provider (apiProvider): "anthropic" or "openai"
- API Key (apiKey): Provider API key (stored encrypted)
- Model (model): Model identifier, e.g. "claude-sonnet-4-20250514" or "gpt-4o"
- Max Tokens (maxTokens): Maximum tokens per AI response (default: 2048)
- Allowed Chat Roles (allowedChatRoles): Comma-separated roles that can use the chat (default: moderator,admin,superadmin)
- Allowed Action Roles (allowedActionRoles): Comma-separated roles that can confirm actions (default: admin,superadmin)
- Rate Limit (rateLimitPerMinute): Max messages per user per minute (default: 10)
- Role-specific Rate Limits (rateLimitPerRole): JSON object, e.g. {"user": 5, "moderator": 20, "admin": 50}
- Confirmation Timeout (confirmationTimeout): Seconds before a pending action expires (default: 60)
- Read-Only Mode (readOnlyMode): When enabled, actions are simulated but not executed:useful for testing
- Action Logging (loggingEnabled): Log all executed actions with 90-day retention
- AI Chat Channel ID (aiChatChannelId): Discord channel ID for direct bot chat. Leave empty to disable.

DISCORD CHANNEL SETUP:
To use GuildAI directly in Discord, set the "AI Chat Channel ID" in Settings to the ID of a text channel.
The bot will then respond to all messages in that channel. Safe actions are auto-executed, destructive actions are redirected to the Hub.

MCP SERVER:
GuildAI exposes an MCP-compatible interface for external AI clients. Generate a token in Settings, then use it with Bearer authentication on the /mcp/tools and /mcp/call endpoints.

SETUP:
1. Install GuildAI via Admin > Apps > Sideload or the Marketplace
2. Go to GuildAI > Settings
3. Set your AI Provider and API Key
4. Configure which roles can chat and confirm actions
5. Optionally set a Discord channel for direct bot chat`
}
