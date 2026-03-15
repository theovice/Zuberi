# **Persistent Conversational Memory Architecture for Local AI Agents: Optimizing CXDB and Chroma Integrations**

The architectural paradigm for local autonomous artificial intelligence is rapidly transitioning from stateless, single-turn inference loops toward persistent, multi-session agentic workflows. For locally hosted agents, the primary operational bottleneck remains the phenomenon of "agentic amnesia"—the inevitable loss of critical contextual data when conversational histories surpass the fixed token limits of the underlying large language model (LLM). Resolving this requires decoupling the agent's short-term working memory (the active context window) from its long-term episodic and semantic memory. The specific deployment of the Zuberi local autonomous AI assistant—orchestrated by OpenClaw v2026.3.8, powered by the natively quantized gpt-oss:20b reasoning model via Ollama, and rendered through a Tauri v2 React frontend—necessitates a highly specialized, localized memory infrastructure.

This comprehensive analysis details the implementation of a dual-store memory architecture. It utilizes CXDB as a deterministic, append-only context store for raw transcript preservation, and Chroma as an embedded semantic vector database for Memory-Augmented Retrieval, commonly referred to as Retrieval-Augmented Generation (RAG). Operating under strict local-only constraints over a Tailscale mesh network, this architecture represents the current state of the art for zero-cloud agentic memory systems.

## **1\. CXDB Capabilities and Architectural Mapping**

CXDB operates as a highly optimized, append-dominant AI context store built explicitly to preserve conversational histories, internal reasoning traces, and tool execution outputs through content-addressed deduplication.1 Within the Zuberi architecture, CXDB either heavily augments or entirely replaces OpenClaw’s default JSONL transcript storage mechanism, providing a mathematically rigorous foundation for managing conversational state.

## **1.1 Core Storage Architecture and the Directed Acyclic Graph (DAG) Model**

Traditional chat applications store conversation history as a linear, mutable log within a relational database. CXDB rejects this paradigm, structuring conversational memory strictly as a Directed Acyclic Graph (DAG).1 Every conversational turn—whether a user prompt, an internal agent reasoning step, or a system tool execution result—is encoded and stored as an immutable node.

The physical layout on disk utilizes a highly compact, fixed-size 104-byte TurnRecordV1 structure.2 This record contains a globally unique, monotonic turn\_id, a parent\_turn\_id referencing the preceding node (or 0 for root nodes), a depth integer to track the conversation length, and a BLAKE3-256 payload\_hash.2

Because every turn explicitly references its parent rather than simply appending to a list, the architecture natively supports "branch-from-any-turn" semantics.1 If the Zuberi agent hallucinates an incorrect response, or if the user edits a previous prompt within the Tauri React frontend, the system does not execute a destructive UPDATE or DELETE operation on the database. Instead, it forks a new branch from the edited node's parent. The original conversation path remains entirely intact within the DAG, preserving forensic accountability for all agent actions.

The actual text payload of each turn is stored separately in a Content-Addressed Storage (CAS) blob store, keyed by the BLAKE3-256 hash defined in the turn record.1 This CAS architecture provides native, system-wide deduplication. If the OpenClaw agent repeatedly injects an identical system prompt, a massive JSON tool schema, or a recurring error message into the context across multiple distinct sessions, CXDB computes the hash, recognizes the duplicate, and only stores the physical payload bytes once.1

## **1.2 Communication Protocols: Binary Protocol and REST API**

To interface with the storage engine, the CXDB Rust server exposes two primary communication gateways, operating concurrently to serve different components of the Zuberi stack.

**The Binary Protocol (Port 9009\)** Designed for high-throughput, low-latency write operations, the binary protocol operates over persistent TCP connections.3 It utilizes length-prefixed frames consisting of a 16-byte header containing the payload length, a message type code, execution flags, and a request ID for multiplexing.3 This interface is optimized for the OpenClaw daemon, which must stream and append thousands of tokens and tool execution logs per second.

| Code | Message Type | Direction | Functional Description |
| :---- | :---- | :---- | :---- |
| 1 | HELLO | Bidirectional | Handshake and protocol version negotiation. |
| 2 | CTX\_CREATE | Client to Server | Initializes an empty conversation context. |
| 3 | CTX\_FORK | Client to Server | Branches a new context from an existing DAG turn ID. |
| 5 | APPEND\_TURN | Client to Server | Appends a new turn, hashing the payload via BLAKE3. |
| 6 | GET\_LAST | Client to Server | Traverses the DAG backward from the head to retrieve ![][image1] turns. |
| 9 | GET\_BLOB | Client to Server | Fetches raw payload bytes using a specific hash. |

Table 1: Primary CXDB Binary Protocol Message Types and Operations 3

**The HTTP Gateway (Port 9010\)** While the binary protocol handles raw byte ingress, the HTTP REST API is designed for user interface clients and tooling that require typed projections of the data.4 The Tauri v2 React frontend interacts exclusively with this gateway. The endpoints include POST /v1/contexts/create to initiate a session, POST /v1/contexts/:id/append for simple writes, and GET /v1/contexts/:id/turns to retrieve a chronological list of messages.1

When the HTTP gateway receives a GET request with the view=typed parameter, the server executes a multi-step projection pipeline.2 It fetches the raw turn records, retrieves the compressed blobs, decompresses them using Zstandard (Zstd), decodes the internal Msgpack serialization, and applies type registry descriptors to map numeric tags back to human-readable JSON field names.2 This allows the React frontend to receive standard JSON arrays without bearing the computational burden of binary deserialization.

## **1.3 Performance Characteristics and Scalability Limits**

The performance metrics of CXDB are defined by its append-dominant design and aggressive compression algorithms. Computing the BLAKE3 hash requires roughly ![][image2] milliseconds, while the ![][image3] lookup for blob deduplication takes approximately ![][image4] milliseconds.2 A standard append operation for a 10KB conversational payload completes in roughly ![][image5] millisecond at the 50th percentile (p50) and ![][image6] milliseconds at the 99th percentile (p99).2

Retrieval is similarly efficient. Because fetching the last ![][image1] turns requires traversing the parent pointers backward from the head node, it is an ![][image7] operation.2 With a warm cache, retrieving the last 10 turns takes approximately ![][image5] millisecond.2 The projection pipeline adds roughly ![][image8] milliseconds of latency per turn to decode the Msgpack structures into JSON.2

CXDB achieves massive storage efficiency through Zstd level 3 compression, which routinely yields a 70% reduction in size for text-heavy JSON payloads.2 A typical 10KB turn occupies only ![][image9] kilobytes of physical disk space when accounting for metadata and fixed-record overhead.2

Despite these performance benchmarks, the version 1 architecture operates strictly as a single-process system.2 It supports millions of isolated contexts and billions of DAG turns—limited solely by the 64-bit ID space and physical NVMe storage capacity—and can process 10,000 concurrent appends per second.2 However, it lacks native distributed horizontal scaling across multiple nodes and cannot natively chunk individual payloads exceeding 1MB.2 For the Zuberi local deployment, these limits are practically unreachable, but it necessitates that any base64-encoded image attachments or massive codebase ingestions be pre-chunked by OpenClaw prior to CXDB insertion.

## **1.4 Overriding OpenClaw Compaction via ContextEngine**

By default, OpenClaw manages context limits through a sliding-window compaction algorithm.5 When a conversation approaches the LLM's maximum token limit, the core runtime automatically summarizes the oldest entries in the JSONL transcript and preserves only the most recent messages, permanently erasing the verbatim historical dialogue from the active file.5

The integration of CXDB fundamentally alters this paradigm. Utilizing the ContextEngine plugin slot introduced in OpenClaw v2026.3.8, the Zuberi architecture entirely bypasses this lossy behavior.6 Drawing architectural inspiration from the lossless-claw reference plugin, the custom engine intercepts the compact() lifecycle hook.7

When the context window threshold (e.g., 75% capacity) is breached, the plugin traverses the CXDB DAG to identify stale nodes.7 Instead of deleting these nodes, the plugin generates localized summaries and injects them into the LLM's active runtime prompt, while leaving the raw, immutable nodes perfectly intact within the CXDB storage layer.7 The LLM operates on a compressed representation of the past, but the Tauri frontend can simultaneously query the CXDB REST API to display the exact, uncompressed chronological transcript to the user.

## **2\. Chroma Architecture for Semantic Conversation Indexing**

CXDB excels at exact, deterministic chronological reconstruction of the conversation DAG. However, it cannot natively perform semantic similarity searches based on the conceptual meaning of the text. To equip Zuberi with proactive, persistent memory recall, the architecture must mirror the deterministic artifacts from CXDB into Chroma, an embedded vector database optimized for AI applications.

## **2.1 Vector Indexing and Semantic Chunking Strategy**

Chroma utilizes advanced indexing techniques, specifically Hierarchical Navigable Small World (HNSW) algorithms and Inverted File Index (IVF) clustering, to conduct approximate nearest neighbor searches across dense vectors.10 In a local deployment, it operates without network dependency, utilizing DuckDB and Parquet for highly scalable, local persistent storage of embeddings.11

The efficacy of a RAG pipeline is inextricably linked to its chunking strategy.13 Conversational data presents a unique indexing challenge: dialogue is inherently fragmented across multiple turns, filled with pronouns, implicit references, and anaphora. If individual conversational turns are indexed as raw strings into Chroma, the semantic retrieval engine will fail to surface relevant results due to a lack of context.

A robust conversation indexing architecture requires a silent, background LLM synthesis step prior to vectorization.14 Before a batch of turns is committed to Chroma, the Zuberi background worker passes the raw CXDB nodes to the LLM to generate a synthesized, standalone "memory chunk." For instance, a disjointed multi-turn exchange where the user states "I hate the new layout," followed by the agent asking "The light mode?", and the user replying "Yes, switch it to dark," is synthesized into a single, highly indexable document: *"User expresses a strong preference for the dark theme UI layout."*

Chroma's internal architecture facilitates this through two reserved, immutable keys: K.DOCUMENT (\#document), which stores the synthesized text content with Full-Text Search (FTS) enabled, and K.EMBEDDING (\#embedding), which stores the dense numerical vector.15 This dual-index approach permits sophisticated hybrid search. If the OpenClaw agent queries a highly specific technical term, API key, or exact string match, the FTS index retrieves the document. If the agent queries a conceptual idea, the vector index measures cosine similarity or Euclidean distance to retrieve the most semantically relevant memories.10

## **2.2 Embedding Models for 16GB VRAM Environments**

The translation of text into dense numerical vectors requires a dedicated embedding model. The Zuberi stack relies heavily on gpt-oss:20b, a 21-billion parameter open-weight reasoning model developed by OpenAI.16 When post-trained with MXFP4 quantization, the MoE weights of gpt-oss:20b consume approximately 14GB of a standard 16GB GPU memory allocation (such as an NVIDIA RTX 5070 Ti).16

This creates a severe resource constraint. High-dimensional, state-of-the-art embedding models like Alibaba's Qwen3-Embedding-8B achieve exceptional retrieval accuracy (an MTEB multilingual score of 70.58) but require too much VRAM to run concurrently with the primary reasoning model on consumer hardware.19 The architecture must therefore deploy highly optimized, sub-billion parameter embedding models that balance semantic accuracy with minimal memory footprints.

| Embedding Model | Provider | Parameters | MTEB Score | Hardware Feasibility (16GB GPU with gpt-oss:20b) |
| :---- | :---- | :---- | :---- | :---- |
| **Qwen3-Embedding-8B** | Alibaba | \~8B | 70.58 | Unfeasible without aggressive CPU offloading.19 |
| **BGE-M3** | BAAI | 568M | 63.0 | Feasible (fits within remaining 2GB VRAM boundary).20 |
| **EmbeddingGemma-300M** | Google | 300M | N/A | Highly Feasible (runs in \<200MB RAM).21 |
| **Nomic-Embed-Text-v1.5** | Nomic AI | 137M | 62.4 | Optimal for pure CPU execution fallback.21 |

Table 2: Evaluation of Local Embedding Models for Constrained Edge Devices 19

For the Zuberi implementation, **BGE-M3** represents the optimal architectural choice.20 Despite its compact 568M parameter size, it natively supports over 100 languages and handles context windows up to 8,192 tokens. Crucially, BGE-M3 is uniquely engineered to generate dense vectors, sparse vectors, and multi-vector representations simultaneously.20 This allows Chroma to execute advanced hybrid retrieval mechanisms without requiring a secondary model to extract keywords. If VRAM availability fluctuates during intense generation tasks, the **Nomic-Embed-Text-v1.5** model serves as an ideal fallback, as its 137M parameters can execute semantic queries on a standard CPU in milliseconds.21

## **2.3 Metadata Schema Design and Query Patterns**

Vectors alone are insufficient for accurate long-term memory retrieval; they must be enriched with structured metadata to permit pre-filtering and exact-match scoping.10 Chroma's indexing behavior applies a hierarchical precedence for metadata configurations: key-specific overrides take highest priority, followed by data-type defaults, and finally built-in system defaults.15

To prevent context collapse—a scenario where the agent retrieves a memory from an entirely unrelated project simply because the vector similarity was high—the Chroma metadata schema for Zuberi requires precise taxonomy. With the recent introduction of metadata arrays in Chroma v2026.2, the system can leverage powerful $contains and $not\_contains filtering operators.22

The optimal metadata schema for indexing Zuberi's conversational turns includes:

* session\_id (String): The unique UUID of the conversation, allowing the agent to isolate queries strictly to the current context or explicitly search the global archive.  
* dag\_nodes (Array of Integers): The specific CXDB turn\_id pointers associated with the synthesized chunk, enabling the system to fetch the raw forensic transcript if the semantic summary is insufficient.  
* timestamp (Integer): The Unix epoch time of the memory creation, utilized by the post-processing pipeline to calculate temporal decay.  
* entities (Array of Strings): Extracted named entities, tools, or concepts (e.g., \`\`). This allows the agent to apply a strict $contains filter to narrow the search space drastically before the computationally expensive HNSW vector similarity calculation occurs.23  
* memory\_tier (String): Categorization tags such as preference (evergreen user traits), fact (domain knowledge), or operational (status of an ongoing script) to prioritize retrieval weighting.

## **3\. OpenClaw Session Synchronization and Frontend Bridging**

The orchestration layer of the Zuberi architecture relies on OpenClaw v2026.3.8 to serve as the gateway connecting the LLM, the memory stores, and the user interface. Bridging the asynchronous, event-driven nature of OpenClaw with the deterministic DAG of CXDB and the reactive state of the Tauri frontend requires precise synchronization patterns.

## **3.1 Overriding Legacy Persistence via ContextEngine**

By default, OpenClaw maintains a mutable key/value map called sessions.json to track high-level metadata (such as token counters and current session IDs) and persists the actual chat payload in append-only .jsonl files.5 To force OpenClaw to utilize CXDB as its primary source of truth, the architecture leverages the ContextEngine plugin interface.6

The plugin intercepts the core conversational loop through a sequence of typed lifecycle hooks 6:

1. **bootstrap**: Triggered upon Gateway initialization. The plugin establishes the persistent TCP connection to the CXDB binary port (9009) and initializes the local Chroma DuckDB client.3  
2. **ingest**: When a user dispatches a message, this hook intercepts the raw payload before it reaches the legacy .jsonl system.24 The plugin serializes the data via Msgpack and transmits an APPEND\_TURN frame to CXDB, retrieving a newly minted turn\_id to map back to OpenClaw's internal state.3  
3. **assemble**: Prior to executing the LLM, this hook orchestrates the prompt construction.24 It executes semantic queries against Chroma to retrieve historical context and merges it with the immediate short-term history fetched from the CXDB DAG.  
4. **afterTurn**: Triggered when the LLM finishes generating a response. It appends the assistant's output to CXDB, calculates token usage, and asynchronously dispatches a background task to generate a semantic summary for Chroma ingestion.24

## **3.2 Exposing State to the Tauri v2 Frontend**

The ZuberiChat frontend is built using Tauri v2 and React, eliminating the need for an electron-heavy runtime. Tauri utilizes a secure Inter-Process Communication (IPC) bridge to communicate between the Rust backend and the web view.25

To maintain a responsive UI without polling the database, the system relies on Tauri's Emitter trait.25 When the OpenClaw gateway processes a turn, it fires an event over its local WebSocket control plane (127.0.0.1:18789), which the Tauri Rust backend is monitoring.26

Upon receiving this signal, the Tauri backend executes an HTTP GET request to the CXDB REST API (/v1/contexts/:id/turns?view=typed) to retrieve the newly projected, human-readable JSON payload.2 The Rust backend then utilizes the app.emit("turn-updated", payload) function to push the serialized data across the IPC boundary to the React frontend.25 The React application, managed by a global state container such as Zustand, listens for this event and instantly reconciles the chat view and the conversational sidebar.28 This unidirectional flow guarantees that CXDB remains the absolute authority on state, and the UI serves merely as a reactive projection.

## **3.3 Recovering and Resuming Contexts**

When the user launches ZuberiChat after a system reboot, the Tauri application must accurately reconstruct the conversational timeline. OpenClaw provides a GET\_HEAD binary command to identify the latest turn of any given context.2

To populate the chat interface, the application queries CXDB for the head pointer of the active session, and subsequently issues a GET\_LAST command with a specified limit (e.g., limit: 50).3 The CXDB server traverses the DAG backward from the head, loading the records and projecting the Msgpack blobs into typed JSON.2

Crucially, because CXDB bypasses OpenClaw's lossy .jsonl compaction, the frontend can render the entire chronological transcript exactly as it occurred, even if the OpenClaw agent is currently operating on a heavily compressed summary of those exact same turns to save context window space. This solves a major architectural pain point where compacted UI histories suddenly appear disjointed to the user.

## **4\. Memory-Augmented Retrieval and Agentic Recall**

Providing an LLM with unrestricted access to a massive vector database introduces a high risk of context pollution. If the agent arbitrarily pulls sprawling, irrelevant text into its active prompt, reasoning quality degrades rapidly, latency spikes, and token costs compound exponentially.29 Effective Retrieval-Augmented Generation (RAG) within an autonomous agent requires strict prompting discipline and structural formatting.

## **4.1 The Harmony Response Format and CoT Suppression**

The reasoning engine for Zuberi, gpt-oss:20b, was uniquely post-trained on OpenAI's proprietary "Harmony" response format.16 Traditional models rely on variations of ChatML (using tags like \<|im\_start|\> and \<think\>), which intermingle the chain-of-thought (CoT) reasoning directly with the user-facing output.31

Harmony introduces a strict, machine-parseable multi-channel architecture governed by specialized control tokens (\<|start|\>, \<|channel|\>, \<|message|\>, \<|return|\>).32 Every output generated by the assistant must be directed into one of three distinct channels:

1. **analysis**: A hidden channel utilized exclusively for the model's internal reasoning and strategic planning.33  
2. **commentary**: A channel dedicated to tool-use preambles and executing function calls.33  
3. **final**: The sanitized, finalized response intended for display in the chat UI.33

This architecture is exceptionally advantageous for RAG. By isolating the thought process, the model can extract raw documents from Chroma, debate their relevance within the hidden analysis channel, and synthesize only the most vital, accurate information into the final channel. The user never sees the messy database extracts.

However, a critical implementation hurdle exists. Standard implementations of Ollama attempt to suppress internal reasoning using the \--think=false or /set nothink commands to speed up inference.34 Current bug reports indicate this feature fails silently for the gpt-oss:20b model, causing the model to continuously leak its CoT traces.35 To mitigate this, the OpenClaw gateway must manually parse the Harmony format at the stream level, identifying the \<|channel|\>analysis tag and programmatically dropping those tokens before they are forwarded over the WebSocket to the Tauri frontend.36

## **4.2 System Prompt Triggers for Proactive Recall**

To enable Zuberi to fetch memories autonomously without relying on the user to explicitly command "search your memory," the system prompt must define precise operational triggers. OpenClaw allows developers to inject instructions directly into the system context via the before\_prompt\_build lifecycle hook, utilizing the prependSystemContext field to optimizeKV caching.6

The system prompt defines a strict behavioral protocol for the agent:

1. **Identity and Temporal Grounding:** Explicitly defines the current date and time to allow the model to understand chronological relevance.  
2. **The "Check Context First" Protocol:** A critical directive forcing the model to query the database before hallucinating facts. For example: *"CRITICAL: Before formulating a plan or answering queries regarding user preferences or historical configurations, you must execute the memory\_search tool. Output the tool call to the commentary channel."*.33  
3. **Pre-Compaction Flush:** OpenClaw features an automatic "memory flush" mechanism.39 When a session nears its token limit, the gateway triggers a silent, background turn. The system prompt instructs the agent: *"Session nearing compaction limit. Extract all durable decisions, user preferences, and unresolved operational states from the current transcript and write them to memory using memory\_get and tool outputs, replying with NO\_REPLY when finished."*.39

## **4.3 Mitigating Context Pollution**

To prevent the retrieval pipeline from overwhelming the LLM with repetitive or stale data, the backend bridging Chroma and OpenClaw applies two programmatic filters before returning search results to the agent:

* **Maximal Marginal Relevance (MMR):** This reranking algorithm penalizes search results that are semantically identical to documents already selected for the prompt.39 If the model searches for "Tailscale config," MMR ensures the top 5 results represent diverse aspects of the configuration rather than 5 identical copies of the same paragraph.  
* **Temporal Decay (Recency Boost):** A mathematical penalty applied to the vector similarity score based on the memory's age.39 Utilizing a half-life function (e.g., 30 days), a system preference recorded a month ago will have its base similarity score reduced by 50%, ensuring that recent contextual shifts outrank obsolete data.39

## **5\. Conversation Metadata Management**

For ZuberiChat to function as a seamless graphical interface, the raw chronological text stored in CXDB must be augmented with high-level navigational metadata, including auto-generated titles, categorical tags, and UI-friendly pagination.

## **5.1 Auto-Titling and Asynchronous Tagging**

Relying on the primary gpt-oss:20b model to generate a title every time a user sends a message creates unacceptable latency. Instead, this metadata generation is deferred to a background process triggered by the OpenClaw afterTurn plugin hook.6

Once a conversation reaches a predefined threshold (e.g., four distinct user-agent exchanges), the background worker extracts the transcript from CXDB and executes a rapid, low-latency LLM call (either utilizing gpt-oss:20b on its low reasoning effort setting, or offloading to a smaller model).40 The prompt strictly enforces a JSON output containing a concise, 4-word title and an array of relevant topic tags.

This generated JSON is subsequently dispatched to both storage engines:

1. It is appended to the CXDB session's root node as extended metadata, allowing the Tauri frontend to fetch it and render the title in the conversational sidebar.41  
2. It is injected into the Chroma database as document-level metadata, ensuring that future semantic searches can be explicitly filtered by the generated tags using the $contains operator.23

## **5.2 Cursor-Based Pagination**

Because CXDB relies on a Turn DAG rather than a flat relational table, traditional offset-based pagination (e.g., SELECT \* LIMIT 50 OFFSET 100\) is highly inefficient and prone to race conditions if the DAG branches concurrently during traversal.

To implement the conversational scroll in the ZuberiChat frontend, the system uses cursor-based pagination relying on the turn\_id and parent\_turn\_id pointers. When a user scrolls up to view older messages, the React frontend identifies the parent\_turn\_id of the oldest visible message. It dispatches a request to the CXDB HTTP gateway (GET\_LAST logic) using that specific ID as the cursor.3 The Rust server traverses the DAG backward from that exact node, returning a deterministic, immutable segment of the history. This guarantees that UI updates remain perfectly synchronized with the underlying data structure.

## **6\. Local-First Security and Data Sovereignty**

The foundational mandate of the Zuberi deployment is strict local-only processing. The agent must operate without external cloud dependencies or third-party API calls, necessitating rigorous security protocols at the network, storage, and application layers to protect the user's data sovereignty.

## **6.1 Network Isolation and Tailscale Integration**

All inter-process communication within the Zuberi stack occurs over the local loopback interface. The Tauri frontend communicates with the OpenClaw Gateway via WebSocket (127.0.0.1:18789), while OpenClaw communicates with CXDB via the binary protocol (127.0.0.1:9009).3

To permit remote access to the Zuberi agent (e.g., querying the agent from a mobile device while away from the host machine) without exposing the system to the public internet, the architecture integrates Tailscale. Tailscale establishes a secure, WireGuard-backed peer-to-peer mesh network.26 By binding the OpenClaw Gateway and the CXDB HTTP API exclusively to the Tailscale network interface (CXDB\_BIND=100.x.y.z:9009 and CXDB\_HTTP\_BIND=100.x.y.z:9010), remote authenticated clients can securely access the agent with end-to-end encryption, bypassing the need for public DNS resolution, reverse proxies, or open firewall ports.1

## **6.2 Encryption at Rest**

While the network layer is secured via Tailscale, protecting the physical data on disk requires explicit configurations. Neither CXDB nor Chroma natively provides Transparent Data Encryption (TDE) for their underlying storage files (such as SQLite indices, DuckDB files, or Parquet CAS blobs) in their standard open-source releases.42

To satisfy the encryption at rest requirement, the architecture must rely on volume-level or filesystem-level cryptography.

1. **Full Disk Encryption (FDE):** The primary defense is OS-level encryption (LUKS on Linux, FileVault on macOS, or BitLocker on Windows) configured with AES-256.43  
2. **Filesystem-level Encryption:** For finer granularity, utilities like fscrypt or eCryptfs are utilized to selectively encrypt the specific directories containing the OpenClaw workspace (\~/.openclaw/workspace), the CXDB storage directory (/var/lib/cxdb/blobs.pack), and the Chroma persistent client directories.1

## **6.3 Sensitive Data Handling and Memory Boundaries**

While the disk is secured against physical theft, the LLM itself poses a logical risk of context leakage. If a user discusses highly sensitive Personally Identifiable Information (PII) or financial data, the agent might inadvertently recall that data through Chroma and inject it into a completely unrelated, less secure session.

To mitigate this, OpenClaw implements strict session isolation via the dmScope: "per-channel-peer" configuration, ensuring that different interfaces or users cannot bleed context into one another.44 Furthermore, the custom ContextEngine plugin enforces strict access control lists (ACLs) during the assemble hook. Memories extracted and stored in Chroma inherit the exact sessionKey of their origin. The retrieval pipeline enforces a strict boundary: a semantic query triggered in a shared or group session is explicitly forbidden from querying vector embeddings tagged with a private session ID, ensuring that sensitive data remains cryptographically sequestered within its original context.44

## **7\. Reference Implementations and Architectural Ecosystem**

The integration of CXDB, Chroma, and OpenClaw represents a highly specific, modular approach to agentic memory. Analyzing this stack against prominent industry reference implementations reveals the unique strengths and operational differences of the Zuberi architecture.

## **7.1 OpenClaw Memory Plugins**

The v2026.3.8 update to OpenClaw fundamentally shifted the paradigm from hardcoded memory management to the pluggable ContextEngine.45 Several official plugins demonstrate the versatility of this approach:

* **lossless-claw**: This plugin serves as the primary architectural inspiration for the CXDB integration. It bypasses OpenClaw's lossy sliding-window compaction, utilizing a local SQLite database to maintain a complete DAG of conversational nodes. It operates on the philosophy that "memory is advisory, evidence is authoritative, \[and the\] transcript is forensic".7 Integrating CXDB elevates this concept by replacing SQLite with a dedicated, high-throughput Rust binary designed explicitly for immutable append operations.  
* **memory-graphiti (Graphiti by Zep)**: This architecture relies on temporal knowledge graphs (Neo4j or FalkorDB) paired with SpiceDB for authorization.46 It maps relationships between entities over time (e.g., "User \-\> prefers \-\> Rust"). While highly effective for complex, multi-hop relational queries, graph databases introduce significant computational overhead and latency.47 The Zuberi stack opts for the simplicity and speed of a pure vector store (Chroma) combined with an immutable DAG (CXDB), achieving comparable recall without the graph processing penalty.

## **7.2 Ecosystem Comparisons**

* **Mem0**: Mem0 focuses heavily on user-level personalization and preference extraction across sessions.48 While excellent for extracting discrete, static facts (e.g., dietary restrictions), it struggles with high-fidelity, long-horizon operational logging of code execution. The Zuberi stack delegates this preference extraction to Chroma's semantic indexing, while relying on CXDB to guarantee the operational transcript is never lost.  
* **MemGPT**: MemGPT pioneered the concept of an "Operating System" for LLMs, utilizing tiered memory paging (Main Context, Recall Memory, and Archival Memory) to manage infinite context.50 The Zuberi architecture effectively emulates this tiering via OpenClaw: the LLM's active context window functions as Main Context, CXDB sequential traversal functions as Recall Memory, and Chroma RAG serves as the deep Archival Memory.50  
* **Ruflo and Automaton**: These frameworks approach agent design through rigid, flow-based visual routing (Ruflo) or strict finite-state machines (Automaton). They restrict the LLM to pre-defined paths. In contrast, the Zuberi stack utilizes OpenClaw's dynamic, ReAct-style LLM routing. The agent is free to orchestrate its own tool calls and decide when to search its memory, constrained only by the deterministic validation of the ContextEngine hooks and the Harmony format boundaries, resulting in a significantly more fluid and adaptable autonomous assistant.

## **Conclusion**

The architecture underpinning the Zuberi local AI assistant represents a highly sophisticated synthesis of modern agentic technologies. By completely decoupling the immutable conversational transcript from the LLM's transient, active context window, the system successfully escapes the constraints of sliding-window amnesia.

CXDB provides a highly resilient, deduplicated, and branch-friendly foundation for preserving the raw conversational state with mathematical precision. Concurrently, Chroma empowers the system with deep semantic recall, localized efficiently to consumer edge hardware through highly compressed embedding models like BGE-M3. The orchestrating layer, OpenClaw v2026.3.8, elegantly bridges these disparate data stores through its ContextEngine hooks, orchestrating a complex, automated dance of data ingestion, RAG assembly, and lossless compaction. Finally, the Tauri v2 frontend, reacting dynamically to binary projections via its IPC event system, provides a fluid, real-time interface. Supported by the rigorous multi-channel Harmony formatting of gpt-oss:20b and secured entirely within an encrypted Tailscale perimeter, this architecture establishes a robust, highly private, and cognitively persistent infrastructure for the next generation of localized autonomous agents.

#### **Works cited**

1. strongdm/cxdb \- GitHub, accessed March 12, 2026, [https://github.com/strongdm/cxdb](https://github.com/strongdm/cxdb)  
2. cxdb/docs/architecture.md at main \- GitHub, accessed March 12, 2026, [https://github.com/strongdm/cxdb/blob/main/docs/architecture.md](https://github.com/strongdm/cxdb/blob/main/docs/architecture.md)  
3. cxdb/docs/protocol.md at main \- GitHub, accessed March 12, 2026, [https://github.com/strongdm/cxdb/blob/main/docs/protocol.md](https://github.com/strongdm/cxdb/blob/main/docs/protocol.md)  
4. cxdb/docs/http-api.md at main \- GitHub, accessed March 12, 2026, [https://github.com/strongdm/cxdb/blob/main/docs/http-api.md](https://github.com/strongdm/cxdb/blob/main/docs/http-api.md)  
5. Session Management Deep Dive \- OpenClaw, accessed March 12, 2026, [https://docs.openclaw.ai/reference/session-management-compaction](https://docs.openclaw.ai/reference/session-management-compaction)  
6. Releases · openclaw/openclaw \- GitHub, accessed March 12, 2026, [https://github.com/openclaw/openclaw/releases](https://github.com/openclaw/openclaw/releases)  
7. Martian-Engineering/lossless-claw: Lossless Claw — LCM (Lossless Context Management) plugin for OpenClaw \- GitHub, accessed March 12, 2026, [https://github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)  
8. Plugins \- OpenClaw, accessed March 12, 2026, [https://docs.openclaw.ai/tools/plugin](https://docs.openclaw.ai/tools/plugin)  
9. Your local agent needs Ozempic \- How to run a locally-inferenced small model OpenClaw agent without ever typing /new. Actually, two smaller models \> one. : r/LocalLLaMA \- Reddit, accessed March 12, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1rrsuit/your\_local\_agent\_needs\_ozempic\_how\_to\_run\_a/](https://www.reddit.com/r/LocalLLaMA/comments/1rrsuit/your_local_agent_needs_ozempic_how_to_run_a/)  
10. Chroma DB: The Ultimate Vector Database for AI and Machine Learning Revolution, accessed March 12, 2026, [https://metadesignsolutions.com/chroma-db-the-ultimate-vector-database-for-ai-and-machine-learning-revolution/](https://metadesignsolutions.com/chroma-db-the-ultimate-vector-database-for-ai-and-machine-learning-revolution/)  
11. AI Agent Chroma Storage: Complete Setup Guide \- Fast.io, accessed March 12, 2026, [https://fast.io/resources/ai-agent-chroma-storage/](https://fast.io/resources/ai-agent-chroma-storage/)  
12. python \- Chroma db persist to local \- bad allocation error \- Stack Overflow, accessed March 12, 2026, [https://stackoverflow.com/questions/76579245/chroma-db-persist-to-local-bad-allocation-error](https://stackoverflow.com/questions/76579245/chroma-db-persist-to-local-bad-allocation-error)  
13. Look at Your Data \- Chroma Docs, accessed March 12, 2026, [https://docs.trychroma.com/guides/build/look-at-your-data](https://docs.trychroma.com/guides/build/look-at-your-data)  
14. Semantic Caching and Memory Patterns for Vector Databases \- Dataquest, accessed March 12, 2026, [https://www.dataquest.io/blog/semantic-caching-and-memory-patterns-for-vector-databases/](https://www.dataquest.io/blog/semantic-caching-and-memory-patterns-for-vector-databases/)  
15. Schema Basics \- Chroma Docs, accessed March 12, 2026, [https://docs.trychroma.com/cloud/schema/schema-basics](https://docs.trychroma.com/cloud/schema/schema-basics)  
16. openai/gpt-oss-20b \- Hugging Face, accessed March 12, 2026, [https://huggingface.co/openai/gpt-oss-20b](https://huggingface.co/openai/gpt-oss-20b)  
17. Best Local LLMs for Every NVIDIA RTX 50 Series GPU \- ApX Machine Learning, accessed March 12, 2026, [https://apxml.com/posts/best-local-llms-for-every-nvidia-rtx-50-series-gpu](https://apxml.com/posts/best-local-llms-for-every-nvidia-rtx-50-series-gpu)  
18. gpt-oss \- PyPI, accessed March 12, 2026, [https://pypi.org/project/gpt-oss/](https://pypi.org/project/gpt-oss/)  
19. Best Open-Source LLMs for RAG in 2026: 10 Models Ranked by Retrieval Accuracy, accessed March 12, 2026, [https://blog.premai.io/best-open-source-llms-for-rag-in-2026-10-models-ranked-by-retrieval-accuracy/](https://blog.premai.io/best-open-source-llms-for-rag-in-2026-10-models-ranked-by-retrieval-accuracy/)  
20. 10 Best Embedding Models 2026: Complete Comparison Guide \- Openxcell, accessed March 12, 2026, [https://www.openxcell.com/blog/best-embedding-models/](https://www.openxcell.com/blog/best-embedding-models/)  
21. The Best Open-Source Embedding Models in 2026 \- BentoML, accessed March 12, 2026, [https://www.bentoml.com/blog/a-guide-to-open-source-embedding-models](https://www.bentoml.com/blog/a-guide-to-open-source-embedding-models)  
22. Changelog \- Chroma, accessed March 12, 2026, [https://www.trychroma.com/changelog](https://www.trychroma.com/changelog)  
23. Concepts \- Chroma Cookbook, accessed March 12, 2026, [https://cookbook.chromadb.dev/core/concepts/](https://cookbook.chromadb.dev/core/concepts/)  
24. OpenClaw v2026.3.7 ContextEngine Guide: From Upgrade to Custom Plugin Development, accessed March 12, 2026, [https://www.shareuhack.com/en/posts/openclaw-v2026-3-7-contextengine-guide](https://www.shareuhack.com/en/posts/openclaw-v2026-3-7-contextengine-guide)  
25. Calling the Frontend from Rust \- Tauri, accessed March 12, 2026, [https://v2.tauri.app/develop/calling-frontend/](https://v2.tauri.app/develop/calling-frontend/)  
26. Gateway Protocol \- OpenClaw, accessed March 12, 2026, [https://docs.openclaw.ai/gateway/protocol](https://docs.openclaw.ai/gateway/protocol)  
27. Reference Architecture: OpenClaw (Early Feb 2026 Edition, Opus 4.6) \- Robot Paper, accessed March 12, 2026, [https://robotpaper.ai/reference-architecture-openclaw-early-feb-2026-edition-opus-4-6/](https://robotpaper.ai/reference-architecture-openclaw-early-feb-2026-edition-opus-4-6/)  
28. How to Move Active Conversations to Sidebar After Initiation in MERN Chat App?, accessed March 12, 2026, [https://stackoverflow.com/questions/79130982/how-to-move-active-conversations-to-sidebar-after-initiation-in-mern-chat-app](https://stackoverflow.com/questions/79130982/how-to-move-active-conversations-to-sidebar-after-initiation-in-mern-chat-app)  
29. Why AI Agents like OpenClaw Burn Through Tokens and How to Cut Costs \- Milvus Blog, accessed March 12, 2026, [https://milvus.io/blog/why-ai-agents-like-openclaw-burn-through-tokens-and-how-to-cut-costs.md](https://milvus.io/blog/why-ai-agents-like-openclaw-burn-through-tokens-and-how-to-cut-costs.md)  
30. How to fine-tune OpenAI's gpt-oss-20b for industry defining applications. | by meta-hegel, accessed March 12, 2026, [https://medium.com/@meta-hegel/how-to-fine-tune-openais-gpt-oss-20b-for-industry-defining-applications-f04ffab66179](https://medium.com/@meta-hegel/how-to-fine-tune-openais-gpt-oss-20b-for-industry-defining-applications-f04ffab66179)  
31. ChatML vs Harmony: Understanding the new Format from OpenAI \- Hugging Face, accessed March 12, 2026, [https://huggingface.co/blog/kuotient/chatml-vs-harmony](https://huggingface.co/blog/kuotient/chatml-vs-harmony)  
32. What is GPT OSS Harmony Response Format? | by Cobus Greyling \- Medium, accessed March 12, 2026, [https://cobusgreyling.medium.com/what-is-gpt-oss-harmony-response-format-a29f266d6672](https://cobusgreyling.medium.com/what-is-gpt-oss-harmony-response-format-a29f266d6672)  
33. OpenAI Harmony Response Format, accessed March 12, 2026, [https://developers.openai.com/cookbook/articles/openai-harmony/](https://developers.openai.com/cookbook/articles/openai-harmony/)  
34. Thinking \- Ollama's documentation, accessed March 12, 2026, [https://docs.ollama.com/capabilities/thinking](https://docs.ollama.com/capabilities/thinking)  
35. set nothink or \--think=false Not working for gpt-oss:20b · Issue \#11751 \- GitHub, accessed March 12, 2026, [https://github.com/ollama/ollama/issues/11751](https://github.com/ollama/ollama/issues/11751)  
36. harmony \- vLLM, accessed March 12, 2026, [https://docs.vllm.ai/en/stable/api/vllm/entrypoints/openai/responses/harmony/](https://docs.vllm.ai/en/stable/api/vllm/entrypoints/openai/responses/harmony/)  
37. openai/gpt-oss-20b · How to turn off thinking mode \- Hugging Face, accessed March 12, 2026, [https://huggingface.co/openai/gpt-oss-20b/discussions/86](https://huggingface.co/openai/gpt-oss-20b/discussions/86)  
38. \[Bug\]: Streaming tool call randomly failed when using gpt-oss-120b/20b \#27641 \- GitHub, accessed March 12, 2026, [https://github.com/vllm-project/vllm/issues/27641](https://github.com/vllm-project/vllm/issues/27641)  
39. Memory \- OpenClaw, accessed March 12, 2026, [https://docs.openclaw.ai/concepts/memory](https://docs.openclaw.ai/concepts/memory)  
40. Maximizing Performance with GPT OSS Fine Tuning Techniques \- Cognativ, accessed March 12, 2026, [https://www.cognativ.com/blogs/post/maximizing-performance-with-gpt-oss-fine-tuning-techniques/325](https://www.cognativ.com/blogs/post/maximizing-performance-with-gpt-oss-fine-tuning-techniques/325)  
41. How to modify metadata for ChromaDB collections? \- Stack Overflow, accessed March 12, 2026, [https://stackoverflow.com/questions/79088240/how-to-modify-metadata-for-chromadb-collections](https://stackoverflow.com/questions/79088240/how-to-modify-metadata-for-chromadb-collections)  
42. Security \- Chroma Cookbook, accessed March 12, 2026, [https://cookbook.chromadb.dev/security/](https://cookbook.chromadb.dev/security/)  
43. Top 10 Database Security Best Practices for Product Teams in 2026 \- Querio, accessed March 12, 2026, [https://querio.ai/blogs/database-security-best-practices](https://querio.ai/blogs/database-security-best-practices)  
44. Session Management \- OpenClaw, accessed March 12, 2026, [https://docs.openclaw.ai/concepts/session](https://docs.openclaw.ai/concepts/session)  
45. Unpacking OpenClaw's Massive 2026.3.7 Update: Pluggable ContextEngine Redefines Agentic Architecture | Epsilla Blog, accessed March 12, 2026, [https://epsilla.com/blogs/2026-03-09-openclaw-2026-3-7-contextengine-agentic-architecture](https://epsilla.com/blogs/2026-03-09-openclaw-2026-3-7-contextengine-agentic-architecture)  
46. Contextable/openclaw-memory-graphiti: Two-layer memory ... \- GitHub, accessed March 12, 2026, [https://github.com/Contextable/openclaw-memory-graphiti](https://github.com/Contextable/openclaw-memory-graphiti)  
47. Agent memory: Letta vs Mem0 vs Zep vs Cognee \- Community, accessed March 12, 2026, [https://forum.letta.com/t/agent-memory-letta-vs-mem0-vs-zep-vs-cognee/88](https://forum.letta.com/t/agent-memory-letta-vs-mem0-vs-zep-vs-cognee/88)  
48. Which one is better for GraphRAG?: Cognee vs Graphiti vs Mem0 : r/Rag \- Reddit, accessed March 12, 2026, [https://www.reddit.com/r/Rag/comments/1qgbm8d/which\_one\_is\_better\_for\_graphrag\_cognee\_vs/](https://www.reddit.com/r/Rag/comments/1qgbm8d/which_one_is_better_for_graphrag_cognee_vs/)  
49. AI Memory Benchmark: Mem0 vs OpenAI vs LangMem vs MemGPT, accessed March 12, 2026, [https://mem0.ai/blog/benchmarked-openai-memory-vs-langmem-vs-memgpt-vs-mem0-for-long-term-memory-here-s-how-they-stacked-up](https://mem0.ai/blog/benchmarked-openai-memory-vs-langmem-vs-memgpt-vs-mem0-for-long-term-memory-here-s-how-they-stacked-up)  
50. The Future of AI Agents: How External Memory, Mem0, and MemGPT Are Transforming Long-Term Context Management | by HARI KRISHNA BEKKAM | Medium, accessed March 12, 2026, [https://medium.com/@harikrishnabekkam1590852/the-future-of-ai-agents-how-external-memory-mem0-and-memgpt-are-transforming-long-term-context-23f4ec88f66d](https://medium.com/@harikrishnabekkam1590852/the-future-of-ai-agents-how-external-memory-mem0-and-memgpt-are-transforming-long-term-context-23f4ec88f66d)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAYCAYAAAD3Va0xAAABqElEQVR4Xo1TsUoDQRDdgTSnYBACYmkpCFeIhWBjsAjY2Z59GkHwC9LamEIrU1nZSOrgF/gF+gN2IjY2Wqhvd2ezM7cT9YXZmXsz83Z22Tg3B+Env9IydyGSNRkkixY1a6HsFoladKEsm1tCRnuAzdtzWthH/gX+Oxi5GXwlWlZg9+BDnmLNFPGymp6BL7qG/0T0Ab+bWOGOYHew6rfzrcJuYKcuTnYVKrTQGaKmPJxmahBjUOuInxA/w2+kJPgOlgmiOreIrEADYsjUCLGf6iQlwfewYGLyk+fecjx3AXab4y3YG+wB1mVuD02XHDNICoVr4PuhHpMd2C3sC8kB1wyxNKItLq2JahDjlOZ1QF4oCFIFPwEf7idpWEJ+p6GmXJfi0fwR++QnpjB5hBLK+/uz7/ARJI5dfAqPsPNIyQpdnd5Puh+ZX0OMpxDE+H44KSZJH30sU8RL7Ty7EewVtmlqAAewd5f/X/5vcdgucvEpzMhPXiR1YQQX2bV6xBJFl0nZ+KuwGEbGVp/FaejjFPWKKLZcjGKiROSEVrD1CoUcGxoB/9lAxj+jizPUXRLxzAAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAYAAAD+4+QTAAACfElEQVR4Xo2Vv2sVQRDHd5DAE8WHCgo2PkUiFsKDaGGhlQgpnggqiLG11c6AbbDxHxDsUgTsgyIE1DIgCBYqCEERxcrOFNroZ2Z2b3/cRRzy3Zn5zuzM7N7dSwgqYqtLtEsqiQySinKT5M3GF34lLRmTe3Tjm1RDxiaZ6m9JZcs1SfLKEm2F1h+QNqXx23CUPl0zuyFuoh+Dh+BkGcxn7ZU5DXcdfUgPA/aizpO21KaOITbQK8GSwhT/Pfpqr2SSHLgB/nQQ01/QUx8sj7cMXoP9vs/IJfAB67BzA2dwmYEtYlvoTXAX7LOIHs1zRAtrg9WyCPZZ1E+My86n9JwTXW2yXO9NufkUp1A/8Fe7JOcXwDbOAydjLBrFC21NklNOUTammGyjuyYqkpoEKXhJf+6ZITMMzXlOgCuTT+A2/q5uG4GZ2EMri9mksUmveTVh8JO8gD0Q+RPgK7iX55GwqE3EijkXIwsYTZOmvMsIfuSmxXVZC97oWKIXZGDi0F1Xw+fxarK29CXSV3kxMcfBdw2kRBfx5hLuV2xEXOZZvoH1YB9zJ9ZE9Cq9h+gX+grnKXrUFZBwkfU3UJ1kDI4Ee+SWma50XXITIarXpbzeRmRDuBX0K9U79Aa6rrBuskELK3mQ5S34Bc7FrcRkjeRJbKoyEf8w9edpLp7YAnMYj9AvqX8l+M/LOxpMU0fRE0t4hvkR76jXs81nwBug13oHfIZ+Asa+r8tzC3Me/xr2hWCNs+S0gpCuyB6WS9g64ESJXDy3KqQmBlN60uzZeYPYE/vP/3+V5KlL3aPaY8kO4wxxfbb1+0zrq0SuHKhbB/Lr+QYSShkMD5L/EPL/AqI2UWwhHsKUAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYCAYAAACIhL/AAAADZElEQVR4Xp1WTYjPQRh+JxRF6ytaH5fNZeNA7OaAgyQOKClqL26cfcZpHRxctEkpF/ZEcUW52CJp3dRGIa02QsvFTaznmXfmP/POb37/3fap5zcz7/vOzDPfPxHC+a8mIZ+jYpKqtWLyyO1ziTGmXFyRK2vVYyzaa9fQ1n5h8Gmj5YbyWRFCl4KLjaM7FoE9qTjHDoPGVfjsR/4YSv3ILygiyvxW8I6ww1n6SW5HgSMwHE1eb7fFDA6uPUjHwSfgkNI9Rfoe9QZMdMIG8Bm4uXQELAFPgssLO4GJkMfod7CLLg+O5hr4CYJKIfTdBn+B2wofmx3BZ7jYGSvB48jfFa03iXyvujqrFHEA5CRwizScBAXcAn8KR1KFwzLLNOrdZCFzbAHfhVShHVDgEXAHeB+clEygotMM9+FLlE5kToPTiP3nU8LORMytAF+DEyitzuwXkTxCvtvhGJWqQIOr4ENwYenYBH5BB2+Rrm0RR0SBoSNvpyiIk8sxqAUQ6JoCUyfEQdG2uZ8zOOwdkRnhCPIKtjLRB36VfCacT1k+FIMa1dQAgalePvgsvx2fKSkOIjflGMjl3Zc7KqCfcc/BZcHGRr+Bu1ioj8/nRpFAoGtZYi+0V2PCYEMDcQamxd91CUUHTG7gO+N4WpOHAj+Lpt1gZrAFUctQPtJgDPsjc2i+Y9govAdFfoi967zAINSjMTCFCtQtoeiMu4Mo8EwyOX8aJ7yjrbKffXdJdJ+eLTrWGXTZDBp3ByrQLLFV6MolDuCRvgf+QYjfR024QacXLS9q3pc5+tAobgB/AgOswlAKAmtL3FHIQ1i0peDLQAF8R0sBe8HvqHxd9LmySCtwqnQVQilwShpXiAFP70cpzkLEANr7gEb5Bsf3l2/xG9gh0vGNtn1qnnYOjAfIAPY1oif+t+j2IP+KXiX6IFiw3zGJz10F/FvpR2X+vXAfrJMgo0VcTPg8jTte5GbSCGtotJMQt9qwcddj2xq1qrI8/0ZeIM8HvwWVnmxzeM3cK03nhUoHFofBB1Lu08aU2XxwM7kCXoimJiqTk9BpqBvoPR/YjGy0b0J2i/4kpD/r6G62pEiC2iICrJs3wDlwp7F65IFG7XrRv5ieaowpVvwNexvmHGiRalQ6N5hnB3XMpZ22GLsJ/wN0DXqPNLPYFwAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAXCAYAAABu8J3cAAAC4UlEQVR4Xp1VTYiNURh+T0NRkzGUyU+JBdlNXZSS1WxmcRFTyljYiJ2yUcpKNpY2SprclSFbUhYUC2VlgbJCyko2ZoH8PO/7nnO+97zfufd+PDz3nPP+Pud833eGyCDgXwG7rLicqQXvD97QiqjBxHQJbyEpTd19kehvbSgvZJJWZvSFaiiLFKWKshFdStbh9OSj/qeKSaRJcnXWgifBm7Bcw7hbfTal7KhC5GcdhvMkuXQZ3KwBKbIA9zkNrueFfy+nsHyM8QpckxhnsX6D8bh4uaMrapbbwVfgGVjXYJwH34H7mxDaAJ6A/zbGr+AHSmIdLoIvwWljW0TiWzSckVXuXChaBd4C78PO8+S/Cj7CnHfPYCFHwL3gMiUhbnPTMLCIgRRhpwbsw+QbxsM22CXvBD+TbsTiGLgC9vLRx7r4P8ABV09kD/iFWEjZpAeuBNmdKVZiDvxNWUgO6GP2B8vFZDDeQZATCeZEdCINOSCZo8vZGxVGT5+4oT0RdobGbrUnITTkHekjgpPMicikKtCBBUQhqiAiCgn+kTGckJBT+S1XIQZBnm9dSG5H4QJVdk7p0XQQonn6m3dujdaeDFZCRGzYFkLFSRUQIUGElD5980Nr5z3YWMildq2Mg+BPan81SSB/PR4ihAohOk5ieAo+IL6QmqZz+PR+wMZfRgqeArdQcx1uxeQ9xutxnXAW8fwl8hdJbudZSG1/p8CP4A5eoA/fpbhl6QVpc7ZuJL5BA33HeCDaEBaaOK28GrwH3iG58Jp2MguBhXwCt2WbASffAJ+AR0mv+tcYZ8Wr0Xz1PyS9vvlaT+A/D2y/i8B5zJcwf06xUcQm8BmICzLwI2P+IhV0zsSRHAN+d4ELmBwiFZedwyGJE6Qv90IcJ3zKqAqjnREpZnis9QyPUtRix+U4+PBy3by9Pq5AGOOvw5bu1GYMVEV5JmbVKi2GMvy/kNOa/MI0SkMnxKyuyfW4tvUv0sJwnaJvdNQAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAA8ElEQVR4Xm1Suw3CQAy1x0hHS8EC1AxAyQxslYI1GIINIjECLYLn/53Bkg/Hfh/nCBExZbDU7B371dYIYEmb+zEhIqopCppal3qLaCTSH90hmM7f4bwELTQj9sgr8o7RG7PVxFxZw2gCPKM4QuGJeo1xE7TACgsGmyj2WV96wbmBYMB4CcPJHqEvimyKKTB5Z0MVUf+xpsl92DEt7ch7CiDBmuR6JkuPdOaFFThYBz5tU1Gs+TZAKqBy8ouWf+WjSfRCPpCHGU2mrLvF5yMSpevNcRft9c8hgL0eyfZczKx/iE1bob5jzSfpYtQLmUPEF8nrGUXdWaNqAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAXCAYAAADpwXTaAAAB7UlEQVR4XoVUsUqDQQy+DIKiIOJUsCAiSAdB0Mm5OIqgQ7FvIM7Ogjjo6OjWwUfopEhn3RxcHKRQ8AXsWPRLLnfJ/f2tgTTJl+RLcraGUBWqAqVQkecgaQb+5dCeVOUJtF/MLJapglnFM4Rcox1RT+b21DUttw7tCBklSn9K2ILeIrpHeAp/QdDMQNTC5xniZwQTxD3NVC87BvAOuwNdgl5BH1GyLFmd1oI5gt2HjoBmMsfVxJ4fsF2DwgoKXmHPDcobhgbcITzbzKSL/Bi6y4G2sHmADgJvajzy0QhMRqEX8eLGO+gYiJBJKr4pD/6Cv1GMgDTgDLUAeU+G04nJKJLZIK61IZzQTeJm+c0o9eCxaQA7DtLkhhCTkeKlgIxAxmf6rcIi9Ckwmb6ZE9nMcF2A9My0mVxpnHpmDRnlzYqV9Ux9swyLXId0pg7XBNeOcMmao5KKgkzR1HSIhgm2bVsizMPpw++Lz1hUyQoZfP7u6Pz8eqvwX2AvOVBsE94IQSeGUdoChjCB/rCC4hv2DbqdirDVHswnchewJ1D+9t9A51JJqp0hsUYr8ZelA4o/v6ZVuAf569+LSErlEiX3/aU47qRsqn5FuKsGZnEJ12loYk2uOuXPzsa7RUxquLJMrVuNWVJjJZcXqmBc9wsHF0P9qVRTwQAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAYCAYAAAC8/X7cAAAD9UlEQVR4Xq1XTYhPURQ/NxQNaTIII81kQcZXmskUFpLMYqws1FhjYeVrYvXfWNhIQynUrCSZZINhQ5HF2ClRQ5pJhBA7Kfx+99z33v147/8xza9+//veOeede8+55573/iJNwHg/dpgFzJYfxSx4K4JsHf5jxXUDZw3UDfWEvzMeFoLzfcFM4Vxbf82spwxLwL3gAXA9OCdUSxzpFnAUXJwJ/PjSWJvCGnDM6GiR+vFvtMx3gRPgA3DI8RE4CfYWpgE6wcfghlBs0QE+Bf85/gB7Igenc73haD7geqPT7YTpXfESo0izMQ88D74Xb6EWxuquik6+NdCpp4tgLc5GMdif/eBP0YXW0vlNJ0TPcbEuVoCX8TscyR10Ai7wCvgd7Ct8B52HZfRN6CxcaQ/4xo31wEUfwcjsvgaXR/rN4DVwLm+i+PpFn+kKxYRaHgX/urEK7eAL8JVoWWQYhot7khzeIPg2XF8XW2qGCeAuHIyWyVI97gs8dTY3bRKsBT9KnJVki3MnU+AKJ+OiufizmZEPz0W3MLvG2jObv8FxcEFhYst3R8m8GZiAG5JnpjCsiWbkXC7JEXjjIj6JDcBoAMYGwoAG04l9gRnAzyl3w0WPQ80g+p0Vk3NL0rKycDY8A2wGi/IAjPbtJ6Lls0ftHNxT3jKop5114uTbwM/CzDkkcViYmoT+UT42adl5wvkyPIO2/nOEzgYhYLKy3bfIMsjDyUNaDyMm6yAFGMC0GwuEE7eJbv8qT8ZMs2R5oLukrP5TIABbAd35DkgRgBdZOLu7W42rSVx/lbDXY+Fm2sQBOLhntf6TQ56X7jHJ6j9GsgPyS7Rb5WA3YVeZMnEAxcM8NGdEJzuRSxV2B6oCcGD/5/M5nOusebAEH4Id4XoTMIAw0UZr7ib4R8oyoOgT+wIzfJHxfSFedMwuFzFQFrdDDdfh+VLQIGupY7gN6z8Fysy8MyUHHW9WwzfsqNg3bpCH3eAX8IKELS8DdtBwB/mCKsNS0exuihUKk7XUqud9sFXr+yZYor0xvRjein4DDRk9VPwWeikaRLS7+UuKwyg44muBZaK+su8f8hKs50SumJQ7EJXvfmHK3cEu+Z8TxtfbK35tshPx65P1tpKKyCa/9uRsiRMQtCdxEpog77oavqkvNdqp2LW4Y7m8Ei3MSfCz+xm4LxSXOGjCWYYomENiX3T2my1StuC0CkY7zW0pPycy4ygUTNB9sc0k2PkGrqIUhEj+H/MWnwqGnwtOVf1sC6BxTbR9FyuudFGiKOLwHy4x1BZ7EtweK+oh8RQK8I/QHC5WHqFc6lBX6eDbNEpOjCrDKrlFpCyZf0Zo/GxjixDN2f8HJ+iTfb9wVkcAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAYAAAD+4+QTAAACZUlEQVR4Xo2UsWtUQRDGZ5ADBSGIhSiIKKJYGThSWJgqjYUiGhDU/8FCULAKqI2VnWAjV1im1MZCwUawEAsVDIEQRLGwM4WCxN/s7L63u+9tdLjvZufbb2Z293ZPpGVaEyP2PxqzXNeN06CY7IOxHPdl12oNY2l9WDDD6WY0bg1Ngy6ttc5yq7IHXAWPYR7gT8bpoKi0tZnWcsiVm2gOdsosYQ68AHfBXjAPPoLLzbK9oZFVZKfxZ8E7xr/xl+pGt8Fbon0eBrsGPoEDGSf5BRCfe02RpTQDjuO+gjVwOHWwwjSQmQVOqX0W+PqJv1DsptzYFGyBdYmL4WCt2VOG2+BcUEGcwv2Q2CSzVOB+IuJKYxBGdsyrBE/EjznZDOE2OJ8IiinFNNtJ5NX4QfPC+sZdZjqZ7xouRODVutnWZuVJdDvZsYntqMhTucL3H3ArRNHs3EKTRESLTXyHwapVFOZzR8QvywrhpEvATVnMFoO62FTHdjLSyCmdwz8juIHfVeuOgW+aiqXm2u3kTqfMTYt+oQGwo0r0ooT3FoRqt+KV2CpEdmeZS+KPyt5ANOU26aGwBI/tY8fyUMLjK+weWMiJ6zTbxB/ts8PrfyN2TZ3cD96DX8RnXEYDlRXjaLuJzGqY/0KJDfVT6vY2wT/CvwQXxRt8APNpYxregT4Hn8V+YJ/w39MvTg9/I3aN4z+IiT3B7uIJ/DLhIsHEBbWltikq49zCTP9V0FWUlWnVq/iGLNI6Isg5G/TSUjxIlOy/NJvM/2DTcJjrzJAfWlPTT8Rlp9XbcIeVB0mzam5N0T+qNyxN/QXetVQakL8o6AAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAYAAAD+4+QTAAAChklEQVR4Xo1UO2hVQRCdITwQjJEQQRRECKIRBJVgYWFIEZAUplBBewvTiQS0jWCjIIiljQYJ2KRM6kA6LcRK8AMiIqQIomChIPHMzu7O7OeB53F2Zs/OzH7u7iMCWJpok58E1eTnxMZzaIr4PsdCdUCBajAn9JKSbjOYZfV9SJRyiB/PUh3TiB6uSLBFXFF2SAmnZte0MXRuwT4F74HHbbSaOSGtgOkE2oekuUsQDrmonHca3ETOLOw4tJuwf8Albko3E14B1yjU4AuQ31DI5cs5IkQzPYHzF1yI4jj4GtzB4EkXWeMgxC0sbo5s9mNovoEfwCMqafMI7S54I4buA7fAn6S7JHc0BqZpdH/BfiKZ0CJW0e4iZ95pPAAPoM5I6BGdgvkOboKjcbcGuw37SY/qGZRRF7JCuuhLJhU1eAydVThf4J+xoDia2/674njUsNuwciGirDl70b6kUDxs/yI4EoMy/Nt3orlM10i/751ipJM2RfrxXmBMJs+wnXRxFHwHLiNkYHLYRZMk25Mjk3NdtKK65QKxy/p91mHlrekJuMsyQHMbrnDgjuMu6SQrSchoFxYmAOWo0sgMrH5TONMk11ApvoLzDZE3lIBifLicQW4mPQb94xPcB8+l3cuDkYfznKSIrnICzSuSa8x0Nv5DT6B9C+03xs7HeWSCZdVwYZjl0gi/gp8RNylB6XDm4XyEfQBeJ936D2jpMQnwXmgDGe9JP7BATyE8vLBrT/nHkOscoTPtAWfBq+AM6SrtCzmv58vGAqOSInxkie5IrGC93FZirVbIQamE3bWy6LAy7l+gWJPr+NSiTIwZVjqgfWvVwtpOgU5+Rm+B3fI9NAGNQP+t/QNc8lIpMMjZ9AAAAABJRU5ErkJggg==>