# GuildAI Agent Context

KI-Admin-Assistent fuer Guildora mit Chat-Interface und MCP-Server.

## Read First

- Guildora docs: https://github.com/guildora/docs
- Manifest: `/for-developers/manifest.md`
- Design system: `/DESIGN_SYSTEM.md` (KRITISCH!)

## Key Files

- `manifest.json` -- App metadata
- `src/pages/settings.vue` -- Admin settings
- `src/pages/chat.vue` -- Chat interface with streaming
- `src/pages/history.vue` -- Chat history
- `src/api/chat/stream.post.ts` -- SSE streaming endpoint
- `src/api/action/confirm.post.ts` -- Action confirmation
- `src/api/config.get.ts` / `config.put.ts` -- Settings CRUD
- `src/api/mcp/tools.get.ts` / `call.post.ts` -- MCP server endpoints
- `src/utils/` -- Shared utilities (system prompt, AI caller, rate limiter, etc.)

## Critical Rules

### Design (DO NOT FORGET!)
- **ALWAYS** use `.field__control` + `.field__input` for form inputs
- **NEVER** use bare `.input`, `.select`, `.textarea`
- Only CSS variables for colors (`var(--color-accent)`, etc.)
- 8px grid for spacing (tokens: 1,2,3,4,6,8,12,16,24,32)
- NO `*-5` spacing tokens
- Cards: `.card` with `.p-6` inner padding
- Buttons: `.btn .btn-primary .btn-sm`

### Security
- System prompt is hardcoded in `src/utils/systemPrompt.ts`
- All actions through whitelist (`enabledActions` config)
- Rate limiting per user + role
- 60s timeout for confirmations
- Read-only mode for testing

### Bot-Bridge
- Uses stubs in `src/utils/botBridge.ts`
- Maps action types to bot API endpoints
- Falls back to error response if not available

## Development Workflow

1. Read `manifest.json`
2. Check `DESIGN_SYSTEM.md` before every `.vue` file
3. Test with Read-Only Mode
4. Verify rate limiting
5. Test action confirmation
6. Check EN + DE i18n
