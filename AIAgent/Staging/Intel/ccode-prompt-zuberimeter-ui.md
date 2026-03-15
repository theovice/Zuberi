# Ccode Prompt: ZuberiChat Usage Meter UI

## Context
ZuberiChat is a Tauri + React + TypeScript desktop app at `C:\Users\PLUTO\github\Repo\ZuberiChat`. It has a custom titlebar with window controls (minimize, maximize, close). There used to be a panel toggle icon in the top-right area of the titlebar (left of the window controls). That icon was removed or disabled. We're replacing it with a usage meter icon.

The app uses a dark theme (near-black background, warm gold/amber accents matching the Zuberi diamond logo). The chat area is the main body. There's a chat input at the bottom with quick action buttons.

## CRITICAL: Before doing anything
1. Kill any existing `pnpm tauri dev` process
2. Run `cd C:\Users\PLUTO\github\Repo\ZuberiChat && pnpm test` — all 13 tests must pass before you touch anything
3. Run `git status` and `git log --oneline -5` to understand current state
4. Read the src/ directory structure to understand the component tree
5. Find the titlebar/header component — it will be in src/components/ or similar. Read it fully before editing.

## What to build

### 1. Usage Meter Icon Button
- Place a meter/gauge icon in the titlebar, in the position where the old panel toggle icon was (top-right, left of window controls)
- Use an SVG icon that looks like a speedometer/gauge — simple, clean, matches the app's minimal aesthetic
- The icon should have a subtle color indicator:
  - Green tint when usage is low (< 50% of limit)
  - Amber/gold tint when moderate (50-80%)
  - Red tint when high (> 80%)
- On hover: slight brightness increase
- On click: toggle the dropdown panel open/closed

### 2. Dropdown Overlay Panel
- Opens below the meter icon, anchored to the top-right
- Overlays the chat body — does NOT push content or affect the chat input
- Width: ~320px. Slides down or fades in with a subtle animation (150ms)
- Background: same dark theme as the app (slightly lighter than the main background for contrast, like #1a1a1a or #222)
- Border: 1px solid rgba(255,255,255,0.08) with subtle border-radius (8px)
- Dismiss: click the meter icon again, click outside the panel, or press Escape

### 3. Panel Content — Usage Gauges

The panel should display:

**Header:** "API Usage" with a small refresh icon button

**5-Hour Window gauge:**
- Circular arc/ring gauge (not a full circle — think 270° arc like a speedometer)
- Shows estimated cost for the last 5 hours
- Label: "5h Rolling"
- Center text: "$X.XX" (cost)
- Below gauge: "XX calls" count

**Weekly gauge:**
- Same style circular arc gauge
- Shows estimated cost for the last 7 days
- Label: "This Week"
- Center text: "$X.XX"
- Below gauge: "XX calls"

**Monthly budget bar:**
- Horizontal progress bar (full width of panel)
- Shows monthly spend vs $20 limit
- Label: "$X.XX / $20.00"
- Color: green → amber → red as it fills
- Right-aligned: "XX% used"

**Last dispatch info (small text at bottom):**
- "Last: 2m ago — 1,542 tokens — $0.08"
- Or "No dispatches yet" if empty

### 4. Data Source — Mock data for now

The usage tracker backend (CEG:3002) is not deployed yet. For now, use mock data so the UI is testable:

Create a `src/services/usageTracker.ts` (or similar location matching existing patterns):

```typescript
// Usage tracker API client
// TODO: Wire to real backend at http://100.100.101.1:3002 when deployed

export interface UsageStats {
  total_events: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  window_start: string;
  window_end: string;
}

export interface UsageLimits {
  monthly_limit_usd: number;
  monthly_spent_usd: number;
  monthly_remaining_usd: number;
  percent_used: number;
}

// Mock data — replace with real API calls later
const MOCK_MODE = true;
const USAGE_API = 'http://100.100.101.1:3002';

export async function getStats5h(): Promise<UsageStats> {
  if (MOCK_MODE) {
    return {
      total_events: 7,
      total_input_tokens: 12400,
      total_output_tokens: 4200,
      total_cost_usd: 0.10,
      window_start: new Date(Date.now() - 5*60*60*1000).toISOString(),
      window_end: new Date().toISOString(),
    };
  }
  const res = await fetch(`${USAGE_API}/stats/5h`);
  return res.json();
}

export async function getStatsWeek(): Promise<UsageStats> {
  if (MOCK_MODE) {
    return {
      total_events: 42,
      total_input_tokens: 89000,
      total_output_tokens: 31000,
      total_cost_usd: 0.73,
      window_start: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      window_end: new Date().toISOString(),
    };
  }
  const res = await fetch(`${USAGE_API}/stats/week`);
  return res.json();
}

export async function getLimits(): Promise<UsageLimits> {
  if (MOCK_MODE) {
    return {
      monthly_limit_usd: 20.00,
      monthly_spent_usd: 2.47,
      monthly_remaining_usd: 17.53,
      percent_used: 12,
    };
  }
  const res = await fetch(`${USAGE_API}/limits`);
  return res.json();
}
```

### 5. Design Details

**Arc gauge component specs:**
- SVG-based, ~100px diameter
- Arc stroke: 8px wide
- Background arc: rgba(255,255,255,0.06)
- Fill arc: colored based on percentage (green < 50%, amber 50-80%, red > 80%)
- Colors: green = #22c55e, amber = #f59e0b, red = #ef4444
- Center text: white, bold, 18px for the dollar amount
- Label text: rgba(255,255,255,0.5), 11px

**Monthly bar specs:**
- Height: 8px, rounded corners
- Background: rgba(255,255,255,0.06)
- Fill: same green/amber/red logic
- Labels: 13px, rgba(255,255,255,0.7)

**Panel layout:**
```
┌──────────────────────────┐
│ API Usage          🔄    │  ← header with refresh
│                          │
│  [5h Gauge]  [Week Gauge]│  ← two arc gauges side by side
│   $0.10        $0.73     │
│   7 calls     42 calls   │
│                          │
│ Monthly Budget           │
│ ████░░░░░░░░░░░  12%     │  ← horizontal bar
│ $2.47 / $20.00           │
│                          │
│ Last: 2m ago — 1.5K tok  │  ← small footer text
└──────────────────────────┘
```

## Technical constraints
- Follow existing code patterns in the repo. Read before writing.
- Use inline SVG for the gauge arcs — no external charting libraries.
- The overlay must use CSS `position: fixed` or `absolute` with high z-index so it floats over the chat without affecting layout.
- Use React state to toggle the panel. No global state management unless the app already uses one.
- Tauri uses `invoke()` for Rust↔JS bridge — but this feature is pure frontend, no Rust changes needed.
- The meter icon must not interfere with Tauri's `data-tauri-drag-region` on the titlebar. The icon area should NOT be draggable.
- CSS should be scoped or use CSS modules if the app already uses them. Match existing styling approach.

## After implementation
1. Run `pnpm test` — all 13 tests must still pass
2. Run `pnpm tauri dev` and visually verify:
   - Meter icon visible in titlebar top-right
   - Clicking icon opens the dropdown panel
   - Panel shows mock data in both gauges and the budget bar
   - Clicking outside or pressing Escape closes the panel
   - Chat input and messages are not affected by the panel overlay
   - Window drag still works on the titlebar (but NOT on the meter icon)
3. Take note of any test failures and fix them
4. Report what files were created/modified

## Do NOT
- Modify tauri.conf.json or package.json
- Add any npm dependencies (pure React + SVG)
- Remove any existing functionality
- Touch any Rust code
- Use localStorage or sessionStorage
