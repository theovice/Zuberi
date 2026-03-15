# tldraw Mural — Build Guide
**For:** James + Zuberi
**Verifier:** Gemini (or any external agent)
**Target:** Shared visual collaboration canvas on CEG:3004
**License:** tldraw is Apache 2.0

---

## What We're Building

A shared infinite canvas ("mural") where:
- **James** opens a browser to `http://100.100.101.1:3004`, draws, annotates, rearranges
- **Zuberi** reads and writes to the canvas programmatically via API — creates diagrams, lays out plans, adds notes
- Canvas state persists to disk on CEG at `/opt/zuberi/data/tldraw/`
- Multiple named canvases (boards) supported

---

## Architecture

```
┌─────────────┐         ┌──────────────────────────────┐
│ James       │         │ CEG :3004                    │
│ (Browser)   │◄───────►│ tldraw Server                │
└─────────────┘   HTTP  │   ├── React frontend (tldraw)│
                        │   ├── Express API backend     │
┌─────────────┐         │   ├── REST API for Zuberi     │
│ Zuberi      │         │   └── Disk persistence        │
│ (exec/curl) │◄───────►│       /opt/zuberi/data/tldraw/│
└─────────────┘   HTTP  └──────────────────────────────┘
```

Zuberi interacts via curl through her exec tool. A workspace skill teaches her the API.

---

## Prerequisites

- CEG online and reachable via Tailscale (100.100.101.1)
- Node.js installed on CEG (check: `node --version`)
- Port 3004 not in use (check: `ss -tlnp | grep 3004`)
- `/opt/zuberi/data/` directory exists

---

## Phase 1: Install tldraw Server on CEG

### Checkpoint 1A — Project Setup

**Goal:** Create the project directory and initialize Node.js project.

```bash
ssh ceg
mkdir -p /opt/zuberi/tldraw
cd /opt/zuberi/tldraw
npm init -y
```

**Verify:** `cat /opt/zuberi/tldraw/package.json` shows a valid package.json.

### Checkpoint 1B — Install Dependencies

**Goal:** Install tldraw and server dependencies.

```bash
cd /opt/zuberi/tldraw
npm install tldraw @tldraw/store @tldraw/tlschema
npm install express cors
npm install vite @vitejs/plugin-react react react-dom
npm install -D @types/react @types/react-dom
```

**Verify:** `ls node_modules/tldraw` exists. `ls node_modules/express` exists.

**Note:** If CEG doesn't have enough memory for the full install, try with `--max-old-space-size=512` or install packages in smaller batches.

### Checkpoint 1C — Create the Backend (Express API)

**Goal:** Build an Express server that serves the tldraw frontend and exposes a REST API for Zuberi.

Create file: `/opt/zuberi/tldraw/server.js`

```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3004;
const BIND = '0.0.0.0'; // Accessible over Tailscale
const DATA_DIR = '/opt/zuberi/data/tldraw';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Board Management ---

// List all boards
app.get('/api/boards', (req, res) => {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(DATA_DIR, f));
      return {
        name: f.replace('.json', ''),
        modified: stat.mtime.toISOString(),
        size: stat.size
      };
    });
  res.json({ boards: files });
});

// Get board snapshot (full state)
app.get('/api/boards/:name', (req, res) => {
  const filepath = path.join(DATA_DIR, `${req.params.name}.json`);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  res.json(data);
});

// Save board snapshot (full state)
app.put('/api/boards/:name', (req, res) => {
  const filepath = path.join(DATA_DIR, `${req.params.name}.json`);
  fs.writeFileSync(filepath, JSON.stringify(req.body, null, 2));
  res.json({ ok: true, name: req.params.name });
});

// Delete a board
app.delete('/api/boards/:name', (req, res) => {
  const filepath = path.join(DATA_DIR, `${req.params.name}.json`);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
  res.json({ ok: true, deleted: req.params.name });
});

// --- Shape Operations (Zuberi's primary interface) ---

// Add shapes to a board
app.post('/api/boards/:name/shapes', (req, res) => {
  const filepath = path.join(DATA_DIR, `${req.params.name}.json`);
  let data = { shapes: {}, bindings: {} };
  if (fs.existsSync(filepath)) {
    data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }
  
  const shapes = req.body.shapes || [];
  for (const shape of shapes) {
    if (!shape.id) {
      shape.id = `shape:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    data.shapes[shape.id] = shape;
  }
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  res.json({ ok: true, added: shapes.length, ids: shapes.map(s => s.id) });
});

// Get all shapes from a board
app.get('/api/boards/:name/shapes', (req, res) => {
  const filepath = path.join(DATA_DIR, `${req.params.name}.json`);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  res.json({ shapes: Object.values(data.shapes || {}) });
});

// Delete a shape
app.delete('/api/boards/:name/shapes/:shapeId', (req, res) => {
  const filepath = path.join(DATA_DIR, `${req.params.name}.json`);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Board not found' });
  }
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const shapeId = req.params.shapeId;
  if (data.shapes && data.shapes[shapeId]) {
    delete data.shapes[shapeId];
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    res.json({ ok: true, deleted: shapeId });
  } else {
    res.status(404).json({ error: 'Shape not found' });
  }
});

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tldraw-mural', port: PORT });
});

app.listen(PORT, BIND, () => {
  console.log(`tldraw-mural API listening on ${BIND}:${PORT}`);
});
```

**Verify:** 
```bash
cd /opt/zuberi/tldraw && node server.js &
curl http://127.0.0.1:3004/api/health
```
Should return `{"status":"ok","service":"tldraw-mural","port":3004}`. Kill the background process after testing.

### Checkpoint 1D — Create the Frontend

**Goal:** Build a React app that renders tldraw and syncs with the backend.

Create file: `/opt/zuberi/tldraw/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zuberi Mural</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

Create directory: `mkdir -p /opt/zuberi/tldraw/src`

Create file: `/opt/zuberi/tldraw/src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

Create file: `/opt/zuberi/tldraw/src/App.jsx`

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

const API_BASE = window.location.origin;

function BoardSelector({ boards, current, onSelect, onNew }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, zIndex: 1000,
      background: '#1d1d1d', borderRadius: 8, padding: '8px 12px',
      display: 'flex', gap: 8, alignItems: 'center', color: '#fff',
      fontSize: 13, fontFamily: 'sans-serif'
    }}>
      <select
        value={current || ''}
        onChange={e => onSelect(e.target.value)}
        style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px' }}
      >
        <option value="" disabled>Select board...</option>
        {boards.map(b => (
          <option key={b.name} value={b.name}>{b.name}</option>
        ))}
      </select>
      <button
        onClick={onNew}
        style={{ background: '#4a7dff', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
      >
        + New
      </button>
    </div>
  );
}

export default function App() {
  const [boards, setBoards] = useState([]);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [editor, setEditor] = useState(null);

  // Load board list
  const refreshBoards = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/boards`);
    const data = await res.json();
    setBoards(data.boards || []);
  }, []);

  useEffect(() => { refreshBoards(); }, [refreshBoards]);

  // Load board content into editor
  useEffect(() => {
    if (!editor || !currentBoard) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/boards/${currentBoard}`);
        if (res.ok) {
          const data = await res.json();
          // Load shapes into tldraw store
          if (data.shapes) {
            const shapesArray = Object.values(data.shapes);
            if (shapesArray.length > 0) {
              editor.store.mergeRemoteChanges(() => {
                for (const shape of shapesArray) {
                  editor.store.put([shape]);
                }
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to load board:', e);
      }
    })();
  }, [editor, currentBoard]);

  // Auto-save on changes
  useEffect(() => {
    if (!editor || !currentBoard) return;
    let timeout;
    const unsub = editor.store.listen(() => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const snapshot = editor.store.getSnapshot('document');
        const shapes = {};
        for (const [id, record] of Object.entries(snapshot.store)) {
          if (record.typeName === 'shape') {
            shapes[id] = record;
          }
        }
        await fetch(`${API_BASE}/api/boards/${currentBoard}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shapes })
        });
      }, 1500); // Debounce 1.5s
    }, { scope: 'document', source: 'user' });
    return () => { unsub(); clearTimeout(timeout); };
  }, [editor, currentBoard]);

  const handleNewBoard = async () => {
    const name = prompt('Board name:');
    if (!name) return;
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    await fetch(`${API_BASE}/api/boards/${sanitized}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shapes: {}, bindings: {} })
    });
    await refreshBoards();
    setCurrentBoard(sanitized);
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <BoardSelector
        boards={boards}
        current={currentBoard}
        onSelect={setCurrentBoard}
        onNew={handleNewBoard}
      />
      <Tldraw
        onMount={setEditor}
        autoFocus
      />
    </div>
  );
}
```

Create file: `/opt/zuberi/tldraw/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3004'
    }
  },
  build: {
    outDir: 'dist'
  }
});
```

**Verify:** All four files exist:
```bash
ls -la /opt/zuberi/tldraw/index.html /opt/zuberi/tldraw/src/main.jsx /opt/zuberi/tldraw/src/App.jsx /opt/zuberi/tldraw/vite.config.js
```

---

## Phase 2: Build, Deploy, and Run

### Checkpoint 2A — Build the Frontend

**Goal:** Compile the React app into static files the Express server can serve.

```bash
cd /opt/zuberi/tldraw
npx vite build
```

**Verify:** `ls /opt/zuberi/tldraw/dist/index.html` exists.

### Checkpoint 2B — Add Static Serving to Express

**Goal:** Make the Express server serve the built frontend.

Add this line to `server.js` BEFORE the `app.listen()` call:

```javascript
// Serve built frontend
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

**Verify:** Start the server and open `http://100.100.101.1:3004` in a browser. You should see the tldraw canvas with a board selector in the top left.

### Checkpoint 2C — Create systemd Service

**Goal:** Keep the server running across reboots.

Create file: `/home/ceg/.config/systemd/user/tldraw-mural.service`

```ini
[Unit]
Description=Zuberi Mural (tldraw)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/zuberi/tldraw
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable tldraw-mural.service
systemctl --user start tldraw-mural.service
systemctl --user status tldraw-mural.service
```

**Verify:** `curl http://127.0.0.1:3004/api/health` returns ok. Service shows `active (running)`.

### Checkpoint 2D — Verify Browser Access

**Goal:** Confirm James can access the mural from KILO.

1. Open browser on KILO
2. Navigate to `http://100.100.101.1:3004`
3. Click "+ New", name a board "test"
4. Draw something on the canvas
5. Refresh the page — your drawing should persist

**Verify:** Drawing survived refresh. Board "test" appears in selector.

---

## Phase 3: Zuberi's Skill

### Checkpoint 3A — Create the Workspace Skill

**Goal:** Give Zuberi a skill that teaches her the tldraw API.

Create file: `C:\Users\PLUTO\openclaw_workspace\skills\tldraw-mural\SKILL.md`

```yaml
---
name: tldraw-mural
description: "When Zuberi needs to create, view, or edit visual boards and diagrams on the shared mural canvas. Covers the tldraw collaboration space on CEG:3004 — creating boards, adding shapes (rectangles, text, arrows, notes, circles), reading board contents, and deleting shapes. Use for any visual planning, diagramming, brainstorming, or collaborative whiteboard task. Also use when James mentions 'mural', 'canvas', 'whiteboard', 'diagram', or 'draw'."
---

# tldraw Mural — Zuberi's Visual Collaboration Space

A shared infinite canvas at `http://100.100.101.1:3004`. James sees it in his browser. You interact via the REST API using exec + curl.

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| List boards | GET | /api/boards |
| Get board | GET | /api/boards/{name} |
| Create/save board | PUT | /api/boards/{name} |
| Delete board | DELETE | /api/boards/{name} |
| Add shapes | POST | /api/boards/{name}/shapes |
| Get shapes | GET | /api/boards/{name}/shapes |
| Delete shape | DELETE | /api/boards/{name}/shapes/{id} |
| Health check | GET | /api/health |

## Base URL

`http://100.100.101.1:3004`

## Creating Shapes

POST to `/api/boards/{name}/shapes` with a JSON body. The `id` is auto-generated if omitted.

### Shape Types

**Text note (sticky note):**
```json
{
  "shapes": [{
    "type": "note",
    "x": 100,
    "y": 100,
    "props": {
      "text": "Your text here",
      "color": "yellow",
      "size": "m"
    }
  }]
}
```
Colors: yellow, blue, green, red, orange, violet, grey

**Rectangle:**
```json
{
  "shapes": [{
    "type": "geo",
    "x": 200,
    "y": 200,
    "props": {
      "geo": "rectangle",
      "w": 200,
      "h": 100,
      "text": "Label",
      "color": "blue",
      "fill": "semi"
    }
  }]
}
```
Geo types: rectangle, ellipse, diamond, pentagon, hexagon, star, cloud, arrow-right, arrow-left, arrow-up, arrow-down
Fill: none, semi, solid, pattern

**Text:**
```json
{
  "shapes": [{
    "type": "text",
    "x": 300,
    "y": 50,
    "props": {
      "text": "Title text",
      "size": "xl",
      "color": "black"
    }
  }]
}
```
Sizes: s, m, l, xl

**Arrow (connection):**
```json
{
  "shapes": [{
    "type": "arrow",
    "x": 0,
    "y": 0,
    "props": {
      "start": { "x": 100, "y": 100 },
      "end": { "x": 300, "y": 200 },
      "color": "grey",
      "text": "connects to"
    }
  }]
}
```

## Layout Patterns

When creating diagrams, use a grid system:
- Standard gap: 50px between shapes
- Column width: 220px
- Row height: 150px
- Start position: x=100, y=100

Example — 3-column layout:
- Column 1: x=100
- Column 2: x=370
- Column 3: x=640

## Reading a Board

GET `/api/boards/{name}/shapes` returns all shapes. Parse the response to understand what James has drawn or annotated. Look at `props.text` for written content and `x`/`y` for spatial layout.

## Workflow

1. Before drawing, check if the board exists: GET /api/boards
2. If it doesn't exist, create it: PUT /api/boards/{name} with `{"shapes":{},"bindings":{}}`
3. Add shapes: POST /api/boards/{name}/shapes
4. Tell James the board is ready: "I've updated the {name} board — take a look at http://100.100.101.1:3004"

## Curl Examples

List boards:
exec: curl -s http://100.100.101.1:3004/api/boards

Create a board:
exec: curl -s -X PUT -H 'Content-Type: application/json' -d '{"shapes":{},"bindings":{}}' http://100.100.101.1:3004/api/boards/mission-ganesha

Add a sticky note:
exec: curl -s -X POST -H 'Content-Type: application/json' -d '{"shapes":[{"type":"note","x":100,"y":100,"props":{"text":"Revenue target: $25K/month","color":"yellow","size":"m"}}]}' http://100.100.101.1:3004/api/boards/mission-ganesha/shapes

Read board contents:
exec: curl -s http://100.100.101.1:3004/api/boards/mission-ganesha/shapes
```

**Verify:** Skill file exists and has valid YAML frontmatter. OpenClaw's chokidar watcher picks it up automatically — no restart needed.

### Checkpoint 3B — Test Zuberi's Access

**Goal:** Verify Zuberi can interact with the mural.

Tell Zuberi:
> "Check the health of the tldraw mural service on CEG:3004, then create a board called 'test-board' and add a yellow sticky note that says 'Hello from Zuberi'."

**Verify:**
1. Zuberi loads the tldraw-mural skill
2. Zuberi runs the curl commands via exec
3. Open `http://100.100.101.1:3004` in browser, select "test-board"
4. Yellow sticky note appears with "Hello from Zuberi"

### Checkpoint 3C — Test Bidirectional

**Goal:** Confirm James and Zuberi can see each other's work.

1. In browser, open test-board and draw a red rectangle
2. Tell Zuberi: "Read the test-board and tell me what's on it"
3. Zuberi should report both her sticky note and your rectangle
4. Tell Zuberi: "Add an arrow connecting my rectangle to your sticky note"

**Verify:** Arrow appears on the canvas connecting the two shapes.

---

## Phase 4: CXDB + Update Docs

### Checkpoint 4A — Register in CXDB

Tell Zuberi:
> "Record a new capability in CXDB: tldraw-mural visual collaboration space on CEG:3004. Board type: Note."

### Checkpoint 4B — Update TOOLS.md

Add `tldraw-mural` to the "Available Tool Skills" list in TOOLS.md:

```
- tldraw-mural — shared visual canvas for diagrams, brainstorming, and collaboration
```

### Checkpoint 4C — Update Infrastructure Records

Add to the CEG services list in the infrastructure skill or CCODE-HANDOFF:

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| tldraw-mural | 3004 | ✅ Running | Shared visual collaboration canvas |

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Can't access from KILO browser | Is server bound to 0.0.0.0? Check: `ss -tlnp \| grep 3004` |
| Shapes don't persist | Check `/opt/zuberi/data/tldraw/` for .json files |
| Zuberi can't curl | Check Tailscale connectivity: `curl http://100.100.101.1:3004/api/health` from KILO |
| Frontend build fails | Check Node.js version (need 18+). Check disk space on CEG. |
| tldraw import errors | Version mismatch — pin tldraw version in package.json |
| Service won't start | Check `systemctl --user status tldraw-mural` and `journalctl --user -u tldraw-mural` |

---

## Verification Checklist (for Gemini)

When reviewing this build, verify:

- [ ] server.js has no hardcoded credentials
- [ ] BIND is 0.0.0.0 (Tailscale accessible)
- [ ] Data dir is under /opt/zuberi/data/ (standard location)
- [ ] systemd service has Restart=always
- [ ] Skill YAML description includes diagnostic triggers
- [ ] Skill curl examples use exec-compatible syntax (no pipes, no bash operators)
- [ ] Frontend auto-saves with debounce (not on every keystroke)
- [ ] Board names are sanitized (no path traversal)
- [ ] API has no auth (Tailscale-only, same pattern as Kanban)

---

*Created by Architect 20. Port 3004 reserved. Apache 2.0 licensed.*
