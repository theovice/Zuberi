# CXDB Adapter Mapping for ContextEngine Plugin

## Generated from lossless-claw analysis (Session 20)
## Source: /opt/zuberi/reference/lossless-claw

### ConversationStore Methods -> CXDB

| Method | Parameters | CXDB Mapping |
|--------|-----------|-------------|
| createConversation | sessionId, metadata | POST /v1/contexts/create |
| getConversation | conversationId | GET /v1/contexts/{id} |
| getConversationBySessionId | sessionId | GET /v1/contexts (filter by session metadata) |
| getOrCreateConversation | sessionId | Check existence then create if missing |
| markConversationBootstrapped | conversationId | Append metadata turn with bootstrapped flag |
| createMessage | conversationId, role, content, tokenCount | POST /v1/contexts/{id}/append (turn) |
| createMessagesBulk | conversationId, messages[] | Batch append turns |
| getMessages | conversationId, limit, offset | GET /v1/contexts/{id}/turns with pagination |
| getLastMessage | conversationId | GET_LAST via binary protocol |
| hasMessage | conversationId, messageId | Check turn existence by ID |

### SummaryStore Methods -> CXDB + Chroma

| Method | Parameters | Storage Mapping |
|--------|-----------|----------------|
| insertSummary | conversationId, content, tokenCount | CXDB: append summary turn. Chroma: upsert embedding |
| getSummary | summaryId | CXDB: get turn by ID |
| getSummariesByConversation | conversationId | CXDB: get turns filtered by type=summary |
| linkSummaryToMessages | summaryId, messageIds[] | CXDB: metadata turn linking summary to source turns |
| linkSummaryToParents | summaryId, parentIds[] | CXDB: DAG parent references |
| getContextItems | conversationId, tokenBudget | Chroma: semantic query + CXDB: fetch matched turns |
| searchSummaries | query, limit | Chroma: vector similarity search |

### LcmDependencies Interface

| Field | Type | Our Implementation |
|-------|------|-------------------|
| conversationStore | ConversationStore | CXDB adapter (HTTP REST API on CEG:9009/9010) |
| summaryStore | SummaryStore | CXDB + Chroma hybrid adapter |
| llmClient | LlmClient | OpenClaw native (gpt-oss:20b via Ollama) |
| tokenizer | Tokenizer | Ollama token count API or tiktoken |
| logger | Logger | JSONL audit log |
| config | LcmConfig | OpenClaw config values from openclaw.json |

### Database Schema -> CXDB Type Registry

| SQLite Table | CXDB Mapping |
|-------------|-------------|
| conversations | CXDB context (one context per conversation) |
| messages | CXDB turns within context (role, content as payload) |
| message_parts | CXDB turn payload sections (structured JSON within turn) |
| summaries | CXDB turns with type=Summary descriptor |
| summary_parents | CXDB DAG parent references (native to CXDB architecture) |

### Configuration Mapping

| lossless-claw Config | Our Equivalent | Current Value |
|---------------------|---------------|---------------|
| tokenBudget | compaction.reserveTokensFloor | 25000 |
| freshTailCount | Number of recent turns to keep raw | TBD (configure during build) |
| compactionThreshold | Compaction trigger threshold | 131072 - 25000 = 106072 |
| pruneHeartbeatOk | Filter HEARTBEAT turns during bootstrap | true (heartbeat disabled) |
| maxCompactionTokens | Max tokens for summary generation | TBD |

### Lifecycle Hook Mapping

| Hook | When It Fires | What It Does | CXDB Action |
|------|-------------|-------------|-------------|
| bootstrap | Session start | Load/create conversation, import history | Create or retrieve CXDB context by sessionId |
| ingest | After each message | Persist message to store | Append turn to CXDB context |
| assemble | Before LLM call | Build prompt from summaries + recent messages | Query CXDB for recent turns + Chroma for relevant summaries |
| afterTurn | After LLM response | Check token count, trigger compaction if needed | Append assistant turn, evaluate threshold |
| compact | When threshold exceeded | Summarize old messages, preserve recent | LLM generates summary, append as Summary turn to CXDB, upsert to Chroma, keep freshTailCount raw turns |

### Key Architecture Decisions

1. CXDB replaces SQLite as conversation store: immutable DAG, content-addressed dedup, binary protocol for high-throughput writes
2. Chroma provides semantic search that CXDB lacks: summaries indexed with BGE-M3 embeddings (568M params, fits in ~2GB VRAM)
3. Dual-write pattern: every summary goes to CXDB (authoritative) AND Chroma (searchable)
4. Token counting moves from SQLite column to Ollama API or tiktoken
5. ContextEngine plugin hooks (bootstrap, ingest, assemble, afterTurn, compact) remain identical: only the storage adapter changes
6. CXDB type registry: define Conversation, Message, Summary, SummaryLink descriptors
7. Chroma collection: zuberi_conversations (separate from existing router_records)
8. BGE-M3 embedding model served via Ollama or sentence-transformers on CEG

### Next Steps (Build Phase)

1. Define CXDB type descriptors for Conversation, Message, Summary
2. Implement ConversationStore adapter targeting CXDB REST API
3. Implement SummaryStore adapter targeting CXDB + Chroma
4. Install BGE-M3 on Ollama or as sentence-transformers on CEG
5. Build the ContextEngine plugin (TypeScript, OpenClaw plugin format)
6. Wire into openclaw.json as the active context engine
7. Test: create conversation, ingest messages, trigger compaction, verify summaries in Chroma
8. Build ZuberiChat sidebar backed by CXDB context list
