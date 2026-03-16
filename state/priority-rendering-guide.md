# PRIORITY LIST RENDERING GUIDE

When James asks for the "prio list" or "priority list," render it using the claude.ai Visualizer widget (show_widget tool) — NOT as a text table.

## Style Requirements

- Dark theme matching ZuberiChat's aesthetic
- HTML table inside show_widget
- Color-coded priority badges:
  - P1: amber/orange (#BA7517)
  - P2: green (#1D9E75)
  - P3: blue (#378ADD)
  - Ongoing: purple (#534AB7)
  - DONE: green (#1D9E75)
  - Deferred: amber outline (rgba(232,161,53,0.15) bg, #e8a135 text)
- Columns: #, Task, Pri (badge), By (CC/Z/CCZ), Status
- Font: var(--font-sans), 13px body, 14px headers
- Completed section: green background, strikethrough text, reduced opacity
- Deferred section: amber-tinted background
- Legend at bottom: CC = ccode, Z = Zuberi, CCZ = both
- Summary line at bottom with session stats

## Data Source

Read state/priorities.yaml for the current queue. The completed_this_session section goes in the DONE rows.

## Example Badge HTML

```html
<span style="background:#BA7517;color:#fff;padding:1px 8px;border-radius:var(--border-radius-md);font-size:10px;font-weight:500;">P1</span>
```

## DO NOT

- Render as plain text or markdown table
- Use bullet points
- Skip the completed section
- Forget the deferred items
