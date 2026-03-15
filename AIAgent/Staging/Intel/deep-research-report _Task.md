# Task Taxonomy (Level 1)  
We classify user requests along key dimensions so each query matches the most suitable model. Core dimensions include:  
- **Input Modality:** If the request includes or implies an image (e.g. user says “analyze this chart” or attaches an image), route to the vision model (Qwen3-VL-8B). Otherwise treat as text-only.  
- **Task Domain:** If the user’s request explicitly involves writing or understanding code (e.g. mentions programming languages, code snippets, or “write a Python script”), route to the code-specialized model (Qwen2.5-Coder-14B).  
- **Tool/Action Requirement:** If the request requires external tools, API calls, or complex multi-step reasoning (e.g. “calculate X using a tool”, “search for recent data”, “solve a puzzle with steps”), send it to the agentic model (GPT-OSS-20B). GPT-OSS is designed for *agentic tasks* like function calling and browsing【79†L117-L125】.  
- **General Knowledge/Chat (Fallback):** All other text queries (Q&A, summarization, creative writing, etc.) go to the generalist model (Qwen3-14B). This model handles broad conversation and synthesis.  

In practice, Level 1 routing rules look like:  

- **Vision tasks:** If `input contains image` or keywords like “see image”, “photo of”, “diagram”, **→ Qwen3-VL (vision)**.  
- **Coding tasks:** If `request mentions code or programming` (keywords like “Python”, “JavaScript”, “function”, code formatting detected), **→ Qwen2.5-Coder**.  
- **Tool-heavy tasks:** If `request suggests using tools` (phrases like “use the get_weather API”, “search”, “calculate with Wolfram”, “analyze data”), or is very multi-step, **→ GPT-OSS-20B** (agentic).  
- **Default/general:** Otherwise, **→ Qwen3-14B** for standard LLM processing.  

These simple rules follow a keyword/pattern approach (rule-based)【73†L193-L201】. For example, “Create a bar chart of sales data (attached image)” is vision+data, so Qwen3-VL; “Merge these two Excel files” implies a tool/API, so GPT-OSS; “Write a function to sort a list” is coding, so Qwen2.5; while “Tell me about photosynthesis” is general, so Qwen3-14B. This covers the main use cases cleanly.  

## Level 2 – Feedback Data in CXDB  
Each routed task should log a concise record to the CXDB for later analysis. To minimize overhead, store only essential fields, such as:  

- **Query metadata:** The input query text (or summary) and detected features (e.g. “contains code”, “contains image”, “tool intent”).  
- **Chosen model:** Which model handled the request.  
- **Outcome:** A simple result indicator. For example, a *success flag* or *user satisfaction rating* (explicit feedback or inferred, e.g. “user accepted the answer”). If no explicit feedback, at least note whether the agent’s answer was used or required follow-up.  
- **Timestamp and task ID:** For record keeping and ordering.  

Example schema:  
```
task_id | timestamp     | query_text        | model_used    | input_type  | tool_flag | success_flag
12345   | 2026-03-10T14:33 | "Summarize this PDF" | Qwen3-14B | text/pdf    | false     | true  
```
Here, `input_type` could note “text” or “image” (or file type), and `tool_flag` marks if tools were invoked (true/false). We do *not* store the entire conversation or large outputs – just enough metadata to see *what was routed where* and if it succeeded. This light touch provides the data needed for analysis without huge storage or privacy concerns. As Andela’s self-improving architecture note points out, agents in a feedback loop need to *evaluate responses* to improve【83†L602-L610】. Recording success and context per task gives the raw material for that evaluation.  

## Level 3 – Autonomous Self-Improvement Architecture  
In a closed-loop fashion【83†L602-L610】, Zuberi will use the CXDB history to refine routing over time. The architecture can work as follows:  

- **Querying History:** Rather than hitting the database on *every* request, Zuberi can use heuristics: e.g. **query CXDB on low-confidence or ambiguous cases**. If a new request barely matches multiple rules, Zuberi performs a quick similarity search in CXDB (using a cached embedding index) to see how similar past queries were routed and with what success. This mimics “retrieving relevant context” step【83†L602-L610】. If many similar past tasks used Model X successfully, boost that choice.  
- **Periodic Rule Refinement:** In batch (e.g. nightly), run an analysis pass over recent CXDB logs. An LLM or simple script can scan failed or slow routes and suggest adjustments to the rules. For example, if many “tool-flagged” queries were solved by Qwen3-14B instead of GPT-OSS-20B, the rules might be updated. These updates are applied automatically (with safeguards).  
- **Confidence and Retries:** Zuberi can compute a confidence score for its rule match (e.g. how strongly a query contains code keywords). If confidence is below a threshold, it might try a fallback model or ask for clarification. After output, it can use its own critique to self-check (e.g. “Does this answer the question well?”) and, if not, consult CXDB for guidance.  

This design aligns with a self-correcting loop【83†L602-L610】: Zuberi *evaluates* outcomes (via CXDB) and adapts. Critically, the agent should avoid constantly re-training on every request; instead, it queries selectively or on schedule to update its rules.  

## Failure Modes and Safeguards  
- **Level 1 failures:** *Misclassification* due to incomplete rules. E.g., a query needing tools might mistakenly hit Qwen3-14B. We guard against this by making defaults safe: Qwen3-14B can handle general cases reasonably. We also can include a fallback if a chosen model returns low confidence or an explicit error, e.g. **reroute to GPT-OSS** if it looks tool-like but missed. The static rules should be conservative (erring on more capable models) rather than overly restrictive.  
- **Level 2 failures:** *Bad feedback*. If we log incorrect “success” signals, we may reinforce wrong behavior. To mitigate, only mark success when there’s clear user approval or when the model’s answer passes an automated check. Avoid logging ambiguous outcomes. Keep the schema minimal to reduce noise.  
- **Level 3 failures:** *Overfitting/feedback loops*. If Zuberi blindly “learns” from the CXDB, it might reinforce biases (e.g. if early user preferences skew data). We mitigate by limiting autonomous changes: require a threshold of evidence before updating a rule. Also maintain human oversight hooks for reviewing major changes.  

At Level 1, the rule-based design helps catch some errors automatically (e.g., always sending image inputs to the vision model avoids the new “image question” type of error). Each rule has an implicit guardrail: if a request doesn’t match any specific rule, it falls back to the generalist model. This default route and the ability to escalate to GPT-OSS for failures provide a safety net.  

## Level 1 Rule Set (Example)  
Below is a concrete initial rule set for the given four-model stack. These rules can be codified as if-else conditions in the router and later refined by Levels 2/3:

- **If input has an image or explicitly asks about a picture/diagram:** route to **Qwen3-VL-8B**. *(Example condition: `if contains_image(query) or starts_with("image:")`.)*  
- **Else if input mentions coding or shows code syntax:** route to **Qwen2.5-Coder-14B**. *(E.g. keywords “function”, “class”, or a code block detected.)*  
- **Else if input indicates tool usage or multi-step problem:** route to **GPT-OSS-20B**. *(E.g. keywords “search for”, “calculate with”, “use Python to”, or multiple question marks indicating chain-of-thought.)*  
- **Else:** route to **Qwen3-14B**. *(General chat and knowledge queries.)*  

*Example rule in pseudocode:*  
```
if has_image(query):
    use("Qwen3-VL-8B")
elif contains_keywords(query, ["import", "def ", "{code}", "print(", "algorithm"]):
    use("Qwen2.5-Coder-14B")
elif contains_keywords(query, ["browser", "tool", "calculate", "search", "analyze", "solve step-by-step"]):
    use("GPT-OSS-20B")
else:
    use("Qwen3-14B")
```  
These cover the main categories. They can be refined over time (e.g., adding or adjusting keywords) as real usage data in CXDB reveals edge cases.  

## Regression Tests  
For deployment, define test queries to verify the router:  
- **Vision test:** Query like “What is this an image of? [image attached]” should hit Qwen3-VL.  
- **Code test:** “Write a JavaScript function to reverse a string” → Qwen2.5-Coder.  
- **Tool test:** “Find the current weather in Paris using an API” → GPT-OSS-20B.  
- **General test:** “Who won the World Cup in 2018?” → Qwen3-14B.  

Each test asserts the chosen model is correct. Over time, new tests derived from logged queries can be added automatically (e.g. if CXDB shows a pattern of misroutes).  

**Sources:** We drew on best practices in AI agent routing. For example, rule-based routing is straightforward to implement initially【73†L193-L201】. GPT-OSS:20B is explicitly intended for “agentic” tasks requiring function calling【79†L117-L125】, guiding our rule for tool-heavy requests. Finally, a closed-loop architecture with outcome evaluation is recommended for self-improvement【83†L602-L610】, which motivates our CXDB feedback loop design. These principles informed the taxonomy, feedback schema, and adaptive strategies above.