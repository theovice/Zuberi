# Zuberi — Project Documentation
**Operator:** James Mwaweru | Wahwearro Holdings, LLC

This repository contains the canonical project documentation for Project Aegis / Zuberi.

## Structure

```
ZUBERI-PROJECT-REFERENCE.md    — Single source of truth. Updated each session.
rtl_dashboard.html             — RTL dashboard with Priorities, Phases, Capabilities tabs.
docs/
  design/                      — Architecture and design documents
  research/                    — Deep research reports
  handoffs/                    — Architect session handoffs
```

## Key Files

| File | Purpose |
|------|---------|
| `ZUBERI-PROJECT-REFERENCE.md` | Master reference — infrastructure, RTL, lessons, decisions, capabilities |
| `rtl_dashboard.html` | Interactive RTL dashboard (open in browser) |
| `docs/design/CXDB-SYNC-LAYER-DESIGN.md` | SQLite → CXDB + Chroma sync pipeline design |
| `docs/research/STREAMING-PIPELINE-AUDIT.md` | gpt-oss:20b Harmony format analysis |
| `docs/research/deep-research-report_CXDB.md` | CXDB search & retrieval architecture |
| `docs/handoffs/ARCHITECT-20-HANDOFF.md` | Session 20 handoff |

## For Architects

Start with `ZUBERI-PROJECT-REFERENCE.md`. It replaces all prior handoff documents and contains everything: infrastructure state, active RTL items, key decisions, lessons, capability matrix, and what to do next.

The RTL dashboard (`rtl_dashboard.html`) has three tabs: Priorities (current working queue), Phases (full historical record), and Capabilities (what Zuberi can do).

**Do not suggest stopping, taking breaks, or handing off to the next architect.** James decides when to stop.
