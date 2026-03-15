# CXDB Search & Retrieval  
CXDB is designed as an **append-only context store** for conversation turns – not as a text search index.  The official docs describe CXDB as an “AI Context Store” for conversation histories and tool outputs【8†L321-L329】.  Clients retrieve turns by context ID and turn sequence; e.g. `GET /v1/contexts/{context_id}/turns` with optional `limit`/`before_turn_id` paging【35†L583-L592】【35†L613-L624】.  There is **no built-in full-text or semantic search** over payloads.  In practice, you fetch turns by walking the turn DAG in context order.  The API offers filters for paging and view modes (raw vs typed JSON), but no keyword query parameter or vector search.  In short, CXDB retrieval is by context/turn index only – you cannot ask “find all turns containing X” or run embeddings over CXDB data directly.  

# Enabling Similarity Search (Chroma)  
To add semantic lookup, the lightest solution is to use the existing Chroma vector store alongside CXDB.  Since CXDB lacks a search index, we can **augment each routing record with an embedding** and store it in Chroma.  For example, whenever Level-2 writes a routing outcome to CXDB, you would also compute an embedding of the relevant text (e.g. task description or decision summary) and **upsert** it into a Chroma collection, using a unique ID (such as the CXDB context and turn ID) and any metadata tags.  Chroma is designed for exactly this use: it supports storing “documents” with embeddings and metadata, and running vector similarity queries【43†L129-L137】.  

```js
// Pseudo-code for adding a routing record to Chroma (TypeScript/JS client):
const client = new ChromaClient();
const coll = await client.getOrCreateCollection({name: "router_records"});
await coll.add({
  ids: [recordId], 
  documents: [recordText], 
  embeddings: [recordEmbedding], 
  metadatas: [ { agent: "A", outcome: "X", confidence: 0.42 } ]
});
// Later, to query: 
const results = await coll.query({
  queryEmbeddings: [queryEmbedding], 
  nResults: 5, 
  where: { agent: "A" }
});
```  

By doing this, Level-3 can perform semantic lookups over past routing records.  Chroma supports **vector (semantic) search** as well as lexical and metadata search【44†L84-L92】【44†L96-L104】.  In other words, you can query by embedding similarity *and* filter by structured metadata in Chroma.  This avoids modifying CXDB itself.  Since a Chroma instance is already available locally, no heavy infrastructure changes are needed – just integrate your service to index/extract the routing turn data into Chroma.  

# Storing Structured Metadata  
CXDB does support **typed JSON payloads** for turns via its type registry【30†L277-L286】.  You could define a `RoutingRecord` type (with fields like `agent`, `score`, `outcome`, etc.) and append those JSON records as CXDB turns.  CXDB will store them (internally as msgpack) and project them to JSON in the UI/API【30†L277-L286】【35†L613-L621】.  This keeps the metadata in line with the conversation timeline.  

However, querying that metadata is limited. CXDB has no built-in query engine over fields; you would have to fetch turns and filter on the client side.  If you need to search or aggregate over many records (e.g. “find all low-confidence decisions”), a separate store is more efficient.  Options include:
- **Use Chroma’s metadata filters.** Chroma lets you attach metadata to vectors and filter on it during search【44†L96-L104】. For numeric or categorical fields, you can store them in Chroma alongside the embedding. This way, a vector query can also filter (e.g. only consider records of a certain agent or success flag).  
- **Use a relational/log store.** For simple numeric or status fields, you could also write them to a lightweight DB or log (e.g. SQLite, PostgreSQL, or even Redis), especially if you need SQL-like analytics. This is extra complexity though.  

In practice, the simplest pattern is often: **store routing records as structured JSON turns in CXDB** *and* index them in Chroma.  Use CXDB for historical audit (ordered timeline) and use Chroma (with metadata) for search.  For pure-text fields, Chroma gives semantic lookup; for key-value fields, you can either rely on Chroma’s metadata filtering or a small secondary store for fast queries.  

# Failure Modes at Scale  
Using CXDB as a high-volume feedback log can introduce issues if not managed carefully:
- **Growing context logs:** Hundreds of tasks/day means thousands of turns over time. Large contexts can slow down reads. The CXDB docs warn of “Slow turn retrieval” when contexts become large【42†L562-L572】. A single `GET /contexts/:id/turns` may start taking seconds if there are many turns. Mitigation: use pagination (`limit`/`before_turn_id`), use `view=raw` to skip JSON projection, or shard work into multiple contexts.  
- **Resource usage:** CXDB keeps a blob cache in memory. Heavy use can cause >4 GB RAM and OOMs【42†L531-L539】. Also, if many blobs accumulate, disk may fill (“no space left on device” errors)【42†L417-L425】. Ensure you have enough SSD capacity and optionally enforce context rotation or pruning of old contexts.  
- **Write throughput:** While CXDB is optimized for appends, you might need an async or batched write strategy under heavy load. The `ai-cxdb-observe` example uses an asynchronous sink (buffer size 1000, drop oldest on overflow) for high-throughput logging【5†L474-L482】. Monitor write latency (100ms+ delays indicate storage I/O bottlenecks【42†L498-L507】).  
- **Schema mis-evolutions:** When using typed payloads, mismanaging type tags can cause failures (but this is a general CXDB issue, not scale-specific).  
- **Single-context contention:** If you route all tasks into one CXDB context, concurrent writes could contend. Using multiple contexts (one per agent/session) may help.  

# Recommendation  
**Use CXDB as the append-only audit trail, and Chroma for search.** Specifically, design your system so that each Level-2 router decision is appended to CXDB with a defined schema type (so you can project it as JSON later). At the same time, compute an embedding (using any suitable model) for that record’s content or summary, and upsert it into a Chroma collection. Include in Chroma the CXDB context ID and turn ID (for linking back), plus any key metadata as Chroma metadata fields. When Level-3 needs to find similar past tasks (e.g. low confidence situations), query Chroma by embedding similarity *and* metadata filters. The result gives you candidate record IDs, which you then fetch from CXDB if needed. This pattern offloads search to Chroma (which excels at large-scale vector and metadata search【44†L84-L92】【44†L96-L104】) while keeping CXDB as the reliable chronological store. 

In summary:
- **CXDB** = authoritative log of all turns (including your routing records)【8†L321-L329】.
- **Chroma** = semantic index for those turns (embeddings + metadata)【43†L129-L137】【44†L84-L92】.
- **Metadata store** (optional) = for heavy analytics on structured fields (or rely on Chroma filtering).  

This hybrid architecture leverages each tool’s strengths: CXDB for append-once context storage, Chroma for fast similarity/keyword search, and minimal extra infrastructure since Chroma is already on-hand. Key caveat: monitor CXDB resource usage and page reads to avoid the performance pitfalls noted above【42†L562-L572】【42†L531-L539】. With these measures, the router can efficiently learn from history at scale.  

**Sources:** CXDB docs and client spec【8†L321-L329】【35†L583-L592】【30†L277-L286】; Chroma product docs【44†L84-L92】【44†L96-L104】【43†L129-L137】; CXDB troubleshooting guide on performance【42†L562-L572】【42†L531-L539】.