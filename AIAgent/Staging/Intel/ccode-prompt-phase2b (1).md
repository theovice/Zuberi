# Ccode Prompt: Phase 2B — Custom Sandbox Image + Vision Skill

## Context
We are building a custom Docker sandbox image for OpenClaw that pre-bakes Python, Node.js, and common libraries so Zuberi can generate xlsx, pdf, docx, charts, and diagrams in sandboxed sessions. We are also creating a vision skill that wraps qwen3-vl:8b via Ollama's API. Both are gateway-level changes on KILO.

OpenClaw config is at: `C:\Users\PLUTO\openclaw_config\openclaw.json`
OpenClaw workspace is at: `C:\Users\PLUTO\openclaw_workspace\`
OpenClaw container name: `openclaw-openclaw-gateway-1`
KILO runs Windows 11 with Docker Desktop.

## Tasks (in order)

### Task 1: Check if base sandbox image exists

```powershell
docker images openclaw-sandbox:bookworm-slim --format "{{.Repository}}:{{.Tag}}"
```

**If the image exists:** proceed to Task 2.

**If the image does NOT exist:** Build it. The base image is just debian:bookworm-slim retagged:

```powershell
docker pull debian:bookworm-slim
docker tag debian:bookworm-slim openclaw-sandbox:bookworm-slim
```

Alternatively, if the OpenClaw source repo exists on KILO, check for `scripts/sandbox-setup.sh` and run it. But the pull+tag approach is equivalent and simpler.

Verify:
```powershell
docker images openclaw-sandbox:bookworm-slim --format "{{.Repository}}:{{.Tag}} {{.Size}}"
```

### Task 2: Create the custom sandbox Dockerfile

Create the file at `C:\Users\PLUTO\openclaw_config\Dockerfile.zuberi-sandbox` with the following content:

```dockerfile
FROM openclaw-sandbox:bookworm-slim

# Avoid interactive prompts during install
ENV DEBIAN_FRONTEND=noninteractive

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 LTS via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Python libraries for document/data generation
RUN pip3 install --no-cache-dir --break-system-packages \
    openpyxl \
    reportlab \
    python-docx \
    matplotlib \
    pandas \
    opencv-python-headless

# Mermaid CLI for diagram generation
RUN npm install -g @mermaid-js/mermaid-cli

# Verify installations
RUN python3 --version && \
    node --version && \
    pnpm --version && \
    pip3 list | grep -E "openpyxl|reportlab|python-docx|matplotlib|pandas|opencv" && \
    mmdc --version

# Reset to non-root user for sandbox security
# OpenClaw sandbox default user is 1000:1000
USER 1000:1000
```

### Task 3: Build the custom sandbox image

```powershell
cd C:\Users\PLUTO\openclaw_config
docker build -t zuberi-sandbox:latest -f Dockerfile.zuberi-sandbox .
```

This will take a few minutes (downloading Node.js, Python packages, Mermaid CLI). Watch for errors.

**If the build fails on Mermaid CLI** (it requires Chromium/Puppeteer which can be heavy), fall back to removing the `@mermaid-js/mermaid-cli` line and rebuild. Mermaid is nice-to-have, not critical. The Python libs are the priority.

**If the build fails on opencv-python-headless** (can be large), that's also deferrable — it's only needed for video keyframe extraction which is a future capability.

Verify the image built successfully:
```powershell
docker images zuberi-sandbox:latest --format "{{.Repository}}:{{.Tag}} {{.Size}}"
```

Then verify the tools are present:
```powershell
docker run --rm zuberi-sandbox:latest python3 -c "import openpyxl, reportlab, docx, matplotlib, pandas; print('All Python libs OK')"
docker run --rm zuberi-sandbox:latest node -e "console.log('Node.js OK:', process.version)"
```

### Task 4: Update openclaw.json — set custom sandbox image

Open `C:\Users\PLUTO\openclaw_config\openclaw.json`.

Find the sandbox docker image setting. It will be somewhere in the `agents.defaults.sandbox.docker` section. The current value should be:
```
"image": "openclaw-sandbox:bookworm-slim"
```

Change it to:
```
"image": "zuberi-sandbox:latest"
```

**Do not change any other sandbox settings** (mode, scope, network, readOnlyRoot, etc.). Only the image name changes.

If there is no explicit `image` key in the sandbox config, add it:
```json
"docker": {
  "image": "zuberi-sandbox:latest"
}
```

### Task 5: Create the vision skill

Create the file `C:\Users\PLUTO\openclaw_workspace\skills\vision\SKILL.md` with the following content:

```markdown
---
name: vision
description: Analyze images using qwen3-vl:8b vision model. Use when the user shares an image, screenshot, document scan, or asks you to look at, read, describe, or extract information from a visual.
---

# Vision Analysis (qwen3-vl:8b)

Analyze images using the qwen3-vl:8b vision model via Ollama on KILO.
This triggers a model swap on the GPU (~3-5 seconds).

## When to use

- User shares an image or screenshot and asks about its contents
- User asks to extract text (OCR) from an image or document
- User asks to describe what's in a photo
- User asks to parse a chart, table, or diagram from an image
- User asks to analyze a UI screenshot
- You need to read a scanned document or invoice

## How to analyze an image

### Step 1: Base64-encode the image

If the image is at a workspace path:
```bash
base64 -w 0 /path/to/image.png
```

Store the output in a variable or pipe it directly.

### Step 2: Send to the vision model

```bash
curl -s http://host.docker.internal:11434/api/chat -d '{
  "model": "qwen3-vl:8b",
  "messages": [{
    "role": "user",
    "content": "PROMPT_HERE",
    "images": ["BASE64_HERE"]
  }],
  "stream": false,
  "options": {"num_predict": 2048}
}'
```

Replace PROMPT_HERE with your analysis instruction and BASE64_HERE with the
base64-encoded image data.

### Step 3: Reload primary model (optional)

After vision analysis, the primary model (qwen3:14b-fast) will auto-reload
on the next message. To force an immediate reload:
```bash
curl -s http://host.docker.internal:11434/api/generate -d '{"model":"qwen3:14b-fast","prompt":"hi","stream":false,"keep_alive":"24h"}'
```

## Prompt examples

**OCR / text extraction:**
```
Extract all visible text from this image. Return as plain text, preserving layout where possible.
```

**Chart/table parsing:**
```
Parse this chart/table into structured JSON. Include all data points, labels, and values.
```

**UI analysis:**
```
Describe all UI elements visible in this screenshot. List buttons, text fields, labels, and their approximate positions.
```

**Document understanding:**
```
Read this document/invoice. Extract: date, sender, recipient, line items with amounts, and total.
```

**General description:**
```
Describe what you see in this image in detail.
```

## GPU behavior

- qwen3-vl:8b is 5.7GB — fits in RTX 5070 Ti 16GB VRAM
- Sending a vision request causes Ollama to swap from qwen3:14b-fast (~3-5s)
- After vision task completes, qwen3:14b-fast auto-reloads on next message
- For batch vision tasks, keep qwen3-vl:8b loaded to avoid repeated swaps

## Important

- The vision model is at http://host.docker.internal:11434 (Ollama on KILO)
- Always summarize vision results for James — do not dump raw model output
- For large images, the base64 string will be very long — this is normal
- qwen3-vl:8b supports 32 languages for OCR including low-light and blurred text
- No jq — parse responses with grep/sed if needed
- If Ollama returns an error, check that qwen3-vl:8b is pulled: `curl -s http://host.docker.internal:11434/api/tags`
```

### Task 6: Update TOOLS.md — add Vision to Quick Tool Commands

Open `C:\Users\PLUTO\openclaw_workspace\TOOLS.md`.

**6a.** In the Quick Tool Commands section, find the last existing Quick Tool Commands block. This will be either the "Workflow Automation (n8n on CEG)" block if it exists, or the "Model Management (Ollama on KILO)" block. Insert the following **after** whichever is the last block, and **before** the "For detailed skill instructions" line:

```
### Vision Analysis (qwen3-vl:8b on KILO)
```bash
# Analyze an image (replace BASE64 with encoded image data):
curl -s http://host.docker.internal:11434/api/chat -d '{"model":"qwen3-vl:8b","messages":[{"role":"user","content":"Describe this image","images":["BASE64"]}],"stream":false}'
```
Triggers model swap (~3-5s). Primary model auto-reloads on next message.
```

**6b.** Update the skill reference line. Find the line that starts with:
```
For detailed skill instructions, read:
```

Append `, `skills/vision/SKILL.md`` to the end of that line (after whichever skill is currently last). The result should end with `skills/vision/SKILL.md`.

**6c.** Update the Model Inventory table. Find the line:
```
RTX 5070 Ti: 16GB VRAM. One large model at a time. Models at E:\ollama\models.
```

Replace with:
```
RTX 5070 Ti: 16GB VRAM. One large model at a time. Models at E:\ollama\models.
Vision tasks swap to qwen3-vl:8b (~3-5s), primary model auto-reloads after.
```

**6d.** Update the version. Read the current version number at the top of TOOLS.md. Increment the minor version by one (e.g., 0.8.0 → 0.8.1, or 0.8.1 → 0.9.0). Update the version history table with the new version:
```
| NEW_VERSION | 2026-03-02 | Phase 2B: Custom sandbox image (zuberi-sandbox:latest) configured. Vision skill added with Quick Tool Commands. |
```

### Task 7: Update INFRASTRUCTURE.md — document sandbox image

Open `C:\Users\PLUTO\openclaw_workspace\INFRASTRUCTURE.md`.

In the OpenClaw Configuration Summary section, find:
```
  sandbox.mode:         non-main (webchat runs on gateway, others sandboxed)
```

After this line, add:
```
  sandbox.docker.image: zuberi-sandbox:latest (Python 3, Node 22, openpyxl, reportlab, python-docx, matplotlib, pandas, pnpm)
```

Update the version history with a new row. Read the current version number and increment the patch version:
```
| NEW_VERSION | 2026-03-02 | Phase 2B: Custom sandbox image documented (zuberi-sandbox:latest). Vision skill noted. |
```

And bump the version at the top to match.

### Task 8: Restart OpenClaw to pick up new sandbox image config

**IMPORTANT:** Restarting OpenClaw drops active sessions. Confirm this is acceptable.

```powershell
docker restart openclaw-openclaw-gateway-1
```

Wait 10 seconds, then verify it's running:
```powershell
docker ps --filter name=openclaw --format "{{.Names}}: {{.Status}}"
```

### Task 9: End-to-end tests

**Test A — Sandbox Python libs (from OpenClaw webchat or test session):**

This tests that the custom sandbox image is being used. From a non-main session (or test), Zuberi should be able to run:
```python
import openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws['A1'] = 'Test'
wb.save('/workspace/test.xlsx')
print('xlsx created successfully')
```

If this works, C5, C8, and C15 are unlocked.

**Test B — Vision skill (from gateway-level webchat):**

Run this from inside the OpenClaw container to test the vision API:
```powershell
docker exec openclaw-openclaw-gateway-1 curl -s http://host.docker.internal:11434/api/chat -d "{\"model\":\"qwen3-vl:8b\",\"messages\":[{\"role\":\"user\",\"content\":\"What model are you?\"}],\"stream\":false}"
```

This doesn't test an actual image but confirms the model loads and responds. A proper image test requires base64 data which is too large for a command line test.

**Test C — Verify vision model is available:**
```powershell
docker exec openclaw-openclaw-gateway-1 curl -s http://host.docker.internal:11434/api/tags
```

Confirm `qwen3-vl:8b` appears in the model list.

### Task 10: Sync updated workspace files to OneDrive Intel folder

Copy the updated TOOLS.md and INFRASTRUCTURE.md to the Intel folder:
```powershell
Copy-Item "C:\Users\PLUTO\openclaw_workspace\TOOLS.md" "C:\Users\PLUTO\OneDrive\Documents\AIAgent\Intel\TOOLS.md" -Force
Copy-Item "C:\Users\PLUTO\openclaw_workspace\INFRASTRUCTURE.md" "C:\Users\PLUTO\OneDrive\Documents\AIAgent\Intel\INFRASTRUCTURE.md" -Force
```

## Important notes
- Do NOT use jq anywhere.
- Do NOT modify AGENTS.md or SOUL.md.
- The Dockerfile build needs internet access (downloading packages). Docker Desktop on KILO should have this by default.
- If Mermaid CLI fails to install (Chromium dependency issues on slim Debian), remove it from the Dockerfile and rebuild. It's nice-to-have, not critical.
- If opencv-python-headless fails (large binary wheel), remove it too. It's only needed for future video keyframe extraction.
- The sandbox image change only affects non-main sessions (sandbox mode is "non-main"). Webchat continues to run at gateway level with elevated exec.
- TOOLS.md and INFRASTRUCTURE.md updates are explicitly authorized by James via the architect session.
