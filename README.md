# GuildAI

AI-powered Discord server administration assistant for Guildora.

## Features

- **Web Chat Interface** -- Chat with AI directly in the Hub
- **Streaming Responses** -- Real-time AI responses
- **Admin Actions** -- Manage roles, channels, users, messages
- **Confirmation System** -- Manual approval for all destructive actions
- **Rate Limiting** -- Configurable per-role limits
- **Read-Only Mode** -- Safe testing without real changes
- **Action Logging** -- 90-day audit trail
- **MCP Server** -- External AI clients can connect
- **Chat History** -- View past conversations

## Installation

1. Go to **Admin > Apps > Sideload**
2. Enter repository URL
3. Click **Install** and **Activate**
4. Go to **GuildAI > Settings** to configure

## Configuration

Required settings:
- **AI Provider** -- Anthropic or OpenAI
- **API Key** -- Your provider's API key
- **Model** -- Model identifier

Optional:
- **Allowed Roles** -- Who can chat/approve actions
- **Rate Limits** -- Global and per-role limits
- **Enabled Actions** -- Which Discord operations allowed
- **Read-Only Mode** -- Testing without real changes
- **MCP Token** -- For external AI clients

## Security

- System prompt is hardcoded and not editable
- All actions require whitelist approval
- Rate limiting prevents abuse
- Confirmation required for all actions
- Read-only testing mode
- Prompt injection prevention

## License

MIT
