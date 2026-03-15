# CCODE TASK BRIEFING — Two Tasks

You are working on the Zuberi Tauri app at:
C:\Users\PLUTO\github\Repo\ZuberiChat

## TASK 1: DEEPER CHAT BUG DIAGNOSTIC (do this first)

### Context
We added a diagnostic console.log to ClawdChatInterface.tsx and confirmed:
- sessionKey matches ("agent:main:main" === "agent:main:main") ✅
- Chat events ARE reaching the handler ✅
- state is "final" (no delta events were received)
- **hasMessage is false** ← THIS IS THE BUG

The gateway sends a "final" chat event but the `message` field is either
missing, null, or structured differently than `extractTextFromMessage` expects.

We need to see the RAW payload to understand the actual structure.

### What to do

In ClawdChatInterface.tsx, find the existing diagnostic log that was added
(the one with `[OpenClaw] chat event:`). It should be near line 173.

REPLACE that single console.log line with these TWO lines:

```typescript
console.log('[OpenClaw] chat event RAW payload:', JSON.stringify(payload, null, 2));
console.log('[OpenClaw] chat event summary:', JSON.stringify({ sessionKey: payload.sessionKey, expectedKey: SESSION_KEY, state: payload.state, runId: payload.runId, hasMessage: !!payload.message, messageType: typeof payload.message, messageKeys: payload.message && typeof payload.message === 'object' ? Object.keys(payload.message as Record<string, unknown>) : null }));
```

Also add a log at the TOP of the onMessage handler (before any if statements)
to see ALL incoming WebSocket messages. Find the line:

```typescript
onMessage: (message) => {
```

Add immediately after it:

```typescript
console.log('[OpenClaw] WS message:', JSON.stringify(message).slice(0, 500));
```

This will show us:
1. Every single WebSocket message the app receives (capped at 500 chars)
2. The full raw payload of chat events so we can see the actual field structure
3. Whether delta events exist but are being filtered before the chat handler

DO NOT change any other logic. Only add these 3 console.log lines.

After making the changes, run: pnpm tauri dev

Then tell James to send "hello" in the app and check DevTools Console.

### What we expect to learn
- If delta events appear in the WS message log but NOT in the chat event log →
  something between onMessage entry and the chat handler is consuming them
- If NO delta events appear at all → gateway is not streaming to this connection
- The RAW payload will show us the exact field names so we can fix extractTextFromMessage

---

## TASK 2: ADD MENU BAR TO ZUBERI (do this after Task 1)

### Context
Zuberi currently has no application menu bar. We want to add one matching the
style of the Claude Code desktop app, adapted for Zuberi's purpose.

The menu bar should be a TAURI NATIVE MENU — not an HTML/CSS custom menu.
Tauri v2 supports native menus via the Rust backend (src-tauri/src/main.rs
or src-tauri/src/lib.rs).

### Menu Structure

```
File
├── New Conversation     Ctrl+N       → Clears chat messages, resets session
├── ─────────────────
├── Settings...          Ctrl+,       → Opens settings panel (placeholder for now)
├── ─────────────────
├── Close                Ctrl+W       → Closes the window
└── Exit                              → Quits the app

Edit
├── Undo                 Ctrl+Z
├── Redo                 Ctrl+Y
├── ─────────────────
├── Cut                  Ctrl+X
├── Copy                 Ctrl+C
├── Paste                Ctrl+V
├── ─────────────────
└── Select All           Ctrl+A

View
├── Toggle DevTools      Ctrl+Shift+I → Opens/closes WebView DevTools
├── ─────────────────
├── Zoom In              Ctrl+=
├── Zoom Out             Ctrl+-
├── Reset Zoom           Ctrl+0
├── ─────────────────
└── Toggle Fullscreen    F11

Help
├── Documentation                     → Opens https://docs.openclaw.ai in browser
├── ─────────────────
└── About Zuberi                      → Shows version dialog (app name + version)
```

### Implementation Notes

1. Use Tauri v2's menu API. Check what version of Tauri is in src-tauri/Cargo.toml.
   - For Tauri v2: use `tauri::menu::Menu`, `Submenu`, `MenuItem`, `PredefinedMenuItem`
   - Predefined items handle Edit menu actions (cut/copy/paste/undo/redo/select-all)
     automatically — no custom handler needed

2. For "New Conversation" — emit a Tauri event from Rust that the frontend listens for.
   In ClawdChatInterface.tsx, add a useEffect that listens for a "new-conversation" event
   and calls setMessages([]) + resets all refs.

3. For "Toggle DevTools" — Tauri v2 exposes this via the webview API in Rust:
   `webview.open_devtools()` / `webview.close_devtools()` / `webview.is_devtools_open()`

4. For "About Zuberi" — use a simple Tauri dialog or a predefined about menu item.
   App name: "Zuberi", version from Cargo.toml.

5. For "Documentation" — use `tauri::api::shell::open` or equivalent to open the URL
   in the system browser.

6. For "Settings..." — for now, just emit a "open-settings" event to the frontend.
   We'll build the settings panel later. Log a console message if no settings panel exists yet.

7. For zoom controls — these can be handled via webview zoom APIs or by emitting
   events that the frontend handles with document.body.style.zoom.

### Styling
The menu should be the OS-native menu bar. On Windows this appears as a standard
title bar menu. This is NOT an HTML overlay — it's Tauri's native menu system.

### Final Report

| Step | Status |
|------|--------|
| Task 1: diagnostic logs added | ✅/❌ |
| Task 1: pnpm tauri dev running | ✅/❌ |
| Task 2: Tauri native menu created | ✅/❌ |
| Task 2: New Conversation works | ✅/❌ |
| Task 2: Toggle DevTools works | ✅/❌ |
| Task 2: Edit menu items work | ✅/❌ |
| Task 2: Documentation link opens browser | ✅/❌ |
| Task 2: About dialog shows | ✅/❌ |
| Task 2: App builds and runs | ✅/❌ |
