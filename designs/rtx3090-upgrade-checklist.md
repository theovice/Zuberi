# RTX 3090 Upgrade Checklist — Zuberi

**Trigger:** RTX 3090 (24GB) arrives, replacing RTX 5070 Ti (16GB). RTX 3060 (8GB) comes out of storage.
**Total VRAM after upgrade:** 32GB (24 + 8), both Ampere architecture.

---

## Hardware Swap

- [ ] Physically install RTX 3090 in KILO (primary PCIe x16 slot)
- [ ] Install RTX 3060 in secondary slot
- [ ] Verify both GPUs visible: `nvidia-smi`
- [ ] Confirm driver supports both cards (Ampere unified driver)
- [ ] Return RTX 5070 Ti

---

## Ollama Multi-GPU Configuration

- [ ] Configure Ollama for multi-GPU: set `OLLAMA_NUM_GPU_LAYERS` or let Ollama auto-split
- [ ] Test gpt-oss:20b loads across both GPUs
- [ ] Verify inference speed — baseline before/after comparison
- [ ] Test concurrent model loading: primary (gpt-oss:20b) + code (qwen2.5-coder:14b) simultaneously
- [ ] Document which GPU handles which model in infrastructure.yaml

---

## AGENTS.md Updates

- [ ] Increase exec turn budget from 9 to 15
- [ ] Update WORK STYLE line to reflect new limit
- [ ] Update header: runtime model/host line if model changes
- [ ] Document multi-GPU awareness in CEG Shell Execution or new section

---

## Model Upgrades to Evaluate

With 24GB primary + 8GB overflow, Zuberi can run larger models:

- [ ] **Primary model**: Evaluate gpt-oss:32b or equivalent 30B+ model — does it fit in 24GB at q8_0?
- [ ] **Code model**: qwen2.5-coder:14b stays on 3060 (8GB) or upgrade to 32b on 3090?
- [ ] **Vision model**: qwen3-vl:8b stays on 3060 — evaluate if larger vision model fits
- [ ] **Simultaneous loading**: Test running primary + code + vision across both GPUs with keep_alive -1
- [ ] Benchmark: compare 20b on 3090 vs current 20b on 5070 Ti (Ampere vs Blackwell speed difference)

---

## Context Window Tuning

- [ ] Current: 131K context, q8_0 KV cache — likely comfortable on 24GB
- [ ] Test 131K context on 3090 — measure VRAM usage during long conversations
- [ ] If headroom exists: evaluate increasing to 192K or higher
- [ ] Timeout threshold: if long conversations no longer timeout, document the improvement
- [ ] Stress test: run a 50+ turn conversation and measure response times

---

## Whisper Service (if still on CPU)

- [ ] Evaluate moving Whisper from CEG CPU to 3060 GPU
- [ ] WhisperX with CUDA on 3060 would be significantly faster than CPU on CEG
- [ ] Trade-off: 3060 VRAM shared with display + overflow models vs dedicated Whisper
- [ ] Decision: keep on CEG CPU or move to 3060

---

## OpenClaw Configuration

- [ ] Review openclaw.json timeoutSeconds — may be able to reduce from 1800 if inference is faster
- [ ] Review reserveTokensFloor — larger context may allow adjustment
- [ ] Test tool call generation speed — the 3090 may resolve the JSON escaping timeout issue entirely

---

## Verification Checklist (run after all changes)

- [ ] `nvidia-smi` shows both GPUs with expected VRAM
- [ ] `ollama list` shows models loaded
- [ ] Zuberi responds to a basic prompt within expected latency
- [ ] Zuberi can run tool calls without timeouts on moderate-length conversations
- [ ] ZuberiChat connects and streams normally
- [ ] CEG services unaffected (no KILO changes should touch CEG)

---

## Notes

- 3090 is Ampere (GA102), same arch as 3060 — driver compatibility should be seamless
- 3090 has slower clock than 5070 Ti but 50% more VRAM — net win for large models, possible regression on small fast tasks
- The real Zuberi win is being able to load multiple models simultaneously without eviction
- Multi-GPU Ollama may require `OLLAMA_CUDA_VISIBLE_DEVICES` if you want to pin models to specific GPUs
