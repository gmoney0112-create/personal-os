# GOTCHAS.md — Soul Prosperity Stack

Every agent reads this before starting a session.
Every time you hit an unexpected failure — append it below.
This file turns one agent's failure into every agent's knowledge.

Format:
```
## [YYYY-MM-DD] [Brief title]
- **Tried:** What was attempted
- **Failed because:** Root cause
- **Solution:** What actually works
```

---

## GHL (GoHighLevel)

## [2025-05-31] Bearer token corruption when auth flows through Comet
- **Tried:** Passing the GHL bearer token via the Comet middleware proxy to make authenticated API calls
- **Failed because:** Comet modifies the Authorization header in transit — the token arrives at GHL with extra whitespace or character substitution, causing 401 errors that look like expired tokens
- **Solution:** Bypass Comet for all GHL API calls. Hit the GHL REST API directly from n8n or the backend. Never route GHL auth headers through intermediate proxies. If you must use Comet, validate the raw token value with a `console.log` before sending.

## [2025-05-31] Missing API version header causes silent failures
- **Tried:** GHL API calls without the Version header, or with the wrong date format
- **Failed because:** GHL requires `Version: 2021-07-28` on all API requests. Without it, calls silently return 400 or wrong data with no clear error message
- **Solution:** Every GHL HTTP request must include:
  ```
  Authorization: Bearer {token}
  Version: 2021-07-28
  Content-Type: application/json
  ```
  Add this as a header preset in n8n for all GHL nodes.

## [2025-05-31] Location ID vs Agency/Company ID confusion
- **Tried:** Using the agency-level company ID in endpoints that expect a location ID
- **Failed because:** GHL has two ID scopes — agency-level (`companyId`) and sub-account level (`locationId`). Most operational endpoints (contacts, pipelines, calendars) require `locationId`. Using `companyId` returns 403 or empty data
- **Solution:** Store the Location ID as a stack constant. Confirm in every GHL endpoint URL: if it contains `/locations/{id}/`, use the Location ID. If it contains `/companies/{id}/`, use the company ID. Never guess.

## [2025-05-31] GHL contact search returns partial matches
- **Tried:** Searching contacts by email using GHL search API expecting exact match
- **Failed because:** GHL search is fuzzy. It returns similar emails (e.g., searching `john@gmail.com` may return `johnny@gmail.com`)
- **Solution:** After getting search results, always filter client-side by exact email match before using the first result. Never assume the first result is the target contact.

---

## n8n

## [2025-05-31] Wrong node reference syntax breaks workflow silently
- **Tried:** `$item("NodeName").json.fieldName` or `$node["NodeName"].json.fieldName` in n8n expressions
- **Failed because:** Modern n8n (v1.x) uses a different expression syntax. Old syntax either throws or returns undefined without a visible error
- **Solution:** Always use:
  ```
  $('NodeName').first().json.fieldName
  ```
  For arrays/all items:
  ```
  $('NodeName').all().map(item => item.json.fieldName)
  ```
  For the current item in a loop:
  ```
  $json.fieldName
  ```

## [2025-05-31] Agents cannot reach n8n at localhost:5678
- **Tried:** Pointing an agent (Athena, Icarus) at `http://localhost:5678` to trigger n8n webhooks
- **Failed because:** Athena and other non-exec agents cannot fetch localhost/127.0.0.1. The OpenClaw web_fetch tool blocks private hostnames
- **Solution:** Only Forge and exec-capable agents can hit localhost. For Athena to trigger n8n, route through a public URL (e.g., ngrok tunnel in dev, Railway public URL in prod). Alternatively, have Forge act as the n8n caller on Athena's behalf.

## [2025-05-31] n8n webhook URL differs between dev and production
- **Tried:** Using the same webhook URL in both dev and production n8n environments
- **Failed because:** Dev n8n (localhost:5678) and production n8n (Railway) have different base URLs. Hardcoding either causes calls to fail in the other environment
- **Solution:** Store webhook base URL as an environment variable: `N8N_WEBHOOK_BASE`. Set it to `http://localhost:5678` locally and to the Railway URL in production. All webhook paths are constructed as `${N8N_WEBHOOK_BASE}/webhook/{path}`.

## [2025-05-31] n8n Code node scope doesn't include lodash or moment
- **Tried:** Using `_.groupBy()` or `moment()` in an n8n Code node
- **Failed because:** n8n Code nodes run in a sandboxed environment. Lodash, moment, and most npm packages are not available unless n8n is configured with `N8N_CUSTOM_EXTENSIONS`
- **Solution:** Use native JavaScript instead. For grouping: `Array.reduce()`. For dates: native `Date` methods or `$today`/`$now` built-ins. If you need lodash, restructure as a Function node that calls an external service.

## [2025-05-31] Webhook test mode vs production mode output mismatch
- **Tried:** Testing a webhook trigger in n8n UI and assuming output structure matches production
- **Failed because:** In test mode, n8n wraps webhook data differently than in production (real trigger). The `body` field structure changes
- **Solution:** After testing with the UI, always do one live trigger to confirm the actual field paths. Use `$('Webhook').first().json.body` and inspect before building downstream nodes.

---

## Git / Claude Code

## [2025-05-31] Fork push rules — always check remote before pushing
- **Tried:** `git push origin main` from a forked or session branch
- **Failed because:** Pushing to `origin` when the remote is a fork pushes to the fork, not the upstream. In Claude Code web sessions, the session branch is the intended target
- **Solution:** Always specify the branch explicitly:
  ```bash
  git push -u origin claude/new-session-{ID}
  ```
  Never push to main or master without an explicit PR. Confirm the remote URL with `git remote -v` before the first push in any session.

## [2025-05-31] Never skip pre-commit hooks with --no-verify
- **Tried:** `git commit --no-verify` to bypass a failing hook
- **Failed because:** The hook failure is a signal, not noise. Bypassing it masks the underlying issue and can push broken code silently
- **Solution:** Read the hook output. Fix the actual problem. If the hook itself is misconfigured, fix the hook config — don't skip it. The commit that works after fixing is safer than the one that bypassed the check.

## [2025-05-31] Amending published commits destroys history
- **Tried:** `git commit --amend` after a commit was already pushed
- **Failed because:** Amend rewrites the commit hash. If the branch is already on the remote, force-push is required, which rewrites shared history
- **Solution:** Never amend published commits. Always create a new commit. If a pre-commit hook fails after a push, fix and commit fresh — never amend.

## [2025-05-31] Branch naming in Claude Code web sessions
- **Tried:** Creating branches with custom names in Claude Code web sessions
- **Failed because:** Claude Code web sessions are pre-assigned a branch (`claude/new-session-{ID}`). Creating a different branch and pushing to it may not be tracked by the session
- **Solution:** Always develop on the assigned branch. The branch is in the session system prompt. Never push to a branch other than the assigned one without explicit operator permission.

---

## Railway

## [2025-05-31] Environment variables not available on first deploy after adding
- **Tried:** Adding an env var in Railway dashboard and expecting it to be immediately available in a running service
- **Failed because:** Railway doesn't hot-reload env vars into running processes. The service must be redeployed
- **Solution:** After adding or changing any env var in Railway: trigger a manual redeploy. Confirm the var is set by checking Railway deploy logs for the service startup output.

## [2025-05-31] Railway public URL format for n8n webhooks
- **Tried:** Using the Railway internal hostname for webhook URLs shared with external services
- **Failed because:** Internal Railway hostnames (`.railway.internal`) are only reachable within the same Railway project network
- **Solution:** Use the Railway public domain (e.g., `your-service.up.railway.app`) for any URL that external services or agents need to call. Set this as `RAILWAY_PUBLIC_URL` in your env and reference it everywhere.

---

## Supabase

## [2025-05-31] Service role key bypass RLS — always scope server queries
- **Tried:** Using the service role key for all Supabase queries in the backend
- **Failed because:** The service role key bypasses Row Level Security entirely. If user_id scoping is done wrong (or forgotten), one user can read or modify another user's data
- **Solution:** Every backend query using the service role key must include an explicit `.eq('user_id', req.user.id)` filter. Treat the service role key as a loaded weapon — point it correctly every time.

## [2025-05-31] Supabase anon key + RLS can be hit from client-side safely
- **Tried:** Worrying about exposing the anon key in frontend code
- **Note:** The anon key is designed to be public. RLS policies enforce per-user data access. The risk is not the key — it's a missing or misconfigured RLS policy. Audit RLS first.

---

## Claude Code (General)

## [2025-05-31] Agent hallucinates tool calls for unavailable MCP servers
- **Tried:** Asking an agent to use an MCP tool while the server is still connecting
- **Failed because:** MCP servers show as "connecting" for several seconds after session start. Agent may attempt the tool call immediately and get InputValidationError or silent failure
- **Solution:** Use `ToolSearch` first if there's any doubt about whether a tool schema is loaded. Wait for the server to fully connect (confirmed by schema appearing in ToolSearch results) before calling.

## [2025-05-31] Read file before Edit, always
- **Tried:** Using the Edit tool on a file without calling Read first
- **Failed because:** Edit requires the file state to be current in context. Without a prior Read in the session, Edit throws an error
- **Solution:** Always Read any file before editing it, even if you wrote it earlier in the same session. This is enforced by the tool itself.

---

<!-- Agents: append your discoveries below this line using the format above -->
