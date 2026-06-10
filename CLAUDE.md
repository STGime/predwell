# predwell — Eurobase Project

EU-sovereign backend powered by Eurobase. Zero US CLOUD Act exposure.

## Connection

- **API URL**: https://predwell.eurobase.app
- **SDK**: `@eurobase/sdk`
- **Install**: `npm install @eurobase/sdk`
- **Plan**: pro

## Database Schema

### email_tokens

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| user_id | uuid | no |
| token_hash | text | no |
| token_type | text | no |
| expires_at | timestamp with time zone | no |
| used_at | timestamp with time zone | yes |
| created_at | timestamp with time zone | yes |

### refresh_tokens

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| user_id | uuid | no |
| token_hash | text | no |
| expires_at | timestamp with time zone | no |
| revoked_at | timestamp with time zone | yes |
| created_at | timestamp with time zone | yes |

### storage_objects

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| key | text | no |
| content_type | text | yes |
| size_bytes | bigint | yes |
| uploaded_by | uuid | yes |
| metadata | jsonb | yes |
| created_at | timestamp with time zone | yes |

### todos

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| title | text | no |
| completed | boolean | yes |
| created_at | timestamp with time zone | yes |

### user_identities

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| user_id | uuid | no |
| provider | text | no |
| provider_user_id | text | no |
| identity_data | jsonb | yes |
| last_sign_in_at | timestamp with time zone | yes |
| created_at | timestamp with time zone | yes |
| updated_at | timestamp with time zone | yes |

### users

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| email | text | yes |
| phone | text | yes |
| password_hash | text | yes |
| display_name | text | yes |
| avatar_url | text | yes |
| metadata | jsonb | yes |
| provider | text | yes |
| provider_user_id | text | yes |
| email_confirmed_at | timestamp with time zone | yes |
| phone_confirmed_at | timestamp with time zone | yes |
| last_sign_in_at | timestamp with time zone | yes |
| banned_at | timestamp with time zone | yes |
| created_at | timestamp with time zone | yes |
| updated_at | timestamp with time zone | yes |

### vault_secrets

| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | no |
| name | text | no |
| secret | bytea | no |
| nonce | bytea | no |
| key_version | smallint | no |
| description | text | yes |
| created_at | timestamp with time zone | yes |
| updated_at | timestamp with time zone | yes |

## SDK Usage

```typescript
import { createClient } from '@eurobase/sdk'

const eb = createClient({
  url: 'https://predwell.eurobase.app',
  apiKey: process.env.EUROBASE_PUBLIC_KEY
})

// Query
const { data } = await eb.db.from('todos').select('*')

// Insert
await eb.db.from('todos').insert({ title: 'New task' })

// Update
await eb.db.from('todos').update({ completed: true }).eq('id', id)

// Delete
await eb.db.from('todos').delete().eq('id', id)

// File upload
await eb.storage.upload('path/file.pdf', file)

// Realtime
eb.realtime.on('todos', 'INSERT', (e) => console.log(e))
```

## Authentication

```typescript
// Sign up
const { data, error } = await eb.auth.signUp({ email: 'user@example.com', password: 'securepassword' })

// Sign in
await eb.auth.signIn({ email: 'user@example.com', password: 'securepassword' })

// Get current user
const { data: user } = await eb.auth.getUser()

// Listen for auth state changes
eb.auth.onAuthStateChange((event, session) => {
  console.log(event) // SIGNED_IN | SIGNED_OUT | TOKEN_REFRESHED
})

// Sign out
await eb.auth.signOut()
```

After sign-in, the JWT is sent automatically with every `eb.db` query. RLS policies are enforced server-side.

## MCP Server (Claude Code)

Eurobase ships an MCP server so Claude Code can operate on this project directly — list tables, run SQL, inspect users/files, read & write Vault secrets, invoke edge functions.

Add it once in your shell:

```bash
claude mcp add --transport http eurobase https://mcp.eurobase.app/mcp \
  --header "Authorization: Bearer $EUROBASE_PAT"
```

`EUROBASE_PAT` is a Personal Access Token. Mint one at <https://console.eurobase.app/account> → *Personal Access Tokens* → *New token*. The plaintext is shown once on creation; store it in a password manager or your shell rc. Tools are auto-namespaced as `mcp__eurobase__*`.

PATs authenticate as you across every project, but never carry superadmin rights — even if your account has them. They cannot mint other tokens, change passwords, or delete the account.

### MCP vs SDK vs migrations — pick the right channel

These are not interchangeable. Same project, three audiences:

- **SDK (`@eurobase/sdk`)** — code you write into the *application*. Runs in production at request-time, scoped by RLS to the end-user's JWT. Use it for everything the deployed app does on behalf of its users.
- **MCP** — tool calls *you* make during the coding session, scoped by my platform JWT. Use it to *inspect* (list tables, describe schema, run SELECT) and for *throwaway* operations.
- **Migrations (`migrations/NNNNNN_*.up.sql`)** — durable schema changes, version-controlled, reviewed in PR, replayed in CI on every environment.

Rules of thumb when the user asks me to make a change:

1. **Schema change of any kind** (`CREATE TABLE`, `ALTER TABLE`, `DROP`, new index, new RLS policy) → write a migration file under `migrations/`. **Do not** call `mcp__eurobase__db_execute_sql` to silently mutate the live DB; the change won't exist on staging or in any teammate's branch.
2. **App feature work** ("add a sign-up form", "render the orders list") → write SDK code in the app. The user's deployed app runs it.
3. **Inspection** ("how many rows? what columns?") → MCP `db_query` / `db_describe_table`. Don't hand-write a `psql` snippet.
4. **Throwaway debugging** ("add a `tmp_debug` column to poke at this") → MCP is fine, but say so explicitly and remove it before the session ends.
5. **Vault writes / production data mutations** via MCP → confirm with the user first. There's no undo.

Default to read-only via MCP. If a tool call would alter persistent state and isn't backed by a migration or SDK code path, stop and confirm.

## Constraints

- All infrastructure is EU-only (Scaleway, Paris FR)
- No US-incorporated services (AWS, GCP, Azure, Stripe, Vercel, Cloudflare)
- GDPR-native by design
