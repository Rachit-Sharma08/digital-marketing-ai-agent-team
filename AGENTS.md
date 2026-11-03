# AGENTS.md — Digital Marketing AI Agent Team

> Project context and handoff instructions for anyone (human or AI) working on this repo.
> **No API keys are stored here.** API keys live only in the local environment (`.env`, gitignored) and never enter the repository.

---

## 1. Project overview

This is a local, browser-based **AI agent team for digital marketing and vibe-coding**. It is a fork of [dunder-mifflin-os](https://github.com/stephenlthorn/dunder-mifflin-os) (MIT licence) with a new agent-routing layer, a team-console UI, autostart launchers, and documentation.

- **Workspace:** `D:\Projects\dunder-mifflin-os`
- **Live repo:** `https://github.com/Rachit-Sharma08/digital-marketing-ai-agent-team` (public, `main`)
- **Upstream remote:** `https://github.com/stephenlthorn/dunder-mifflin-os.git` (read-only fork source)
- **Last commit:** `ae84360` — "Document the agent team, routing model and attribution with screenshots"
- **Working tree:** clean (no uncommitted changes)

---

## 2. Tech stack

| Layer | Stack |
|---|---|
| Server | Node.js (`node:http` router), TypeScript |
| Web | React + Vite, TypeScript, CSS modules |
| Tests | Vitest (web: 100 files / 626 tests; server: 80 files / 631 tests), Playwright (E2E) |
| Build | esbuild / Vite, output to `web/dist` |
| Runtime | Local only, binds `127.0.0.1` by default |

---

## 3. How to run

### Prerequisites
- Node.js 20+ installed (`C:\Program Files\nodejs\node.exe`)
- One free LLM API key in the environment (never committed): `GEMINI_API_KEY` (default), or extend `server/src/agents/command.ts` for other providers

### Demo mode (scripted day, no keys, no network)
```powershell
cd D:\Projects\dunder-mifflin-os
npm run build
node bin\dunder-mifflin-os.mjs --demo
# Open http://127.0.0.1:4318
```

### One-click autostart (Windows)
- **Server:** `D:\Projects\dunder-mifflin-os\start-demo-silent.vbs` (hidden, background) — placed in Windows Startup
- **Launcher:** `D:\Projects\dunder-mifflin-os\open-demo.ps1` (checks port 4318, starts server if down, opens browser) — desktop shortcut target

### Live mode (read-only Hermes, port 4319)
```powershell
node bin\dunder-mifflin-os.mjs --port 4319
```
Reads `~/.hermes` (or `%USERPROFILE%\.hermes`) read-only: status, kanban, sessions, cron jobs. Never touches `.env`, tokens, or credentials. If a source is missing, that panel degrades to empty instead of crashing.

---

## 4. Key files (new agent-layer work)

| File | Purpose |
|---|---|
| `server/src/agents/router.ts` | Rule-based router: command text → specialist kind + person desk + model tier + reason. Deterministic, keyword-first. |
| `server/src/agents/command.ts` | Calls the selected model (Gemini free tier). Rate-limit aware, 429/503 handled, key from env only. |
| `server/src/http/agentRoutes.ts` | `GET /api/agents` (team list + key ready flag) and `POST /api/agents/command` (`{ "text": "..." }` → agent/model/answer). Rate-limited, input-capped at 4000 chars. |
| `server/src/http/app.ts` | Wires `agentRoutes` into the HTTP app (write-gated behind `DMOS_ALLOW_WRITES`). |
| `web/src/team/TeamConsole.tsx` | React panel: textarea, send, reply display (agent, model, reason, answer). |
| `web/src/styles/team.css` | Team console styling (office palette). |
| `web/src/chrome/TopBar.tsx` | Top bar: added "✦ Team" button next to Ask Pam. |
| `web/src/App.tsx` | Renders `TeamConsole` when team panel is open. |
| `web/src/main.tsx` | Imports `styles/team.css`. |
| `open-demo.ps1` | Desktop launcher: retry loop (3 attempts × 5s) to start server on port 4318, then open browser. |
| `start-demo-silent.vbs` | Hidden VBS to start server on login (Startup folder). No console window. |

---

## 5. Agent routing (how commands map to people + models)

Router lives in `server/src/agents/router.ts`. First matching keyword wins (order matters — `ads` before `content`, so "ad copy" routes to ads).

| Specialist | Person (desk) | Title | Keywords |
|---|---|---|---|
| seo | oscar | SEO analyst | seo, keyword, serp, backlink, meta tag, search console |
| ads | dwight | Paid ads manager | ads, ad copy, google ads, meta ads, roas, cpc, ctr |
| email | andy | Email marketer | email, subject line, drip, newsletter, cold mail |
| social | kelly | Social media lead | instagram, linkedin, twitter, reel, caption, hashtag |
| analytics | angela | Analytics lead | analytics, ga4, report, metric, conversion rate, funnel |
| design | ryan | Creative director | design, banner, thumbnail, creative, layout, brand |
| code | sadiq | Web developer | code, bug, fix, react, api, next.js, typescript, html, css, deploy |
| content | pam | Content writer | blog, article, content, copy, landing page, write |
| general | michael | Marketing lead | fallback (nothing else matched) |

**Model tiers** (Gemini free tier):
- `fast` → `gemini-3.5-flash-lite` (short copy, captions)
- `balanced` → `gemini-3.5-flash` (normal strategy/writing)
- `deep` → `gemini-3.5-flash` (audits, plans, >40 words or deep words like audit/strategy/plan)

Every answer exposes: agent, model, reason, `tookMs`. Nothing is a black box.

---

## 6. Security baseline (permanent)

1. **No API keys in the repo.** `.env` and `.env.*` are gitignored. Keys live only in the local shell/env.
2. Server binds to `127.0.0.1` unless `DMOS_HOST` is explicitly set beyond loopback (then `DMOS_ACCESS_TOKEN` is required).
3. Every write endpoint (`POST /api/agents/command`, chat, tasks, approvals) requires `DMOS_ALLOW_WRITES=1`; read-only by default.
4. Request bodies are size-capped (4000 chars for commands), rate-limited (20/min for commands), validated at the boundary.
5. Model key is read from environment, never written to a file or log.

---

## 7. Git workflow

- Two remotes: `origin` (your public repo), `upstream` (original MIT project). Do not push to upstream (403 — not a collaborator).
- Commit style: short imperative summary, no gendered language, no API keys, no secrets.
- Shallow-clone gotcha: if push fails with "did not receive expected object", run `git fetch --unshallow upstream` first, then push.
- Repo topics set: `ai-agents`, `digital-marketing`, `gemini`, `local-first`, `marketing-automation`, `nodejs`, `react`, `seo`, `vibe-coding`.

---

## 8. Tests & quality

| Suite | Result |
|---|---|
| Web (Vitest) | 626/626 pass |
| Server (Vitest) | 631 pass, **11 fail** — all pre-existing Windows path-separator / docs-JSON issues (POSIX `/home/...` paths, CRLF snippets). Not caused by this work. |
| Typecheck | Clean (web + server) |
| Build | Clean |

Run: `npm test` (web + server), `npm run typecheck`, `npm run build`.

---

## 9. Known issues / open decisions

- **Live mode shows 12 bots offline:** `D:\hermes\profiles` folder does not exist yet; Hermes has no configured agents/profiles. Live mode degrades gracefully (empty panels). Hermes setup is **optional** — only needed if you want real agents on the map.
- **Demo approvals:** scripted (`approvals: false` in demo adapter), HR inbox empty. Clickable approvals exist only in live mode with `--allow-writes`.
- **50 contributions in one day:** intentionally not done — that is spammy. Real logical small commits instead; graph grows naturally.
- **Office theme:** fan-styled homage to The Office / Dunder Mifflin. README has the legal note. If making this a public product, consider replacing Dunder Mifflin names/assets.

---

## 10. User preferences (read before writing)

- User is **male** (ladka). **Never** use "baby", "babu", "bachha", "mam", "sir", "she", or "her" in commit messages, README, code, or replies. Use the name **Rachit Sharma** or neutral "he/his" only if a pronoun is needed.
- Prefer simple Hindi/Hinglish explanations when asked; keep tone warm but not gendered.
- Default assumption: free tools only. No paid APIs, no new keys requested from the user.

---

## 11. Resume commands

```powershell
cd D:\Projects\dunder-mifflin-os
npm run build
node bin\dunder-mifflin-os.mjs --demo
# http://127.0.0.1:4318 → click ✦ Team → type a command
```
