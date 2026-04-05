# Omnichannel Gateway Implementation

This document describes the implementation of the Omnichannel Gateway feature that allows Paperclip to receive messages from various platforms (Slack, Telegram, Discord, etc.) and create agent wakeup requests.

## Architecture

### Database Schema

The feature uses 4 new database tables:

1. **`channel_connections`** - Platform integrations per company
   - Stores platform credentials, configuration, and status
   - Supports: slack, telegram, discord, email, webhook, whatsapp, signal

2. **`channel_sessions`** - Cross-platform session tracking
   - Portable session keys: `paperclip:{companyId}:{platform}:{type}:{chatId}[:{threadId}]`
   - Tracks message counts and token usage
   - Auto-reset capabilities for daily/idle policies

3. **`channel_pairings`** - OWASP-compliant user authorization
   - 8-character pairing codes from unambiguous alphabet
   - SHA-256 hashed user IDs (12-char prefix)
   - Rate limiting with failed attempt tracking

4. **`channel_messages`** - Inbound message log
   - Normalized canonical event format
   - Links to agent wakeup requests
   - Tracks multimedia attachments

### Service Layer

**`channelGatewayService(db)`** provides:

- Connection management (CRUD operations)
- Session lifecycle management  
- Message processing pipeline
- Pairing code generation and approval
- Authorization checks

### API Endpoints

- `GET /companies/:id/channel-connections` - List integrations
- `POST /companies/:id/channel-connections` - Create integration  
- `PATCH /companies/:id/channel-connections/:id` - Update integration
- `DELETE /companies/:id/channel-connections/:id` - Remove integration
- `GET /companies/:id/channel-sessions` - List active sessions
- `POST /companies/:id/channel-connections/:id/inbound` - Webhook entry point
- `GET /companies/:id/channel-pairings` - List pending pairings
- `POST /companies/:id/channel-pairings/approve` - Approve pairing

## Usage Flow

### 1. Setup Platform Connection

```typescript
POST /api/companies/{companyId}/channel-connections
{
  "platform": "slack",
  "name": "Sales Slack",
  "config": {
    "botToken": "xoxb-...",
    "channelSecret": "random-secret-for-webhooks"
  },
  "policyConfig": {
    "allowDMs": true,
    "autoReset": "daily"
  }
}
```

### 2. Webhook Configuration

Configure your platform (Slack, Discord, etc.) to send webhooks to:
```
POST /api/companies/{companyId}/channel-connections/{connectionId}/inbound
Headers: X-Paperclip-Channel-Secret: {channelSecret}
```

### 3. Message Processing

When a message arrives:
1. Validates channel secret
2. Checks user authorization (for DMs)
3. Creates/updates session
4. Logs message
5. Creates agent wakeup request
6. Returns session and wakeup IDs

### 4. DM Authorization (Pairing)

For unauthorized DM senders:
1. System generates 8-character code
2. User shares code with admin
3. Admin approves via UI or API
4. Future messages from user are allowed

## Security Features

- **Channel Secret Validation** - Webhook endpoints verify secrets
- **User Pairing** - DM senders must be explicitly authorized  
- **Hashed User IDs** - PII protection with SHA-256 hashing
- **Rate Limiting** - Failed pairing attempts are tracked
- **OWASP Compliance** - Unambiguous alphabet for pairing codes

## Integration Examples

### Slack Bot Setup
1. Create Slack app with bot token
2. Add webhook URL to event subscriptions
3. Store bot token in connection config
4. Set channel secret for webhook validation

### Discord Bot Setup  
1. Create Discord application and bot
2. Get bot token and channel IDs
3. Configure webhook endpoint
4. Handle Discord-specific message formats

## Migration

Run the migration to create tables:
```bash
pnpm db:migrate
```

The migration file `0050_channel_gateway.sql` creates all required tables with proper indexes and foreign keys.

## Testing

Key test scenarios:
- Connection CRUD operations
- Message processing pipeline
- Pairing code generation/approval
- Session lifecycle management
- Error handling for unauthorized users
- Webhook secret validation

## Files Created

- `packages/db/src/schema/channel_connections.ts`
- `packages/db/src/schema/channel_sessions.ts`  
- `packages/db/src/schema/channel_pairings.ts`
- `packages/db/src/schema/channel_messages.ts`
- `packages/db/src/migrations/0050_channel_gateway.sql`
- `server/src/services/channel-gateway.ts`
- `server/src/routes/channels.ts`

## Files Modified

- `packages/db/src/schema/index.ts` - Added schema exports
- `server/src/services/index.ts` - Added service export
- `server/src/routes/index.ts` - Added route export
- `server/src/app.ts` - Mounted channel routes

The implementation follows all existing Paperclip patterns for consistency and maintainability.