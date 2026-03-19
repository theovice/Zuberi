# Jehudiel — Structured Learning from Public Content

**Phase Enlightenment Protocol | Status: Active | RTL-066**
**Created:** Session 23 | 2026-03-18

---

## Purpose

Zuberi learns from curated public content — YouTube videos, articles, documentation — and extracts actionable knowledge she can apply to her work. James selects the sources. Zuberi processes them autonomously.

This is not about consuming information for its own sake. Every learning session has a mission context. Zuberi doesn't "watch" content — she deconstructs it into knowledge she can execute on.

---

## The Pipeline

### 1. Source Selection (James)

James identifies a YouTube video, article, or resource relevant to an active mission. He provides Zuberi with:
- The URL
- The mission context (e.g., "This is for Mission Ganesha — learn the n8n automation pattern")
- Optionally: specific questions to answer or skills to extract

### 2. Content Acquisition (Zuberi)

**For YouTube videos:**
- Navigate to the URL using the browser skill
- Trigger the TabAudioRecorder extension to capture audio
- Audio is sent to Whisper on CEG:8200 for transcription
- Raw transcript is saved to workspace: `docs/research/learning/transcripts/YYYY-MM-DD_<slug>.md`

**For articles/documentation:**
- Use web_fetch or SearXNG to retrieve the content
- Save raw content to `docs/research/learning/raw/YYYY-MM-DD_<slug>.md`

### 3. Structured Extraction (Zuberi)

Zuberi processes the raw content through a structured extraction prompt. This is the critical step — she doesn't summarize, she *extracts actionable knowledge*.

**Extraction template:**

```
SOURCE: [title, URL, date]
MISSION CONTEXT: [which mission this serves]
DURATION/LENGTH: [video length or word count]

## Key Claims
- [Factual claims made in the content, stated neutrally]

## Techniques & Patterns
- [Specific methods, workflows, or patterns described]
- [Include tool names, configuration details, step sequences]

## Applicable to Zuberi's Stack
- [Map each technique to Zuberi's actual infrastructure]
- [e.g., "They use Make.com for orchestration → We use n8n on CEG:5678"]
- [Note what we already have vs. what we'd need to build]

## Action Items
- [Concrete next steps that emerge from this content]
- [Each item should be executable — not "learn more about X"]

## Contradictions or Gaps
- [Where the source conflicts with our existing knowledge]
- [Where the source assumes tools/resources we don't have]
- [Where the source is wrong or outdated]

## Confidence Rating
- [How authoritative is this source? First-hand practitioner vs. aggregator vs. speculation?]
```

Extraction is saved to: `docs/research/learning/extractions/YYYY-MM-DD_<slug>.md`

### 4. Integration (Zuberi + James)

After extraction, Zuberi:
- Writes action items to MEMORY.md or CXDB as tasks
- Updates relevant skills if the content taught a new technique
- Reports the extraction summary to James for review

James decides which action items to pursue and when.

---

## Rules

1. **James selects sources.** Zuberi does not independently choose what to learn. This prevents rabbit holes and ensures learning serves the mission.

2. **Extract, don't summarize.** Summaries are useless. Extractions map to Zuberi's stack and produce action items.

3. **Verify before trusting.** Public content is often wrong, outdated, or promotional. The "Contradictions or Gaps" section exists for this reason. Zuberi should cross-reference claims against her own experience and known facts.

4. **One source at a time.** Process each piece of content fully before moving to the next. No batch consumption.

5. **Tag everything to the mission.** Every extraction links back to a specific mission (Ganesha, infrastructure, etc.). No untethered learning.

6. **Honesty about limits.** If Zuberi doesn't understand something in the content, she says so. She doesn't fabricate comprehension. The hard honesty rules apply here — say "I couldn't extract this" rather than guessing.

---

## First Domain: AI Content Automation (Mission Ganesha)

James is curating YouTube channels covering:
- n8n workflow automation for content pipelines
- YouTube SEO and algorithm mechanics (outlier detection, content gap analysis)
- YouTube compliance — "inauthentic content" policy, AI disclosure requirements
- Faceless channel production patterns (scripting, TTS, visual assembly)

These map directly to the `content-gen-revenue-setup` project tagged in Zuberi's memory.

---

## Infrastructure Requirements

- **Whisper on CEG:8200** — ✅ Live (deployed Session 23)
- **TabAudioRecorder extension** — ✅ Updated for CEG:8200 (icons pending verification)
- **Browser skill** — ✅ Available (Kasm sidecar)
- **Learning workspace directories** — ❌ Need to create: `docs/research/learning/transcripts/`, `docs/research/learning/raw/`, `docs/research/learning/extractions/`

---

## Success Criteria

Jehudiel is working when:
- Zuberi can take a YouTube URL, transcribe it, extract actionable knowledge, and produce concrete action items — all without James hand-holding the process
- Extracted knowledge visibly improves Zuberi's execution on mission tasks
- James trusts the extractions enough to make decisions based on them
