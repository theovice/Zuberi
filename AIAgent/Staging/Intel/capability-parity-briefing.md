# Capability Parity Briefing — Ruflo & Automaton Reference Systems
# For: Session 5 Architect
# Context: HORIZON.md Section 8

---

## Why These Systems Matter

James researched two open-source autonomous agent systems — Ruflo and Automaton — 
to identify capabilities Zuberi should eventually have. The goal is NOT to fork, 
copy, or integrate their code. The goal is architectural study: understand what 
they built, extract the patterns that apply to Zuberi's local-only architecture, 
and build equivalent capabilities using our own stack (OpenClaw + Ollama + n8n + 
CXDB + ccode).

Both systems are cloud-dependent and externally connected. Zuberi is local-only 
and privacy-first. Every feature must be re-architected for that constraint.

---

## Ruflo (ruvnet/ruflo)

**What it is:** An agent orchestration framework with 60+ specialized agent 
profiles, swarm topology, and a multi-layer governance system.

**What's relevant to Zuberi:**

### 1. Specialized Agent Profiles
Ruflo defines agents by role: researcher, coder, reviewer, analyst, writer, etc. 
Each has a tuned system prompt and tool access scoped to its function. A 
coordinator agent decomposes tasks and dispatches to the right specialist.

**Zuberi equivalent:** Multi-Agent Task Dispatch (HORIZON §8). Zuberi decomposes 
tasks, dispatches sub-tasks to OpenClaw skill profiles (not separate model 
instances — one model, different prompting). ccode on CEG is the first real 
sub-agent (coding role). n8n coordinates dispatch and result collection.

**Key difference:** Ruflo runs 60+ agents in parallel across cloud infrastructure. 
Zuberi runs one model on one GPU. Our "agents" are skill profiles and ccode 
dispatches, not separate model instances. Start with 3-5 roles, linear dispatch.

### 2. Guidance Control Plane (7-Layer Gate Enforcement)
Ruflo has a programmatic policy engine that intercepts every agent action and 
validates it against 7 layers of rules before execution. Implemented as 
WASM-compiled policy modules.

**Zuberi equivalent:** Gate Enforcement Layer (HORIZON §8). n8n webhooks sit 
between Zuberi's intent and execution. Before an exec call hits CEG, n8n 
validates against a rule set: no external network calls without approval, no 
writes to protected paths, no spending above thresholds. Violations logged to 
CXDB, James alerted.

**Key difference:** Ruflo uses compiled WASM policy engines for speed. We use 
n8n webhook validation — simpler, slower, but auditable and editable by James 
without compiling anything. Rule set stored as JSON in the workspace.

### 3. Skills Ecosystem
Ruflo has a rich skills library that agents can invoke. Skills are modular, 
discoverable, and composable.

**Zuberi equivalent:** OpenClaw workspace skills. We already have three deployed 
(searxng, cxdb, ollama). The pattern is established — new skills are SKILL.md 
files in the workspace that teach Zuberi how to use a tool. This is the closest 
area of parity today.

---

## Automaton (Conway-Research/automaton)

**What it is:** An autonomous agent system designed for indefinite self-sustaining 
operation. Key innovation: it can modify its own code, manage its own resources, 
and operate in survival modes based on economic conditions.

**What's relevant to Zuberi:**

### 1. Survival Tiers / Operational Modes
Automaton adjusts its behavior based on resource status. When resources are 
abundant, it explores and learns. When resources are scarce, it focuses on 
immediate survival tasks. Multiple tiers with clear rules for each.

**Zuberi equivalent:** Economic Awareness / Operational Modes (HORIZON §8). 
Three modes based on Mission AEGIS progress:
- **Full:** On track — all capabilities active, exploration encouraged
- **Focused:** Behind by 10-20% — revenue tasks prioritized, research shortened
- **Critical:** Behind by 20%+ — revenue only, all capability work paused

Revenue dashboard stored in CXDB, checked by HEARTBEAT, mode injected at 
session start. Zuberi knows the mission state and adjusts behavior accordingly.

**Key difference:** Automaton's survival is literal (it manages cloud compute 
costs and crypto wallets to stay alive). Zuberi's "survival" is mission progress 
toward the $350K target. No crypto, no cloud costs — just revenue tracking.

### 2. Self-Modification with Audit Logging
Automaton can modify its own configuration, prompts, and code. Every modification 
is git-committed with an audit trail. Rate limits prevent runaway changes. A 
"constitution" defines what is and isn't self-modifiable.

**Zuberi equivalent:** Supervised Self-Modification (HORIZON §8). Zuberi can 
PROPOSE changes to its own skills, config, and workspace docs. Changes go through 
an approval workflow:
1. Zuberi identifies improvement opportunity
2. Writes proposal to CXDB as Decision type with rationale
3. James reviews (surfaced via HEARTBEAT or n8n alert)
4. If approved: ccode executes change, git commits with audit message
5. If rejected: rationale recorded for future reference

**Key difference:** Automaton self-modifies autonomously with rate limits. 
Zuberi PROPOSES modifications and waits for James to approve. Protected files 
(SOUL.md core identity, AGENTS.md safety rules) are NEVER self-modifiable under 
any circumstance. Operator approval gate is non-negotiable.

### 3. Constitution Structure
Automaton has a formal "constitution" — a set of inviolable rules that govern 
behavior even during self-modification. The constitution itself cannot be 
modified by the agent.

**Zuberi equivalent:** SOUL.md + AGENTS.md. SOUL.md defines identity and 
philosophy. AGENTS.md defines behavioral rules and security constraints. Both 
are operator-controlled. The SOUL.md Evolution feature (HORIZON §8) envisions 
Zuberi eventually proposing SOUL.md refinements, but only the philosophical 
layer — never the safety rules in AGENTS.md.

---

## Dependency Chain

These features aren't independent. They build on each other:

```
Phase 3A (current):
  CXDB skill wired ──┐
  n8n wired to Zuberi ┤
  ccode auth on CEG ──┘
         │
         ▼
Self-Learning Loop (HIGH priority)
  - CXDB stores task outcomes
  - n8n runs weekly consolidation
  - Patterns promoted to skills/MEMORY.md
         │
         ▼
Economic Awareness (HIGH priority)
  - CXDB stores revenue dashboard
  - HEARTBEAT checks progress
  - Modes injected at session start
  - Requires MISSION-AEGIS.md
         │
         ▼
Gate Enforcement (MEDIUM priority)
  - n8n webhooks validate actions
  - Rule set in workspace JSON
  - Required before self-modification
         │
         ▼
Multi-Agent Dispatch (MEDIUM priority)
  - Skill profiles for each role
  - n8n coordinates dispatch
  - ccode as first sub-agent
         │
         ▼
Supervised Self-Modification (LOW-MEDIUM)
  - Requires learning loop (generates insights)
  - Requires gate enforcement (prevents unauthorized changes)
  - Proposals to CXDB, James approves
         │
         ▼
SOUL.md Evolution (LOW)
  - Requires Practitioner arc
  - Philosophical refinements only
  - Safety rules never self-modifiable
```

---

## Reference Repos (Not Yet Cloned)

The plan is to clone both repos to CEG for architectural study:

```
CEG:/opt/zuberi/reference/
├── ruflo/          — Agent orchestration patterns
│   └── Focus: skills ecosystem, gate enforcement docs, agent profiles
├── automaton/      — Autonomous agent patterns  
│   └── Focus: survival tiers, self-mod audit logging, constitution structure
└── CATALOG.md      — What's useful and how it maps to Zuberi
```

The clone prompt was drafted in Session 4 but never executed. It's on the 
Phase 3A queue. These are reference material only — never operational code 
in Zuberi's runtime.

---

## What This Means For You (Session 5 Architect)

You don't need to build any of this now. The current priority is:
1. Fix the Zuberi app display bug
2. Complete Phase 3A (n8n wiring, ccode auth, validation)
3. Start Mission AEGIS strategy discussion

But when capability work begins, the dependency chain above is the roadmap. 
Self-Learning Loop is the highest-ROI feature — it makes everything else 
compound over time. Start there when Phase 3A is complete and the mission 
strategy is defined.

The HORIZON.md Section 8 in the workspace files has the full detailed 
specifications for each feature. This briefing is the context layer on top.

---
# END BRIEFING
