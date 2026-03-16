---
name: browser
description: "Web browser automation via Brave + CDP. Use when asked to navigate websites, fill forms, click buttons, take screenshots, read page content, or interact with any web UI. Also activates for: 'open this URL', 'go to', 'check this website', 'log into', 'screenshot', or 'what does this page show.' NOT for web search (use searxng skill) or fetching raw HTML (use web-fetch skill)."
---

# Browser Automation

Zuberi has a dedicated Brave browser instance ("Zuberi Browser") with remote debugging.
OpenClaw connects via Chrome DevTools Protocol (CDP).

## Prerequisites

- The "Zuberi Browser" shortcut on James's desktop must be open
- If browser commands fail with connection errors, ask James to launch it

## Available Actions

- **Navigate**: go to any URL
- **Click**: click elements by selector or coordinates
- **Type**: type into input fields, search boxes, forms
- **Read**: DOM snapshot (structured) or screenshot (visual)
- **Wait**: wait for elements, page loads, timeouts
- **Tabs**: open, close, switch, list tabs
- **Screenshot**: capture current page state

## Browser Profile

- Path: C:\Users\PLUTO\zuberi-brave-profile
- Isolated from James's personal Brave — separate cookies, logins, history
- CDP port: 9222 (local), host.docker.internal:9222 (from container)
- OpenClaw profile name: "zuberi"

## Usage Pattern

1. Use the browser tool with profile "zuberi"
2. Navigate to the target URL
3. Use DOM snapshot first (faster, structured)
4. Fall back to screenshot + vision (qwen3-vl:8b) for complex visual layouts
5. Interact via click/type actions
6. Confirm results via snapshot or screenshot

## Login Credentials

- NEVER store passwords in this file or any workspace file
- If a site requires login, ask James for credentials at runtime
- Use the browser to type credentials directly — do not echo them in chat

## Limitations

- CAPTCHAs: cannot solve. Ask James for help.
- Anti-bot sites: some sites detect CDP automation (Cloudflare). Most sites work fine.
- One active interaction at a time (can manage multiple tabs, acts on one)
- Browser must be open — Zuberi cannot launch it herself (Windows GUI limitation from Docker)
