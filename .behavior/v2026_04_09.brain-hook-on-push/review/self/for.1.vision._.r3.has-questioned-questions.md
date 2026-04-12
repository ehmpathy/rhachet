# self-review: has-questioned-questions

## context

triage of open questions in the vision. each question must be marked as answered, research, or wisher.

---

## question: does node-pty work on linux/mac?

**can this be answered via logic now?**
partially. node-pty is cross-platform and used by VS Code terminal on both platforms.

**can this be answered via extant docs or code?**
yes. node-pty docs confirm linux/mac support.

**verdict:** [answered] — node-pty supports linux and mac. windows support exists but is not relevant for v1.

---

## question: does stdin injection wake claude from idle-at-prompt?

**can this be answered via logic now?**
no. requires empirical test.

**can this be answered via extant docs or code?**
no. claude cli internals are not documented.

**should this be answered via external research later?**
yes. this is the core hypothesis of the POC.

**verdict:** [research] — POC must validate this. marked in poc.pty-wrapper.stone.

---

## question: what happens if claude is mid-response when injection occurs?

**can this be answered via logic now?**
partially. pty input is buffered. claude should receive after current output completes.

**should this be answered via external research later?**
yes. edge case for POC to explore.

**verdict:** [research] — POC should test this scenario.

---

## question: does --resume work as expected?

**can this be answered via logic now?**
no. depends on claude cli behavior.

**should this be answered via external research later?**
yes. POC should test session resume.

**verdict:** [research] — POC should test --resume flag.

---

## question: does fs.watch work reliably on linux/mac?

**can this be answered via logic now?**
partially. fs.watch has known quirks but works for basic use cases.

**can this be answered via extant docs or code?**
yes. node docs describe platform differences.

**verdict:** [answered] — fs.watch works on linux/mac with caveats. chokidar is a more robust alternative if needed.

---

## question: what's the latency from file drop to socket delivery?

**can this be answered via logic now?**
partially. fs.watch latency is typically sub-100ms. socket write is near-instant.

**should this be answered via external research later?**
yes. POC should measure actual latency.

**verdict:** [research] — POC should measure end-to-end latency.

---

## question: how to handle socket connection failures?

**can this be answered via logic now?**
yes. standard retry with backoff. reconnect on disconnect.

**verdict:** [answered] — standard retry pattern. out of scope for POC, but straightforward for production.

---

## question: how to implement role filter match logic?

**can this be answered via logic now?**
yes. parse `+role,-role` syntax. check if actor roles satisfy filter.

**verdict:** [answered] — straightforward to parse. can implement in daemon.

---

## summary of questions

| question | verdict | notes |
|----------|---------|-------|
| node-pty on linux/mac | [answered] | supported |
| stdin wakes claude | [research] | core POC hypothesis |
| mid-response injection | [research] | POC edge case |
| --resume flag | [research] | POC should test |
| fs.watch reliability | [answered] | works with caveats |
| file-to-socket latency | [research] | POC should measure |
| socket failure handle | [answered] | standard retry |
| role filter logic | [answered] | straightforward parse |

4 questions answered. 4 questions marked for POC research. no questions require wisher input — the pivot was a research-driven decision that addresses the original wish.

---

## verification

the vision now contains an "open questions" section at line 182-195 with all 8 questions clearly marked:
- 4 answered: node-pty, fs.watch, socket failures, role filter
- 4 research: stdin wakes, mid-response, --resume, latency

no questions require wisher input — the pivot was a research-driven decision that addresses the original wish.
