# self review: has-questioned-questions

triage the open questions in the vision.

---

## question 1: should we log when we detect and replace an unhealthy daemon?

**triage:** can be answered via logic now

**answer:** YES

rationale:
- observability is critical for debug
- silent recovery is good for UX, but engineers need to know what happened
- log at INFO: "daemon unhealthy, restarted"
- log at DEBUG: reason (PING timeout, PING error, etc.)

**mark:** [answered]

---

## question 2: should we attempt graceful shutdown of old daemon or just spawn over it?

**triage:** can be answered via logic + extant code

**answer:** spawn over it (no graceful shutdown)

rationale:
- extant `spawnKeyrackDaemonBackground` already handles stale socket cleanup
- if daemon is unhealthy, it can't serve requests anyway
- kill of process adds complexity (need to find PID, send SIGTERM, wait)
- orphan daemon will die naturally when socket is replaced

**mark:** [answered]

---

## question 3: is there a specific command we should use for health check, or create a new PING command?

**triage:** can be answered via logic

**answer:** create new PING command

rationale:
- must verify caller session (per design decision)
- extant commands (GET, UNLOCK) have side effects or require args
- PING is lightweight, single purpose: verify daemon can process commands
- response can include daemon metadata (uptime, version) for future use

**mark:** [answered]

---

## summary

| question | triage | resolution |
|----------|--------|------------|
| log on daemon restart? | [answered] | yes, INFO level |
| graceful shutdown? | [answered] | no, spawn over |
| which command for health check? | [answered] | create PING |

all questions resolved. no wisher input needed. no research needed.

---

## vision update

updated "questions to validate" section with answers.
