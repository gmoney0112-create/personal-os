# Claude Code Setup & Mega-Prompt for Kingdom Systems
**Production Framework for AI Automation Agency Workflows**

---

## Quick Start: The 7-Step Foundation

### ✅ Step 1: Isolated Project Folder
**Why:** Claude Code has a strict safety model—it only touches the folder you designate.

```bash
# Create one clean workspace
mkdir -p ~/ClaudeCode/KingdomSystems
# Point Claude Code HERE and nowhere else.
```

### ✅ Step 2: Enable Bypass Permissions
**Why:** Without it, you'll click "allow" 30 times per session.

```
Settings → Claude Code → "Allow bypass permissions mode" → ON
```
Now Claude works autonomously while you handle client calls.

### ✅ Step 3: Connect Infrastructure (One Time)
**Why:** Permanent plumbing for all projects.

```
Settings → Connectors
├── Netlify (free) — deploys live web interfaces instantly
├── Supabase (free) — database & logging for all integrations
└── GitHub (optional) — version control for client delivery
```

### ✅ Step 4: Set Model to Opus 4.8 + Effort High
**Why:** The difference between a toy and a tool.

```
Bottom Right → Model Selector
├── Opus 4.8 (required for actual builds)
├── Effort: High (token cost ≈ $0.30-0.50/run)
└── Pro Tip: Budget ~$100-200/month for agency production work
```

### ✅ Step 5: Load the Mega-Prompt (BELOW)
**Why:** This one system prompt does more than steps 1-4 combined.

→ **Copy the full mega-prompt from `MEGA_PROMPT.txt` into the initial Claude Code chat.**

### ✅ Step 6: Get the App
```
→ claude.com/download
→ Pro Plan ($20/month) to unlock Code tab
→ Run Claude Code locally on your machine
```

### ✅ Step 7: Select Folder & Build
```
Open Claude Code
→ Click +
→ Select ~/ClaudeCode/KingdomSystems folder
→ Ask your first question
→ Watch it build live
```

---

## THE MEGA-PROMPT: Paste This Entirely Into Your First Claude Code Message

> Full prompt is in `MEGA_PROMPT.txt`. Constants (API keys, IDs) are in `.env.local` — never commit them.

---

## Quick-Start Templates by Agent Type

### Lead Qualifier Agent (Fastest Path to Revenue)
See `agent-templates/lead-qualifier-template.js`

### Appointment Scheduler Agent
See `agent-templates/appointment-scheduler-template.js`

### Proposal Generator Agent
See `agent-templates/proposal-generator-template.js`

---

## Deployment Checklist

### Pre-Deploy (Every Project)
- [ ] Environment variables stored in Supabase secrets (never in code)
- [ ] Audit log table created in Supabase (who did what, when)
- [ ] Error handling: all failures → Sentry + email alert
- [ ] Data validation: no bad state gets into GHL
- [ ] Test with real GHL webhook (not sandbox)

### Deploy to Netlify
```bash
netlify deploy --prod
# Site goes live. You have a shareable URL in 60 seconds.
```

### Connect to n8n
```
n8n Webhook → [Your Netlify URL]/api/handler
Test webhook → Check Supabase logs → Verify GHL saw the data
```

### Post-Deploy (Go-Live Checklist)
- [ ] Client tests end-to-end (their data, their GHL account)
- [ ] Metrics dashboard live (show MoM ROI)
- [ ] Escalation path defined (when do they call you?)
- [ ] Backup plan ready (if n8n fails, what's the manual fallback?)

---

## Common Pitfalls & Fixes

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| GHL webhook not firing | Webhook URL wrong or GHL auth expired | Test webhook in GHL UI first, verify Location ID |
| Netlify deploy hangs | Large dependencies (heavy ML) | Use lightweight libs; offload to Supabase edge functions |
| Payment webhook miss | Race condition (order created before confirmation) | Add 500ms delay on webhook handler |
| SMS not sending | Account deactivated mid-month | Pre-fund Twilio/platform, set billing alerts |
| Agent "forgets" context | Session timeout | Store state in Supabase, load on resume |

---

## Monthly Ops: How to Run This at Scale

### Week 1: Deploy
- Gather requirements (1 call, 20 min)
- Build (Claude Code, 1-3 hours)
- Deploy (Netlify, 5 min)
- Client test (30 min)

### Week 2-3: Refine & Monetize
- Live metrics review (client can see ROI)
- A/B test copy (lead qualifier language, objection responses)
- Upsell: "Want the next agent in the chain?"

### Week 4: Monitor & Plan Next
- Export weekly metrics CSV
- Flag any issues (webhook lag, payment failures)
- Plan next agent (Appointment Scheduler? Proposal Generator?)

---

## Pricing & Positioning

**Per Agent (Done-For-You):**
- Lead Qualifier: $2,000–2,500 (1-week build)
- Appointment Scheduler: $5,500–7,500 (2-week integration)
- Proposal Generator: $3,500–5,000 (custom PDF + payments)
- Full Stack (All 3): $10,000–15,000 (3-4 weeks, ongoing support)

**Monthly Retainer (Ongoing Optimization):**
- $1,000–2,000/month for monitoring + 2-3 sprints of improvement

**Positioning:**
> "Your lead flow is broken. We build AI agents that do the work while you sleep."

---

## File Structure for Your Kingdom Systems Projects

```
~/ClaudeCode/KingdomSystems/
├── leads-qualifier/
│   ├── frontend/ (React + Netlify)
│   ├── backend/ (n8n + Supabase)
│   └── scripts/ (testing, migration)
├── appointment-scheduler/
├── proposal-generator/
├── shared/
│   ├── ghl-api-helpers.js
│   ├── supabase-schema.sql
│   └── constants.env
└── docs/
    ├── ghl-integration-guide.md
    └── client-handoff-template.md
```

---

## Your Next Action

1. **Open Claude Code**
2. **Create a new project folder** in `~/ClaudeCode/KingdomSystems/`
3. **Paste the MEGA-PROMPT** from `MEGA_PROMPT.txt` as your first message
4. **Ask:** "Build me a [Lead Qualifier / Appointment Scheduler / Proposal Generator] agent for [client name]. Here's the intake data structure: [paste sample JSON]"
5. **Watch it build in 15 minutes**
6. **Deploy to Netlify**
7. **Send client the live URL**
8. **Collect payment** (Stripe invoice link in the agent interface)

---

**This is the operational system for Kingdom Systems revenue.** Every project follows this playbook. Every agent is a $2K–15K revenue event. Build one per week, and you're at $100K+ MRR in 6 months.
