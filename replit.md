# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **WhatsApp bot**: whatsapp-web.js (Chromium via Nix system package)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## WhatsApp Bot

The WhatsApp bot (iSound / FONICORP) runs embedded within the API server using `whatsapp-web.js`.

### Files

- `artifacts/api-server/src/whatsapp/bot.ts` — WhatsApp client init, message processing, session timeout
- `artifacts/api-server/src/whatsapp/session.ts` — In-memory session management
- `artifacts/api-server/src/whatsapp/messages.ts` — All bot messages (welcome, menus, responses, evaluations)
- `artifacts/api-server/src/routes/whatsapp.ts` — HTTP endpoints for the bot

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/whatsapp/status` | Returns bot status, QR code (if pending), active session count |
| POST | `/api/whatsapp/send` | Send a WhatsApp message via API |
| GET | `/api/whatsapp/sessions` | List all active bot sessions |

### Send Message Endpoint

```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "to": "5511999999999",
  "message": "Olá! Mensagem enviada via API."
}
```

The `to` field should be the phone number with country code (e.g., `5511999999999` for Brazil).

### First-time Setup

1. Start the server — the bot will initialize automatically
2. Check `/api/whatsapp/status` to get the QR code string
3. Scan the QR code with WhatsApp (or watch it print in the server logs)
4. Once authenticated, the bot will handle incoming messages automatically

### Bot Flow

- User sends any greeting → Welcome message + main menu
- User picks a company (1=Fonicorp, 2=iSound, 3=Sonora) → Info message + back to menu
- User picks "Falar com atendente" (4) → Session transferred, bot stops responding
- User picks "Finalizar" (5) → Evaluation prompt → Followup menu → End
- Session auto-expires after 5 minutes of inactivity

### Chromium Config

Uses the Nix-installed Chromium binary at `/nix/store/.../bin/chromium`. Override with env var `CHROME_EXECUTABLE` if needed.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
