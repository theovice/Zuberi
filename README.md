# Zuberi — Project Aegis
**Operator:** James Mwaweru | Wahwearro Holdings, LLC

AI-to-AI continuity repo. Structured for machine parsing, not human readability.

**Start here:** `AGENT-BOOTSTRAP.md`

## Structure

```
AGENT-BOOTSTRAP.md      — Entry point. Read order. Operating model.
state/                  — Current system state (YAML)
  infrastructure.yaml   — Hardware, services, ports, versions
  priorities.yaml       — Working queue (P0→Ongoing)
  zuberi.yaml           — Behavioral state, coaching history
  openclaw.yaml         — Gateway config, exec pipeline, device auth
lessons/                — Categorized lessons (YAML)
  architecture.yaml     — System architecture
  ceg.yaml              — CEG operations
  zuberichat.yaml       — ZuberiChat development
  ccode.yaml            — Prompt engineering
  openclaw.yaml         — OpenClaw/gateway
decisions/
  log.yaml              — Every key decision with rationale
designs/                — Architecture documents (MD)
research/               — Deep research reports (MD)
sessions/               — Session handoffs (MD)
rtl_dashboard.html      — Interactive dashboard
AIAgent/                — James's original project files
```
