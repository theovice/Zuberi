# Zuberi — Execution Pathway (Concert Ticket Resale SaaS)

```
JAMES                          ZUBERI (qwen3:14b)                    CCODE (claude -p)
  │                                │                                      │
  │  "Build a ticket resale SaaS"  │                                      │
  │ ──────────────────────────────>│                                      │
  │                                │                                      │
  │                                │  DECOMPOSE TASK                      │
  │                                │  ├─ Research         (self)          │
  │                                │  ├─ Strategy         (self)          │
  │                                │  ├─ Financial Model  (self)          │
  │                                │  ├─ Architecture     (self + ccode)  │
  │                                │  ├─ Build            (ccode)         │
  │                                │  └─ Automate         (n8n, future)   │
  │                                │                                      │
  │                                │  WRITE: working/ticket-resale/       │
  │                                │         project-plan.md              │
  │                                │                                      │
  │  ◄── present plan for review ──│                                      │
  │                                │                                      │
  │  "approved, proceed" ─────────>│                                      │
  │                                │                                      │
  │                                ▼                                      │
  │                     ┌─────────────────────┐                           │
  │                     │  PHASE 1: RESEARCH   │                          │
  │                     │  (Zuberi solo)       │                          │
  │                     │                      │                          │
  │                     │  SearXNG → web_search│                          │
  │                     │  web_fetch full pages│                          │
  │                     │                      │                          │
  │                     │  WRITE:              │                          │
  │                     │  research-notes.md   │                          │
  │                     │  memory/YYYY-MM-DD.md│                          │
  │                     └──────────┬───────────┘                          │
  │                                │                                      │
  │                                ▼                                      │
  │                     ┌─────────────────────┐                           │
  │                     │  PHASE 2: STRATEGY   │                          │
  │                     │  (Zuberi solo)       │                          │
  │                     │                      │                          │
  │                     │  business-model.md   │                          │
  │                     │  strategy.md         │                          │
  │                     │  financial-model.csv │                          │
  │                     └──────────┬───────────┘                          │
  │                                │                                      │
  │  ◄── checkpoint: review ───────│                                      │
  │      strategy + financials     │                                      │
  │                                │                                      │
  │  "approved" ──────────────────>│                                      │
  │                                │                                      │
  │                                ▼                                      │
  │                     ┌─────────────────────┐                           │
  │                     │  PHASE 3: ARCHITECT  │                          │
  │                     │  (Zuberi writes plan)│                          │
  │                     │                      │                          │
  │                     │  architecture-plan.md│                          │
  │                     └──────────┬───────────┘                          │
  │                                │                                      │
  │                                │  DISPATCH (read-only review)         │
  │                                │ ────────────────────────────────────>│
  │                                │  claude -p "review this arch plan"   │
  │                                │  --allowedTools Read                  │
  │                                │  --output-format json                │
  │                                │  --max-turns 3                       │
  │                                │                                      │
  │                                │                              ┌───────┤
  │                                │                              │REVIEW │
  │                                │                              │schema │
  │                                │                              │auth   │
  │                                │                              │scale  │
  │                                │                              └───────┤
  │                                │                                      │
  │                                │  ◄──── JSON result ─────────────────│
  │                                │                                      │
  │                                │  INCORPORATE FEEDBACK                │
  │                                │  UPDATE: architecture-plan.md        │
  │                                │  LOG: memory/YYYY-MM-DD.md           │
  │                                │                                      │
  │                                ▼                                      │
  │                     ┌─────────────────────┐                           │
  │                     │  PHASE 4: BUILD      │                          │
  │                     │  (ccode executes)    │                          │
  │                     └──────────┬───────────┘                          │
  │                                │                                      │
  │                                │  DISPATCH (scaffold)                 │
  │                                │ ────────────────────────────────────>│
  │                                │  claude -p "scaffold Next.js +       │
  │                                │  Prisma + Stripe per this plan"      │
  │                                │  --allowedTools Read,Write,Bash      │
  │                                │  --session-id ticket-build-001       │
  │                                │  --max-turns 10                      │
  │                                │                                      │
  │                                │                              ┌───────┤
  │                                │                              │CREATE │
  │                                │                              │project│
  │                                │                              │install│
  │                                │                              │deps   │
  │                                │                              │schema │
  │                                │                              └───────┤
  │                                │                                      │
  │                                │  ◄──── JSON result ─────────────────│
  │                                │                                      │
  │                                │  VERIFY: check exit code             │
  │                                │  LOG: build-log.md                   │
  │                                │                                      │
  │                                │  ┌──────────────────────┐            │
  │                                │  │ LOOP: for each feature│           │
  │                                │  │  listing, search,     │           │
  │                                │  │  checkout, dashboard   │           │
  │                                │  └──────────┬────────────┘           │
  │                                │             │                        │
  │                                │  DISPATCH ──┼───────────────────────>│
  │                                │  (same      │  claude -p "implement  │
  │                                │  session)   │  [feature] per arch"   │
  │                                │             │  --session-id same     │
  │                                │             │                        │
  │                                │             │                ┌───────┤
  │                                │             │                │ CODE  │
  │                                │             │                │ TEST  │
  │                                │             │                │ COMMIT│
  │                                │             │                └───────┤
  │                                │             │                        │
  │                                │  ◄── result─┘ ◄─────────────────────│
  │                                │                                      │
  │                                │  IF ERROR ──────── loopback ────────>│
  │                                │  "fix this error: [context]"         │
  │                                │  ◄──── fix result ──────────────────│
  │                                │                                      │
  │                                │  IF SUCCESS → next feature (loop)    │
  │                                │                                      │
  │                                ▼                                      │
  │                     ┌─────────────────────┐                           │
  │                     │  PHASE 5: REPORT     │                          │
  │                     │                      │                          │
  │                     │  project-summary.md  │                          │
  │                     │  memory/YYYY-MM-DD.md│                          │
  │                     │  MEMORY.md (if appr) │                          │
  │                     └──────────┬───────────┘                          │
  │                                │                                      │
  │  ◄──── final report ───────────│                                      │
  │        deliverables, cost,     │                                      │
  │        what's next             │                                      │
  │                                │                                      │
  ▼                                ▼                                      ▼


═══════════════════════════════════════════════════════════════════════════

STORAGE MAP

  WORKSPACE (KILO: openclaw_workspace/working/ticket-resale/)
  ├── project-plan.md          ← task decomposition
  ├── research-notes.md        ← SearXNG findings
  ├── business-model.md        ← business model canvas
  ├── strategy.md              ← go-to-market plan
  ├── financial-model.csv      ← revenue projections
  ├── architecture-plan.md     ← system design
  ├── build-log.md             ← ccode dispatch results
  └── project-summary.md       ← final deliverable

  MEMORY (KILO: openclaw_workspace/memory/)
  ├── YYYY-MM-DD.md            ← daily session log (decisions, lessons)
  └── MEMORY.md                ← updated if project becomes ongoing

  REPO (KILO: C:\Users\PLUTO\github\Repo\TicketResale)
  ├── src/                     ← ccode writes here (Next.js app)
  ├── prisma/                  ← database schema
  ├── .env.local               ← API keys (gitignored)
  └── commits on main          ← ccode commits per feature

  CEG (FUTURE: /opt/zuberi/projects/ticket-resale/)
  ├── repos/                   ← large assets, mirrors
  ├── cxdb/                    ← conversation memory
  └── n8n/                     ← automated workflows

═══════════════════════════════════════════════════════════════════════════

KEY FLOWS

  Zuberi solo:     James ──> Zuberi ──> files (no ccode cost)
  ccode dispatch:  Zuberi ──> claude -p ──> JSON result ──> Zuberi
  error loopback:  Zuberi ──> ccode ──> error ──> Zuberi ──> ccode (fix)
  approval gate:   Zuberi ──> James (pause) ──> James approves ──> Zuberi
  memory persist:  Zuberi ──> memory/YYYY-MM-DD.md (every phase end)
```
