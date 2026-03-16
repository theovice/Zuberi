---
name: web-fetch
description: "Fetch and extract clean text from web pages, articles, and PDFs via Trafilatura on CEG. Use when asked to read a URL, fetch an article, extract text from a page, or ingest long-form content. Also activates for fetch troubleshooting: 'can you read this page,' 'why didn't the fetch work,' or checking Trafilatura availability. NOT for web search (use searxng skill to find URLs first)."
---

# Web Fetch and Extraction

Fetch and extract readable text from URLs using Trafilatura on CEG.

## When to use

- Reading a full article or blog post (not just a search snippet)
- Fetching broker documentation or exchange rulebooks
- Extracting text from a PDF URL
- Ingesting long-form trading education content into Chroma

## Fetch clean text from a URL

  ssh ceg '/opt/zuberi/trading/venv/bin/python3 -c "
import trafilatura
url = \"URL_HERE\"
downloaded = trafilatura.fetch_url(url)
text = trafilatura.extract(downloaded, include_metadata=True, output_format=\"txt\")
if text:
  print(text[:3000])
else:
  print(\"EXTRACT_FAILED\")
"'

## After extracting — store in Chroma

Summarize the extracted text into a concise concept description (2-5 sentences).
Then store using the trading-knowledge skill with appropriate metadata.

For very long documents, chunk into sections of ~500 words each and store as
separate Chroma entries with the same source URL and sequential IDs
(e.g. source-name-001, source-name-002).

## Free stable sources for trading education

These sources are legal, reliable, and do not require authentication:
  CFTC Commitments of Traders  https://www.cftc.gov/MarketReports/CommitmentsofTraders/
  FRED Economic Data            https://fred.stlouisfed.org/
  Investopedia                  https://www.investopedia.com/
  Babypips School of Pipsology  https://www.babypips.com/learn/forex
  OANDA API Documentation       https://developer.oanda.com/rest-live-v20/introduction/
  Dukascopy Historical Data     https://www.dukascopy.com/swiss/english/marketwatch/historical/
  CME Group Education           https://www.cmegroup.com/education.html
  EIA Energy Data               https://www.eia.gov/opendata/

## Rate limiting

Do not fetch more than 1 URL per 5 seconds from the same domain.
Always check robots.txt compliance before bulk fetching any site.
