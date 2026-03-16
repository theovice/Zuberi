---
name: searxng
description: "Search the web using self-hosted SearXNG on CEG. Use when asked to search for something, look up current events, find real-time information, or research a topic. Also activates for search troubleshooting: 'is search working,' 'why can't you find anything,' or checking SearXNG health on CEG:8888. NOT for reading full articles after finding URLs (use web-fetch skill)."
---

# SearXNG Web Search

Search the web using the self-hosted SearXNG instance on CEG.

## When to use

- User asks about current events or news
- User asks you to "search for" or "look up" something
- You need current information beyond your training data
- User asks "what is" questions about recent topics

## How to search

Use the exec tool to call SearXNG's API:

```bash
curl -s "http://100.100.101.1:8888/search?q=QUERY&format=json"
```

Replace QUERY with the URL-encoded search query.

## Parameters

- `q` — search query (required, URL-encode spaces as `+` or `%20`)
- `format=json` — always use JSON format for parsing
- `categories` — optional: `general`, `news`, `images`, `videos`, `science`, `it`
- `time_range` — optional: `day`, `week`, `month`, `year`
- `language` — optional: `en`, `fr`, `de`, etc.

## Examples

General search:
```bash
curl -s "http://100.100.101.1:8888/search?q=latest+AI+news&format=json"
```

News only:
```bash
curl -s "http://100.100.101.1:8888/search?q=tech+news&format=json&categories=news&time_range=week"
```

## Response format

Each result contains:
- `title` — page title
- `url` — link to the page
- `content` — snippet/description

## Important

- Always summarize results for the user; do not dump raw JSON
- If no results are found, tell the user and suggest refining the query
- Limit to top 5 results unless the user asks for more
- The SearXNG instance is at http://100.100.101.1:8888 (Tailscale, CEG server)
