# Ccode Prompt: RTL-012 — Ccode Auth on CEG + Usage Tracking Backend

## Context
Zuberi needs ccode (Claude Code CLI) on CEG as a sub-agent for code execution. This requires an Anthropic API key. James also requires usage tracking before handing Zuberi an API key — every API call must be logged with token counts and cost, queryable via a REST endpoint that the ZuberiChat desktop app will consume.

CEG: 100.100.101.1 (Tailscale only, Ubuntu Server)
SSH: `ssh -i ~/.ssh/id_ed25519 ceg@100.100.101.1`
CXDB: http://100.100.101.1:9010 (REST API)
Data root: /opt/zuberi/data/
Docker compose: /opt/zuberi/docker/docker-compose.yml

Kill any existing pnpm tauri dev process before starting work.

## Task 1: Install Claude Code CLI on CEG

SSH into CEG and install ccode:

```bash
ssh ceg "curl -fsSL https://claude.ai/install.sh | sh"
```

Verify installation:
```bash
ssh ceg "claude --version"
```

## Task 2: Authenticate ccode with API key

James will provide the API key. Set it as an environment variable on CEG:

```bash
ssh ceg "mkdir -p ~/.config/claude && echo 'ANTHROPIC_API_KEY=API_KEY_HERE' >> ~/.bashrc"
```

Then authenticate:
```bash
ssh ceg "claude auth login --method api-key"
```

Verify authentication works:
```bash
ssh ceg "claude -p 'Reply with only the word VERIFIED' --output-format json --max-turns 1"
```

If successful, the response JSON should contain "VERIFIED". Report the exact output.

## Task 3: Set spending limits

On platform.claude.com (James does this manually), set:
- Monthly spend limit: $20
- Alert at: $15

Report to James that this needs to be done in the console UI — ccode cannot set this programmatically.

## Task 4: Create CXDB context for usage tracking

Create a dedicated CXDB context for API usage logs:

```bash
curl -s -X POST "http://100.100.101.1:9010/v1/contexts" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"name":"zuberi-api-usage","description":"API usage tracking for ccode dispatches"}}'
```

Note the context ID returned — it will be needed in Task 5.

## Task 5: Create the usage tracker service on CEG

Create a lightweight Node.js service that:
1. Logs API usage events to CXDB
2. Exposes a REST API for querying aggregated usage stats
3. Runs on port 3002 on CEG (Tailscale only)

### 5a. Create project directory:
```bash
ssh ceg "mkdir -p /opt/zuberi/data/usage-tracker && cd /opt/zuberi/data/usage-tracker && npm init -y"
```

### 5b. Create the service file:

Create `/opt/zuberi/data/usage-tracker/server.js` with this content:

```javascript
const http = require('http');
const fs = require('fs');

const PORT = 3002;
const CXDB_URL = 'http://100.100.101.1:9010';
const DATA_FILE = '/opt/zuberi/data/usage-tracker/usage.json';

// Initialize data file if missing
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [] }));
}

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).events;
  } catch { return []; }
}

function writeEvent(event) {
  const data = { events: readEvents() };
  data.events.push(event);
  // Keep last 10000 events max
  if (data.events.length > 10000) data.events = data.events.slice(-10000);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

function aggregateUsage(events, windowMs) {
  const cutoff = Date.now() - windowMs;
  const filtered = events.filter(e => e.timestamp > cutoff);
  return {
    total_events: filtered.length,
    total_input_tokens: filtered.reduce((s, e) => s + (e.input_tokens || 0), 0),
    total_output_tokens: filtered.reduce((s, e) => s + (e.output_tokens || 0), 0),
    total_cost_usd: filtered.reduce((s, e) => s + (e.cost_usd || 0), 0),
    window_start: new Date(cutoff).toISOString(),
    window_end: new Date().toISOString(),
    by_model: filtered.reduce((acc, e) => {
      const m = e.model || 'unknown';
      if (!acc[m]) acc[m] = { events: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      acc[m].events++;
      acc[m].input_tokens += e.input_tokens || 0;
      acc[m].output_tokens += e.output_tokens || 0;
      acc[m].cost_usd += e.cost_usd || 0;
      return acc;
    }, {})
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // POST /log — record a usage event
  if (req.method === 'POST' && url.pathname === '/log') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        event.timestamp = Date.now();
        writeEvent(event);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // GET /stats/5h — 5-hour rolling window
  if (req.method === 'GET' && url.pathname === '/stats/5h') {
    const events = readEvents();
    const stats = aggregateUsage(events, 5 * 60 * 60 * 1000);
    res.writeHead(200);
    res.end(JSON.stringify(stats));
    return;
  }

  // GET /stats/week — 7-day rolling window
  if (req.method === 'GET' && url.pathname === '/stats/week') {
    const events = readEvents();
    const stats = aggregateUsage(events, 7 * 24 * 60 * 60 * 1000);
    res.writeHead(200);
    res.end(JSON.stringify(stats));
    return;
  }

  // GET /stats/month — 30-day rolling window
  if (req.method === 'GET' && url.pathname === '/stats/month') {
    const events = readEvents();
    const stats = aggregateUsage(events, 30 * 24 * 60 * 60 * 1000);
    res.writeHead(200);
    res.end(JSON.stringify(stats));
    return;
  }

  // GET /health — health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', events_stored: readEvents().length }));
    return;
  }

  // GET /limits — spending limits (manually configured)
  if (req.method === 'GET' && url.pathname === '/limits') {
    const limits = {
      monthly_limit_usd: 20.00,
      alert_threshold_usd: 15.00,
      daily_soft_cap_usd: 2.00,
      per_dispatch_estimate_usd: 0.10
    };
    const events = readEvents();
    const monthStats = aggregateUsage(events, 30 * 24 * 60 * 60 * 1000);
    limits.monthly_spent_usd = monthStats.total_cost_usd;
    limits.monthly_remaining_usd = limits.monthly_limit_usd - monthStats.total_cost_usd;
    limits.percent_used = Math.round((monthStats.total_cost_usd / limits.monthly_limit_usd) * 100);
    res.writeHead(200);
    res.end(JSON.stringify(limits));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '100.100.101.1', () => {
  console.log(`Usage tracker listening on 100.100.101.1:${PORT}`);
});
```

### 5c. Create systemd service:

Create `/etc/systemd/system/zuberi-usage-tracker.service`:

```ini
[Unit]
Description=Zuberi API Usage Tracker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ceg
WorkingDirectory=/opt/zuberi/data/usage-tracker
ExecStart=/usr/bin/node /opt/zuberi/data/usage-tracker/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
ssh ceg "sudo systemctl daemon-reload && sudo systemctl enable zuberi-usage-tracker && sudo systemctl start zuberi-usage-tracker"
```

### 5d. Allow port 3002 through UFW:
```bash
ssh ceg "sudo ufw allow in on tailscale0 to any port 3002"
```

## Task 6: Create ccode dispatch wrapper

Create a wrapper script on CEG that logs usage after every ccode dispatch:

Create `/opt/zuberi/scripts/ccode-dispatch.sh`:

```bash
#!/bin/bash
# Ccode dispatch wrapper with usage logging
# Usage: ccode-dispatch.sh <project-dir> "<task-prompt>" [max-turns]

PROJECT_DIR="${1:-.}"
TASK="${2:-help}"
MAX_TURNS="${3:-5}"
USAGE_URL="http://100.100.101.1:3002/log"

# Run ccode and capture output
START_TIME=$(date +%s%N)
OUTPUT=$(cd "$PROJECT_DIR" && claude -p "$TASK" --output-format json --max-turns "$MAX_TURNS" --allowedTools Read,Write,Bash 2>&1)
END_TIME=$(date +%s%N)
DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

# Extract token counts from output (best effort — format may vary)
INPUT_TOKENS=$(echo "$OUTPUT" | grep -oP '"input_tokens"\s*:\s*\K[0-9]+' | head -1)
OUTPUT_TOKENS=$(echo "$OUTPUT" | grep -oP '"output_tokens"\s*:\s*\K[0-9]+' | head -1)
MODEL=$(echo "$OUTPUT" | grep -oP '"model"\s*:\s*"\K[^"]+' | head -1)

INPUT_TOKENS=${INPUT_TOKENS:-0}
OUTPUT_TOKENS=${OUTPUT_TOKENS:-0}
MODEL=${MODEL:-"claude-sonnet-4-5-20250929"}

# Estimate cost (Sonnet rates: $3/M input, $15/M output)
COST=$(echo "scale=6; ($INPUT_TOKENS * 0.000003) + ($OUTPUT_TOKENS * 0.000015)" | bc 2>/dev/null || echo "0")

# Log to usage tracker
curl -s -X POST "$USAGE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"input_tokens\": $INPUT_TOKENS,
    \"output_tokens\": $OUTPUT_TOKENS,
    \"cost_usd\": $COST,
    \"duration_ms\": $DURATION_MS,
    \"task\": \"$(echo "$TASK" | head -c 200 | sed 's/"/\\"/g')\",
    \"project\": \"$(basename "$PROJECT_DIR")\"
  }" > /dev/null 2>&1

# Output the original ccode response
echo "$OUTPUT"
```

Make executable:
```bash
ssh ceg "chmod +x /opt/zuberi/scripts/ccode-dispatch.sh"
```

## Task 7: Verify the full pipeline

### 7a. Check usage tracker is running:
```bash
curl -s http://100.100.101.1:3002/health
```

### 7b. Log a test event:
```bash
curl -s -X POST http://100.100.101.1:3002/log \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","input_tokens":1500,"output_tokens":500,"cost_usd":0.012,"task":"test event","project":"test"}'
```

### 7c. Query stats:
```bash
curl -s http://100.100.101.1:3002/stats/5h
curl -s http://100.100.101.1:3002/stats/week
curl -s http://100.100.101.1:3002/limits
```

### 7d. Test the dispatch wrapper (only if ccode auth succeeded in Task 2):
```bash
ssh ceg "/opt/zuberi/scripts/ccode-dispatch.sh /opt/zuberi/projects 'Reply with only the word VERIFIED' 1"
```

Then check it was logged:
```bash
curl -s http://100.100.101.1:3002/stats/5h
```

Report all results.

## Task 8: Update workspace files

### 8a. Update TOOLS.md

Add a new Quick Tool Command section after the Model Management section:

```markdown
### API Usage Tracking (CEG)
```bash
# Check usage stats:
curl -s http://100.100.101.1:3002/stats/5h    # 5-hour window
curl -s http://100.100.101.1:3002/stats/week   # 7-day window
curl -s http://100.100.101.1:3002/limits       # Monthly limits + remaining
```
```

Update the Sub-Agent: CEG-Ccode section. Change the dispatch pattern to use the wrapper:
```bash
ssh ceg "/opt/zuberi/scripts/ccode-dispatch.sh /opt/zuberi/projects/<project> '<task>' 5"
```

Change "Not available until ccode authenticated on CEG (headless auth TBD)" to "Active — dispatches logged to usage tracker on CEG:3002".

Increment TOOLS.md version to v0.8.3 and add version history entry.

### 8b. Update AGENTS.md

In the Sub-Agents section, change:
"Not available until ccode authenticated on CEG (headless auth TBD)"
to:
"Active. All dispatches logged to usage tracker (CEG:3002). Monthly limit: $20."

Add to MUST CONFIRM list:
"- Ccode dispatches exceeding $1.00 estimated cost"

## Important notes
- Do NOT use jq anywhere.
- Do NOT store the API key in any workspace file, skill file, or committed code.
- The usage tracker binds to 100.100.101.1 (Tailscale only) — not 0.0.0.0.
- The dispatch wrapper estimates cost using Sonnet rates. Adjust if a different model is used.
- The $20 monthly limit is enforced at platform.claude.com, not locally. The local tracker is for visibility only.
- bc may need to be installed on CEG: `sudo apt install -y bc`
