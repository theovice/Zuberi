okay, here are the current models avilable to Zuberi. this was based off the previous GPU i had: RTX 3060



Based on the project docs, Zuberi's current configured models in OpenClaw are:



| Model | Role | Status |

|-------|------|--------|

| qwen3:14b-fast | Primary — speed-optimized, no think scaffolding | ✅ Active |

| qwen3:14b | Deep text / reasoning | ✅ Configured |

| qwen3-vl:8b-fast | Vision/OCR | ✅ Configured, skill needed |

| gpt-oss:20b | Fallback | ✅ Configured |



All four have reasoning: false and contextWindow: 32768 in OpenClaw config. The model-router skill handles autonomous selection between them based on task type.



The screenshot from earlier showed qwen3:14b active in one session and qwen3:14b-fast in another — both working. gpt-oss:20b also appeared in one screenshot.



qwen3-vl:8b-fast is configured but vision isn't fully wired end-to-end yet — the model is there, the OpenClaw config is set, but the workspace skill for triggering vision tasks hasn't been built (noted as pending in the capability matrix).

Thought for a few seconds



That helps. It means Zuberi’s actual current model stack is still:



qwen3:14b-fast — primary fast text model



qwen3:14b — deeper text/reasoning-style use



qwen3-vl:8b-fast — vision/OCR model, not fully wired yet



gpt-oss:20b — fallback / alternate general model



And importantly, that stack was chosen under the old RTX 3060-era constraints, not your current hardware reality.



So the practical implication is:



the matrix should stay general-use, but you should separately maintain a small “Current Zuberi Runtime Stack” note outside the public matrix.



That avoids mixing:



public model exploration

with



your live configured OpenClaw environment



A clean split would be:



Public file:

Model Matrix

General-use, hardware-aware, no Zuberi/KILO references



Private/operator note:

Current Zuberi Runtime Stack



qwen3:14b-fast



qwen3:14b



qwen3-vl:8b-fast



gpt-oss:20b



That way you don’t contaminate the matrix with local roles like “Primary” and “Fallback,” but you still preserve the real deployed stack.



Given your newer GPU, this also suggests a future task:



re-evaluate whether the configured stack still makes sense



especially whether gpt-oss:20b, Gemma 3 12B, Phi, or another vision-capable model should replace part of the old 3060-era setup



Best short takeaway:



Keep the matrix general. Keep Zuberi’s live model inventory separate. The context you pasted should not go back into the public matrix, but it should inform your next runtime-stack review.



here is the current host computer spec (KILO)



From the project docs:



\*\*KILO — Brain + Interface\*\*



| Component | Spec |

|-----------|------|

| CPU | i7-13700K (16 cores / 24 threads) |

| Motherboard | MSI MPG Z690 EDGE WIFI DDR4 |

| RAM | 64GB DDR4 3600MHz (4x16GB Corsair Vengeance) |

| GPU | RTX 5070 Ti 16GB GDDR7 |

| iGPU | Intel UHD 770 |

| Storage 1 | Samsung 980 PRO 1TB NVMe |

| Storage 2 | 870 EVO 1TB SATA |

| Storage 3 | Apacer AS340 240GB SATA |

| Network | TP-Link Wi-Fi 6 PCIe |

| Tailscale IP | 100.127.23.52 |

| OS | Windows 11 Pro |



Runs: OpenClaw v2026.3.1 + Ollama + ZuberiChat (Tauri v2).



The RTX 5070 Ti 16GB GDDR7 is the key constraint for model selection — faster memory bandwidth than the RTX 3090 but same 16GB VRAM ceiling. That's why qwen3:14b-fast at ~9GB is the sweet spot for primary inference.

Thought for a couple of seconds



That’s a much stronger box than the old 3060-era context, and it changes the model-selection conversation in a meaningful way.



What stands out



The real constraints now are:



GPU: RTX 5070 Ti, 16 GB VRAM



RAM: 64 GB system memory



CPU: i7-13700K, which is plenty for offload coordination and local tooling



Storage: fine for model caching/runtime



OS/runtime stack: Windows 11 + OpenClaw + Ollama + ZuberiChat



So the machine is no longer “limited desktop with tight compromise everywhere.”

It is now:



a capable local AI workstation with a hard 16 GB VRAM ceiling.



What that means for Zuberi



The most important line is this one:



faster memory bandwidth than the RTX 3090 but same 16GB VRAM ceiling



That means Zuberi benefits in two ways:



small-to-mid models should feel much faster



models that fit comfortably in 16 GB become much more attractive



But it does not change the core rule:



once a model really wants more than 16 GB of VRAM, you are still in offload/sharding/latency tradeoff territory



So your current intuition about qwen3:14b-fast being a sweet spot makes sense.



Practical tiering for KILO

Best-fit local models



These are the kinds of models KILO should handle well:



7B–14B text models



8B-class vision models



some 20B-class models with tradeoffs depending on quantization/runtime



fast agentic models that stay under the 16 GB ceiling



Borderline / tradeoff models



These are possible, but not ideal as “daily driver” choices:



20B+ models if they need offload or aggressive quantization



larger reasoning models where latency matters



big multimodal models that spill into RAM



Bad fit as a normal local workflow



32B+ dense models as smooth interactive defaults



giant reference models that only technically run with heavy compromises



“looks impressive on a matrix, feels bad in practice” options



What this changes versus the old 3060 thinking



Under the 3060, the stack likely had to optimize more aggressively around survival:



smallest workable model



vision only if necessary



fallback model chosen conservatively



Under KILO, you can now optimize more for:



responsiveness



agent/tool-use quality



vision usefulness



fewer painful tradeoffs between speed and capability



So this is a good moment to do a fresh runtime-stack review rather than treating the 3060-era choices as permanent truth.



Best implication for your model matrix



This reinforces the split we already discussed:



Public / general-use matrix



Should stay hardware-aware and generic.



Private Zuberi runtime decisions



Should now be re-evaluated against:



16 GB VRAM



much stronger memory bandwidth



whether you want:



fastest UX



best agent/tool use



unified text+vision model



best fallback model



My practical takeaway



For KILO, the “center of gravity” is probably still:



fast 14B-class text model



compact vision model



one stronger alternate / fallback



That means your current stack still makes sense structurally, but not necessarily permanently by model name.



So the new question is not:



“what can run at all?”



It’s:



what is the best 16 GB-class stack for Zuberi now?



That is a much better place to be.



If you want, I can turn the last two context drops into a clean KILO model strategy note with:



current deployed stack



current hardware realities



what should be re-evaluated next.



with this information. give me an upgrade report of Zuberis llms

Thought for a couple of seconds



Here’s an upgrade report for Zuberi’s LLM stack based on the current KILO hardware and the currently configured models.



Zuberi LLM Upgrade Report

Executive summary



Zuberi’s current model stack was selected under older RTX 3060-era constraints. On KILO — with an RTX 5070 Ti 16GB GDDR7, 64GB RAM, and a strong CPU — the stack is still structurally sound, but it should now be treated as a legacy baseline, not the final optimized setup.



The current stack:



qwen3:14b-fast — primary fast text model



qwen3:14b — deeper text/reasoning-style model



qwen3-vl:8b-fast — vision/OCR model, not fully wired yet



gpt-oss:20b — fallback model



Current-state assessment

1\. qwen3:14b-fast



Status: keep

Role: primary daily-driver model

Assessment: This still looks like the best-fit primary model for KILO right now.



Why:



fits comfortably inside the 16GB VRAM ceiling



benefits from the faster GDDR7 bandwidth



optimized for responsiveness



well suited for general Zuberi interaction and agent-style work



Verdict:

Still the correct primary model unless a better 12B–14B-class replacement clearly outperforms it in real use.



2\. qwen3:14b



Status: keep, but narrow its role

Role: slower/deeper alternate text model

Assessment: Reasonable to keep, but its purpose should be more explicit.



Why:



overlaps heavily with qwen3:14b-fast



useful as a second-pass or “quality over speed” option



less compelling if the fast version is already good enough for most tasks



Verdict:

Keep for now, but define it as:



deeper drafting



slower analysis



second-opinion text generation



Not as a co-equal primary.



3\. qwen3-vl:8b-fast



Status: keep and finish wiring

Role: vision / OCR / screenshot understanding

Assessment: This is under-realized, not obsolete.



Why:



8B-class multimodal model is a strong fit for 16GB hardware



this fills a unique capability gap



vision is not replaceable by the text models



current weakness is integration, not model fit



Verdict:

Do not replace yet. First finish the end-to-end vision skill wiring and then evaluate whether a future unified text+vision model is actually better.



4\. gpt-oss:20b



Status: re-evaluate

Role: fallback / alternate general model

Assessment: This is the weakest part of the current stack definition.



Why:



20B is much closer to the edge of a 16GB local setup



may be worthwhile, but likely comes with more latency/tradeoffs



“fallback” is not a strong enough reason by itself to keep a model if it does not clearly outperform the others in a specific scenario



Verdict:

Keep temporarily, but it should now earn its place through testing. It should justify itself as one of:



best quality fallback



best instruction-following fallback



best long-form drafting fallback



If it does not clearly win one category, it is the best candidate for replacement.



Hardware-aware conclusions

What KILO changes



KILO is now a real 16GB-class AI workstation. That means:



7B–14B models should be very comfortable



8B-class vision models are viable and practical



some 20B models are possible, but no longer automatically the best choice



the bottleneck is now VRAM ceiling, not raw system weakness



This means Zuberi should optimize for:



speed



agent/tool-use quality



multimodal usefulness



stack simplicity



not merely “what can run at all.”



Upgrade recommendations

Recommendation 1 — Keep the stack structure, not necessarily all current model names



The current 4-role structure still makes sense:



fast primary text model



deeper alternate text model



dedicated vision model



stronger alternate/fallback model



That structure is good. What should now be reviewed is whether each specific model is still the best occupant of that slot.



Recommendation 2 — Finish vision before replacing it



Do not replace qwen3-vl:8b-fast yet.



Right now the biggest issue is:



configured



available



not fully wired into the workflow



So first unlock the capability you already have. Only after that should you test whether a different multimodal model deserves the slot.



Recommendation 3 — Put gpt-oss:20b on probation



This is the clearest upgrade candidate.



Questions it must answer:



Is it meaningfully better than qwen3:14b for any real Zuberi workflow?



Is the quality gain worth the latency and fit tradeoff?



Does it help enough on KILO to justify staying in the stack?



If not, replace this slot first.



Recommendation 4 — Reclassify qwen3:14b and qwen3:14b-fast



These should not be thought of as two near-identical general models.



Better division:



qwen3:14b-fast = primary interactive model



qwen3:14b = slower-quality model for harder drafting/analysis



That will make router behavior cleaner.



Recommendation 5 — Run a fresh post-3060 evaluation cycle



The current stack should be tested against the new hardware reality.



Best next test categories:



interactive chat quality



tool-use / agent control



long drafting



screenshot/OCR



fallback quality under pressure



That gives you a hardware-era reset:



old 3060 assumptions out



KILO-era evidence in



Proposed upgrade path

Phase 1 — Stabilize current stack



Keep qwen3:14b-fast



Keep qwen3:14b



Keep qwen3-vl:8b-fast



Keep gpt-oss:20b temporarily



finish wiring vision end-to-end



clarify router roles



Phase 2 — Evaluate replacement candidates



Priority replacement target:



gpt-oss:20b



Potential question:



should fallback remain a 20B model?



or should that slot become a more efficient, more clearly differentiated model?



Phase 3 — Simplify if possible



If one model can credibly unify two roles, consider reducing stack sprawl.



Possible future simplification:



one strong primary text model



one vision model



one stronger alternate/fallback model



But do not simplify until the vision path is actually operational.



Final verdict

Keep now



qwen3:14b-fast



qwen3:14b



qwen3-vl:8b-fast



Re-evaluate first



gpt-oss:20b



Highest-priority upgrade action



Finish the vision integration and run a KILO-era model review.



Bottom-line assessment



Zuberi’s stack is not outdated, but it is under-optimized for current hardware. The architecture is still good; the next step is to validate whether each model still deserves its slot now that Zuberi is running on a 16GB GDDR7 workstation instead of a 3060-class box.



If you want, I can turn this into a tighter operator report or a more formal Architect handoff note.



whats the difference btween qwen3:14b-fast and qwen3:14b

Thought for a couple of seconds



In your setup, the difference is mainly speed tuning vs deeper/slower behavior.



qwen3:14b-fast



This is your speed-optimized version.



From your project context, it is:



the primary model



tuned with a custom Modelfile



uses no think scaffolding



intended for the fastest day-to-day responses



What that usually means in practice:



lower latency



snappier chat feel



better for routine agent work and normal conversation



less likely to spend extra time on elaborate reasoning



qwen3:14b



This is the standard / fuller 14B version in your stack.



In your project context, it is being treated more like:



the deeper text model



a slower alternate



something you use when you want more careful output than the fast path



What that usually means in practice:



slower responses



more deliberate drafting or analysis



better candidate for second-pass or “quality over speed” use



less optimized for responsiveness



The simplest way to think about it



qwen3:14b-fast = daily-driver, quick, responsive



qwen3:14b = slower, more deliberate, better for harder text tasks



Important detail



You also noted earlier that both are configured with:



reasoning: false



contextWindow: 32768



So the difference is not that one has formal reasoning mode on and the other does not.

The difference is more about how the model is packaged/tuned in your environment, especially the fast one being stripped of extra “thinking” behavior for speed.



Practical routing



A clean role split would be:



Use qwen3:14b-fast for:



regular chat



tool-use orchestration



quick drafts



normal Zuberi interaction



Use qwen3:14b for:



heavier writing



second-pass refinement



more careful analysis



cases where speed matters less than answer quality



If you want, I can also help you define a sharper router rule between the two so Zuberi stops treating them like near-duplicates.



whats the "Fast" catgory in the model matrix?

Thought for a couple of seconds



The “Fast” category in the model matrix means:



models that prioritize speed and responsiveness over maximum quality or depth.



In practice, a model tagged Fast should be a good choice when the user cares most about:



low latency



snappy chat



quick tool-use loops



interactive feel



decent quality without waiting on a heavier model



In the matrix, “Fast” should mean



When the workload profile is set to Fast, the ranking should favor models that:



fit the selected hardware easily



have strong estimated tokens/sec



avoid heavy offload penalties



still have acceptable agent/tool-use quality



So it is not just:



“smallest model”

and not just:



“highest t/s”



It should really mean:



best balance of responsiveness + usability for the chosen hardware.



What it is not



It does not mean:



best reasoning



best coding



best vision



best overall quality



A model can be “Fast” and still lose to another model in:



deep analysis



long-form writing



multimodal tasks



Example in your earlier context



A model like qwen3:14b-fast is a good example of what the Fast category is trying to capture:



optimized for responsiveness



suitable as a daily-driver



lower friction for normal interaction



Good definition for the matrix



If you want the matrix wording to be crisp, define it like this:



Fast = the best model for low-latency interactive use on the selected hardware, weighted toward speed first and quality second.



If you want, I can also help you define the exact scoring logic for the six workload chips:



General



Coding



Agent \& Tools



Research



Vision



Fast



for gpt-oss20b is superior to qwen3-14b?

Thought for 5s



Not automatically, no.



For Zuberi on KILO, I would not assume gpt-oss:20b is superior to qwen3:14b across the board.



Likely tradeoff

gpt-oss:20b



Potentially stronger in:



broader general writing quality



some instruction-following cases



“fallback” style second opinions



But likely worse in:



fit efficiency on 16GB VRAM



latency



smooth day-to-day interaction



cost of keeping it in the stack if it does not clearly win a role



qwen3:14b



Likely stronger in your setup for:



practical local fit



responsiveness



easier routing/use as a regular working model



better balance for a 16GB workstation



The important point



A 20B model is not automatically “better” than a 14B model in the way that matters to you.



For Zuberi, “better” means:



gives stronger answers for the tasks you actually run



fits your hardware well



does not slow the whole agent experience down



has a clear role in the stack



If gpt-oss:20b is only a little better sometimes, but noticeably slower/heavier, then it is not superior in operational terms.



My current judgment



For daily use on KILO:



qwen3:14b-fast is probably still the best primary



qwen3:14b is probably the more practical deeper-text model



gpt-oss:20b only deserves to stay if it clearly beats qwen3:14b in a category that matters



So I’d say:



gpt-oss:20b may be stronger in some outputs, but qwen3:14b is probably the better-balanced model for Zuberi’s actual hardware and runtime.



Best way to decide



Test both on the same prompts in 4 buckets:



normal chat



long drafting



agent/tool-use instructions



difficult analysis



Then compare:



answer quality



latency



consistency



hallucination rate



whether the gain is worth the heavier footprint



My bet:



gpt-oss:20b might win some quality comparisons



qwen3:14b will likely win the overall operational score on your machine



okay, my future project for Zuberi would be like:



build a forex trading plan by learning from youtube, instagram and other only response. present the plan to me. then I will create an ONADA trading account and you will operate autonomously. also consider building a smaller subagent that can handle this operation with our oversight



I’m checking the current OANDA/API reality first, then I’ll turn your idea into a safe, realistic project shape instead of a vague aspiration.



Thought for 18s



That’s a viable research-and-ops project, but I would not let Zuberi autonomously trade a live OANDA account as designed.



OANDA does support programmatic trading through its v20 REST API, with separate practice and live environments, and personal access tokens can access your sub-accounts. But OANDA also prominently warns that leveraged FX/CFD products are high risk and that many retail accounts lose money.



My upgrade of your idea

Good project core



A strong Zuberi project would be:



Build a forex research-and-execution support system that:



learns and summarizes public educational content from YouTube, Instagram, and web sources



converts that into explicit hypotheses, setups, risk rules, and playbooks



presents a trading plan to you for approval



paper trades first



then can assist with execution under strict human oversight



That is solid.



What I would change



I would not frame Phase 1 as:



“then you will operate autonomously”



I would frame it as:



research autonomously



simulate autonomously



recommend autonomously



execute only under human approval until proven trustworthy



That is the safer and smarter architecture.



Recommended project structure

Phase 1 — Research engine



Zuberi gathers and structures:



strategy ideas



macro themes



price-action concepts



risk management patterns



trader claims vs actual evidence



recurring setups by pair/session/timeframe



Output:



a written trading plan



source-backed assumptions



clear setup definitions



invalidation rules



risk rules



Phase 2 — Backtesting / paper-trading engine



Before any live account activity:



replay strategies on historical data



run forward paper trading on demo



track expectancy, drawdown, win rate, average hold time, slippage assumptions



reject



Stop, I gave that as a senario for this agent to approxmiate which model would be better for this level of tasking and mangement.



I’m narrowing this to “which model is best for a multi-step, research-heavy manager/subagent role,” not the trading plan itself.



Thought for 19s



For that level of tasking — multi-step research, source synthesis, plan generation, operator review, and possibly managing a smaller subagent — I would rank your candidate models like this:



1\. gpt-oss:20b

Best fit for the “manager / orchestrator / planner” role. Ollama explicitly positions gpt-oss:20b for reasoning, agentic tasks, and developer use cases, and the published Ollama artifact is about 14 GB with a 128K context window, which is unusually helpful for long planning chains and multi-source synthesis on a 16 GB card.



2\. qwen3:14b

Best fit if you want a more efficient primary manager model with lower risk of overshooting your 16 GB ceiling. Ollama’s Qwen3 page shows the 14B family is a current supported release, and the model family is designed around tools/thinking variants; community/Ollama materials also note a native 32,768-token context for 14B-class Qwen3, which is enough for substantial planning and supervision work even if it is not as roomy as gpt-oss:20b.



3\. Gemma 3 12B

Strong candidate if you want one compact model to cover both text management and some vision-adjacent project work. Google describes Gemma 3 as a lightweight open family with multimodal understanding, advanced text and visual reasoning, function calling, and a 128K-token context window. That makes it attractive for a “research manager” role that may eventually inspect screenshots, charts, or documents, though I still would not assume it beats gpt-oss:20b as a pure planning/orchestration brain without testing.



4\. qwen3:14b-fast

Best for responsiveness, but not my first choice for this project’s “manager” role. It is still useful as the interactive day-to-day model because the 14B Qwen3 family is actively supported in Ollama, but your own framing of this variant as the speed-optimized one matches what I would expect: faster loop, less ideal for the heaviest supervision/planning work.



My recommendation by role



For the scenario you described, I would not use one model for everything.



Use a split like this:



Manager / planner / oversight brain: gpt-oss:20b



Fast interactive assistant / routine operations: qwen3:14b-fast



Deeper alternate text model: qwen3:14b



Vision / OCR / screenshots: qwen3-vl:8b-fast for now, or test Gemma 3 12B later if you want a more unified stack



Best single answer to your actual question



If your question is:



“Which model is better for a future Zuberi project involving research synthesis, plan generation, oversight, and managing a smaller subagent?”



My answer is:



gpt-oss:20b is the best candidate for the manager role.

It is the one most explicitly aligned with reasoning + agentic tasks, and its 128K context makes it more suitable for long, multi-source planning than the Qwen3 14B options.



But if your question is:



“Which model is better as the default always-on Zuberi model on a 16 GB workstation?”



Then I would still lean toward:



qwen3:14b-fast as the primary daily driver, with gpt-oss:20b reserved for harder planning/review tasks.



Practical conclusion



For this project type, the best architecture is not “replace everything with one model.” It is:



qwen3:14b-fast for speed and normal interaction



gpt-oss:20b for planning, supervision, and subagent management



optionally evaluate Gemma 3 12B later if you want a more unified text+vision manager layer because Google explicitly designed it for multimodal reasoning with long context and function calling.



If you want, I can turn that into a clean role-by-role model assignment note for Zuberi.

