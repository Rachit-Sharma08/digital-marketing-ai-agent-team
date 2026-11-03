# Agents Ka Ghar — Hinglish Guide

AI agents ka office, browser me. 23 staff, isometric floor plan, status lights (working / meeting / idle / error / offline), har bande ka apna window (budget, tasks, chat), aur Sarah ke desk par **approvals** — agent kaam rok kar tumhara "haan" maangta hai.

Ye `stephenlthorn/agents-ka-ghar` (MIT license) ka local install hai. Office ka Agents Ka Ghar theme jaan-boojh kar rakha hai — video wahi tha.

---

## Sab free hai

- Repo MIT hai, koi paid plan nahi.
- **Koi API key nahi** chahiye. Demo bina internet chalta hai.
- Live mode tumhare PC par installed Hermes (`D:\hermes`) ko padhta hai — koi cloud nahi.
- Public demo chahiye to GitHub Pages par static build **free** host hota hai (repo me workflow already hai).

---

## Kaise chalao (2 shortcuts)

Desktop par do icons hain:

| Shortcut | Kya karta hai | URL |
|---|---|---|
| **Agents Ka Ghar (Demo)** | Scripted din "Campaign Daybook" — fictional, kuch bhi Hermes se nahi padhta | http://127.0.0.1:4318 |
| **Agents Ka Ghar (Live Hermes)** | Tumhare asli Hermes fleet ko read-only dikhata hai | http://127.0.0.1:4319 |

Shortcut double-click karo → CMD window khulegi → browser apne aap khul jayega. Band karne ke liye CMD window me `Ctrl+C` ya window close.

Manual commands:

```bat
cd /d D:\Projects\agents-ka-ghar
start-demo.cmd
start-live.cmd
```

---

## Demo me kya karein

- **Top bar** par clock, speed (1× / 10× / 60×), fleet summary. 60× par pura din ~9 minute me.
- **Kisi bhi bande par click** → person window: kaam, tasks, budget, chat.
- **`Ctrl+K`** (video me ⌘K) → "Ask Aanya" search/commands.
- **"N need you" button** → HR · Approvals inbox.
- Demo timeline: **10:58 AM** par Meera approval maangta hai, **11:40 AM** par script khud approve kar deta hai. Us window me dekhna ho to speed 60× rakho aur 10:50 ke aas-paas pohocho.
- Demo ka data sirf memory me hai — server band = sab reset. Tumhari asli files ko kuch nahi chhedta.

---

## Live Hermes mode

`start-live.cmd` ye chalata hai:

```bat
node bin\agents-ka-ghar.mjs --port 4319 --hermes-home D:\hermes --open
```

- Tumhare Hermes profiles/kanban se bots, status, tasks padhta hai.
- **Read-only hai by default** — chat aur naye tasks band. Ye jaan-boojh kar safe rakha hai: galti se koi agent run na ho jaye.
- Chat + task creation + live approvals chahiye to `start-live.cmd` me `--allow-writes` add kar do:

```bat
node bin\agents-ka-ghar.mjs --port 4319 --hermes-home D:\hermes --allow-writes --open
```

- Raat ko sab bots "offline" dikhte hain — ye normal hai, Hermes tab kaam nahi kar raha hota.

### Harmless log spam

Live mode me terminal par ye lines aa sakti hain:

```
hermes.read_failed ... D:\hermes\profiles\<name>\config.yaml ENOENT
```

Matlab us naam ka profile folder nahi hai. App phir bhi 12 bots dikhata hai — ignore kar sakte ho.

---

## Rebuild / test (agar code chhedna ho)

```bat
cd /d D:\Projects\agents-ka-ghar
npm run build
npm run typecheck
npm test
```

Note: `npm test` ka server part Windows par POSIX env syntax ki wajah se fail hota hai. Aise chalao:

```powershell
$env:NODE_OPTIONS='--disable-warning=ExperimentalWarning'
npx vitest run --root server
```

Server ke kuch tests Linux paths (`/home/...`, `~`) assume karte hain, isliye Windows par 11 tests fail honge — ye pehle se hai, app ka bug nahi. Web ke 626 tests pass hote hain.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Port 4318 already in use | Purani CMD window band karo, ya `Get-NetTCPConnection -LocalPort 4318` se PID nikaal kar kill karo |
| Browser nahi khula | Manually kholo: http://127.0.0.1:4318 (demo) / 4319 (live) |
| Live me 0 bots | `--hermes-home` path check karo (`D:\hermes`), aur `hermes gateway status` |
| Approvals live me disabled | `--allow-writes` add karo (upar dekho) |
| Build ke baad purana UI | Server restart karo (build sirf `web/dist` badalta hai) |

---

## Disclaimer

Ye unofficial fan project hai — the original rights holder / the workspace se affiliated nahi. Personal use ke liye theek hai; public post karne se pehle naam/theme badal lena safer hai. MIT license original repo me hai.
