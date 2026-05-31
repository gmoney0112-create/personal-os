# NIGHTLY-NOTES.md

> Cross-agent learning log. Read this at the start of every session. Append useful findings when you're done.
> Lives at the root of the OpenClaw workspace.
> Append-only — never edit prior entries. Athena compacts weekly.

---

## How to use this file

**At session start:** Read the last 10 entries. If anything is relevant to your current task, apply it.

**At session end:** If you discovered something unexpected — a failure pattern, a shortcut, a API quirk — append it using the format below.

**Never:** Edit or delete prior entries. If an entry is wrong, append a correction with today's date.

---

## Format

```
### [DATE] — [AGENT / ROLE] — [PROJECT or SYSTEM]
**Found:** What was discovered or what broke
**Impact:** Why other agents should care
**Action:** Concrete thing to do differently next time (or "No action — informational")
```

---

## Notes

---

### 2025-05-31 — Codex (Forge) — personal-os
**Found:** The personal-os repo had no `.gitignore`, no auth on API routes, and `user_id` was being accepted from the request body without verification. Any user could write tasks for any other user's account by crafting a POST request.
**Impact:** Security gap is now patched — auth middleware added, `user_id` comes from JWT. But agents building on this backend should know: never trust user-supplied IDs for ownership checks. Always derive from the verified token.
**Action:** On any Express route that reads or writes user data, confirm `req.user.id` is from `requireAuth` middleware, not `req.body` or `req.params` without verification.

### 2025-05-31 — Codex (Forge) — personal-os
**Found:** React 19 has removed `onKeyPress`. The codebase was using it in `App.jsx:63`. It appeared to work in dev but is silently deprecated and will break in future builds.
**Impact:** Any React 19 project using `onKeyPress` is sitting on a silent time bomb.
**Action:** Use `onKeyDown` instead. Check any React project targeting v19 for `onKeyPress` usage before shipping.

### 2025-05-31 — Codex (Forge) — personal-os
**Found:** The original `App.jsx` only called `supabase.auth.getSession()` once at mount. It never subscribed to `onAuthStateChange`. This means sign-out events from other tabs or token expiry don't update the UI — the user stays "logged in" visually with a dead session.
**Impact:** All React + Supabase apps need both `getSession()` on mount AND `onAuthStateChange` subscription with cleanup. One without the other is broken.
**Action:** Standard Supabase auth pattern:
```js
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
  return () => subscription.unsubscribe();
}, []);
```

### 2025-05-31 — Codex (Forge) — personal-os / stack-wide
**Found:** GHL bearer tokens are corrupted when routed through the Comet proxy. The token arrives at GHL with character modifications, causing 401 errors that look like expired tokens.
**Impact:** Any agent or workflow that hits GHL through Comet will see phantom auth failures. This wastes hours if you don't know to check the raw token value before sending.
**Action:** Bypass Comet for GHL API calls. Hit the GHL REST API directly. Always include `Version: 2021-07-28` header. See GOTCHAS.md for the full breakdown.

### 2025-05-31 — Codex (Forge) — stack-wide
**Found:** n8n's modern expression syntax changed from `$node["Name"].json` to `$('Name').first().json`. Old syntax fails silently or returns undefined with no visible error in the UI.
**Impact:** Any workflow built with old n8n docs will silently compute wrong values. The output nodes appear to run but produce empty or null fields.
**Action:** Use `$('NodeName').first().json.field` always. For all-items: `$('NodeName').all()`. For current item in loop: `$json.field`. See GOTCHAS.md.

---

<!-- Append new entries above this comment, below the last entry. One entry per discovery. -->
