---
name: trading-knowledge
description: "Store, retrieve, and organize trading knowledge using CXDB and Chroma on CEG. Use when learning about markets, instruments, strategies, indicators, or recalling previously learned trading concepts. Also activates for: 'what do we know about X indicator,' 'search trading notes,' 'store this trading concept,' or troubleshooting Chroma connectivity. NOT for general memory storage (use cxdb skill) or live market data fetching."
---

# Trading Knowledge Management

Two-layer memory for trading education:
- CXDB: episodic memory (session notes, decisions, sources read)
- Chroma: semantic retrieval (concepts, strategies, indicators — searchable by meaning)

Chroma venv: /opt/zuberi/trading/venv
Chroma data: /opt/zuberi/trading/knowledge
Chroma collection: trading_knowledge

## Knowledge Taxonomy

Every piece of trading knowledge stored in Chroma must include these metadata fields:
  domain:      forex | futures | commodities | equities | macro | risk
  type:        concept | strategy | indicator | setup | rule | data-source
  instrument:  specific instrument or "general" (e.g. EURUSD, crude-oil, general)
  timeframe:   M1 | M5 | M15 | H1 | H4 | D1 | W1 | general
  source:      URL or description of origin
  confidence:  low | medium | high
  date:        YYYY-MM-DD

## Storing a concept in Chroma

Run on CEG via SSH:
  ssh ceg '/opt/zuberi/trading/venv/bin/python3 -c "
import chromadb, json
client = chromadb.PersistentClient(path=\"/opt/zuberi/trading/knowledge\")
col = client.get_or_create_collection(\"trading_knowledge\")
col.add(
  documents=[\"CONTENT_HERE\"],
  metadatas=[{
    \"domain\": \"DOMAIN\",
    \"type\": \"TYPE\",
    \"instrument\": \"INSTRUMENT\",
    \"timeframe\": \"TIMEFRAME\",
    \"source\": \"SOURCE\",
    \"confidence\": \"CONFIDENCE\",
    \"date\": \"DATE\"
  }],
  ids=[\"UNIQUE_ID\"]
)
print(\"STORED_OK\")
"'

## Querying Chroma by meaning

  ssh ceg '/opt/zuberi/trading/venv/bin/python3 -c "
import chromadb
client = chromadb.PersistentClient(path=\"/opt/zuberi/trading/knowledge\")
col = client.get_or_create_collection(\"trading_knowledge\")
results = col.query(
  query_texts=[\"QUERY_HERE\"],
  n_results=5,
  where={\"domain\": \"DOMAIN_FILTER\"}
)
for doc, meta in zip(results[\"documents\"][0], results[\"metadatas\"][0]):
  print(meta[\"type\"], \"|\", meta[\"instrument\"], \"|\", doc[:120])
"'

Remove the where filter to search across all domains.

## Storing episodic notes in CXDB

Use the cxdb skill for session notes, source logs, and decisions:
  type: zuberi.memory.Note — facts and concepts learned this session
  type: zuberi.memory.Decision — strategy or approach decisions
  type: zuberi.memory.Task — research tasks in progress

## Encoding structure in CXDB text field

CXDB has no native tags. Encode metadata as JSON in the text field:
  {"domain":"forex","type":"concept","content":"Your note here","source":"URL","date":"2026-03-05"}

## When to use which layer

  Chroma: permanent, searchable trading knowledge — concepts, strategies, indicators
  CXDB:   session memory — what was read today, decisions made, tasks pending
