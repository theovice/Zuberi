# PRIORITY LIST RENDERING GUIDE

When James asks for "prio list" or "priority list," use the claude.ai Visualizer tool (visualize:show_widget). 

## REQUIRED: Call read_me first
Before the first show_widget call in a conversation, call visualize:read_me with modules: ["diagram"]. This is mandatory.

## Widget Code Template

Use this exact HTML structure inside show_widget. Modify only the row data.

```html
<div style="padding: 1rem 0;">
<table style="width:100%; border-collapse:collapse; font-size:13px; font-family:var(--font-sans); color:var(--color-text-primary);">
<thead>
<tr style="border-bottom:2px solid var(--color-border-primary);">
<th style="text-align:left;padding:8px 6px;font-weight:500;font-size:14px;width:28px;">#</th>
<th style="text-align:left;padding:8px 6px;font-weight:500;font-size:14px;">Task</th>
<th style="text-align:center;padding:8px 6px;font-weight:500;font-size:14px;width:48px;">Pri</th>
<th style="text-align:center;padding:8px 6px;font-weight:500;font-size:14px;width:36px;">By</th>
<th style="text-align:center;padding:8px 6px;font-weight:500;font-size:14px;">Status</th>
</tr>
</thead>
<tbody>

<!-- ACTIVE TASKS — one <tr> per task -->
<tr style="border-bottom:0.5px solid var(--color-border-tertiary);">
<td style="padding:6px;font-weight:500;">1</td>
<td style="padding:6px;">Task name here</td>
<td style="text-align:center;padding:6px;"><span style="background:#BA7517;color:#fff;padding:1px 8px;border-radius:var(--border-radius-md);font-size:10px;font-weight:500;">P1</span></td>
<td style="text-align:center;padding:6px;font-family:var(--font-mono);font-size:11px;">CC</td>
<td style="text-align:center;padding:6px;font-size:12px;">Status text</td>
</tr>

<!-- COMPLETED SECTION HEADER -->
<tr style="border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-success);"><td colspan="5" style="padding:4px 6px;font-size:10px;font-family:var(--font-mono);color:var(--color-text-success);letter-spacing:0.5px;">COMPLETED THIS SESSION</td></tr>

<!-- COMPLETED ROWS — strikethrough, dimmed -->
<tr style="border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-success);">
<td style="padding:6px;opacity:0.5;">—</td>
<td style="padding:6px;text-decoration:line-through;opacity:0.5;">Completed task name</td>
<td style="text-align:center;padding:6px;"><span style="background:#1D9E75;color:#fff;padding:1px 8px;border-radius:var(--border-radius-md);font-size:10px;">DONE</span></td>
<td style="text-align:center;padding:6px;font-family:var(--font-mono);font-size:11px;opacity:0.5;">CC</td>
<td style="text-align:center;padding:6px;color:var(--color-text-success);font-size:12px;opacity:0.6;">Result summary</td>
</tr>

<!-- DEFERRED SECTION HEADER -->
<tr style="border-top:2px solid rgba(232,161,53,0.3);background:rgba(232,161,53,0.06);"><td colspan="5" style="padding:4px 6px;font-size:10px;font-family:var(--font-mono);color:#e8a135;letter-spacing:0.5px;">DEFERRED — NEEDS DEDICATED AGENT</td></tr>

<!-- DEFERRED ROWS -->
<tr style="background:rgba(232,161,53,0.04);">
<td style="padding:6px;opacity:0.6;">—</td>
<td style="padding:6px;color:#e8a135;">Deferred task name</td>
<td style="text-align:center;padding:6px;"><span style="background:rgba(232,161,53,0.15);color:#e8a135;padding:1px 8px;border-radius:var(--border-radius-md);font-size:10px;border:1px solid rgba(232,161,53,0.3);">Deferred</span></td>
<td style="text-align:center;padding:6px;font-family:var(--font-mono);font-size:11px;color:#e8a135;">CC</td>
<td style="text-align:center;padding:6px;font-size:11px;color:#997333;">Context</td>
</tr>

</tbody>
</table>

<!-- LEGEND -->
<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:11px;color:var(--color-text-secondary);">
<span style="display:flex;align-items:center;gap:4px;"><span style="font-family:var(--font-mono);font-weight:500;">CC</span> = ccode</span>
<span style="display:flex;align-items:center;gap:4px;"><span style="font-family:var(--font-mono);font-weight:500;">Z</span> = Zuberi</span>
<span style="display:flex;align-items:center;gap:4px;"><span style="font-family:var(--font-mono);font-weight:500;">CCZ</span> = both</span>
</div>

<!-- SESSION SUMMARY -->
<p style="margin-top:10px;font-size:11px;color:var(--color-text-tertiary);">Session summary line here.</p>
</div>
```

## Priority Badge Colors

| Priority | Background | Text |
|----------|-----------|------|
| P1 | #BA7517 | #fff |
| P2 | #1D9E75 | #fff |
| P3 | #378ADD | #fff |
| Ongoing | #534AB7 | #fff |
| DONE | #1D9E75 | #fff |
| Deferred | rgba(232,161,53,0.15) | #e8a135 (+ 1px border) |

## show_widget Call

```
visualize:show_widget({
  i_have_seen_read_me: true,
  loading_messages: ["Loading priorities"],
  title: "zuberi_priority_matrix",
  widget_code: "<the HTML above with real data>"
})
```

## DO NOT
- Render as plain text or markdown table
- Use generic table styling
- Skip completed or deferred sections
- Use background colors that don't reference CSS variables (except the specific hex colors above)
