# self-review: has-questioned-questions

## found issues

### issue 1: assumptions section not updated with review findings

**found**: the assumptions section (lines 147-151) stated three assumptions as facts, but review in r2 disproved assumption 3 (stale daemon).

**fixed**: updated assumption 3 to show it's disproven, with evidence from user output.

### issue 2: questions lacked triage status

**found**: questions (lines 155-168) were listed without [answered], [research], or [wisher] markers.

**fixed**: added triage status to all questions based on systematic analysis.

### issue 3: evaluation section listed stale daemon as option 1

**found**: lines 117-120 listed "stale daemon bytecode" as a possible cause, but this is now disproven.

**fixed**: struck through option 1 with [disproven] marker. added option 4 "IPC type mismatch" as new hypothesis based on review findings.

### issue 4: "what is awkward" section had untriaged questions

**found**: the "feels off" section (lines 175-179) contained implicit questions without triage markers.

**fixed**: added triage markers to each item in the "feels off" section. struck through item 3 as moot since daemon was fresh.

### issue 5: new question discovered

**found**: item 2 in "feels off" reveals a new question: why does status show "no keys unlocked" instead of "key expired"? this suggests the daemon may not have stored the key at all.

**fixed**: added [research] marker to this question. this is distinct from Q1 (why -270m) because it's about daemon state, not TTL calculation.

---

## triage of open questions

### questions left (from vision lines 155-157)

#### Q1: "why -270m specifically?"

**original**: 270 minutes is 4.5 hours. was the daemon's Date.now() 4.5 hours behind? was there a cached grant from a prior session?

**can this be answered via logic now?**
partially. -270m means the expiresAt timestamp was 4.5 hours in the past at display time. this could mean:
- TTL calculation used a negative duration
- expiresAt was set to a fixed past date
- type corruption turned a valid date into an invalid one

**can this be answered via code now?**
yes. trace the TTL calculation path for sudo keys.

**verdict**: [research] — answer in research phase via code trace.

---

#### Q2: "does 1password vault need special test coverage?"

**original**: we don't have acceptance tests for 1password vault (requires real 1password setup)

**can this be answered via logic now?**
no. we need to know if the defect is 1password-specific or affects all vaults.

**can this be answered via code now?**
partially. we can check if user's tests with `os.direct` vault would catch the same defect.

**verdict**: [research] — check if defect reproduces with `os.direct` vault first. if yes, 1password tests not needed.

---

#### Q3: "should unlock output include a diagnostic hash?"

**original**: to detect stale daemon bytecode?

**can this be answered via logic now?**
the "stale daemon" theory is now disproven (daemon was fresh). this question is moot.

**verdict**: [answered] — not needed. daemon was fresh. this question arose from a false assumption.

---

### must validate with wisher (from vision lines 160-163)

#### W1: "was the daemon recently started or was it active for hours?"

**can this be answered via code now?**
yes. user's output shows `[keyrack-daemon] spawned background daemon (pid: 2540735)` — daemon was freshly spawned.

**verdict**: [answered] — daemon was freshly started. user's output proves this.

---

#### W2: "was this the first time with sudo keys, or had they worked before?"

**can this be answered via logic now?**
no. only the wisher knows their history.

**verdict**: [wisher] — ask the wisher if sudo keys ever worked for them.

---

#### W3: "what version of rhachet was installed globally vs locally?"

**can this be answered via logic now?**
no. only the wisher knows their environment.

**verdict**: [wisher] — ask the wisher for version info. however, since daemon was freshly spawned, version mismatch is less likely to be the cause.

---

### must research externally (from vision lines 166-168)

#### R1: "can `op read` return stale data?"

**can this be answered via logic now?**
no. requires 1password documentation research.

**verdict**: [research] — but low priority. focus on IPC type mismatch first.

---

#### R2: "is there a race condition between daemon spawn and unlock?"

**can this be answered via code now?**
yes. trace the spawn → unlock sequence in code.

**verdict**: [research] — investigate in code review phase.

---

## summary table

| question | status | reason |
|----------|--------|--------|
| why -270m specifically? | [research] | trace TTL calculation in code |
| 1password test coverage? | [research] | check if defect reproduces with os.direct |
| diagnostic hash for bytecode? | [answered] | moot - daemon was fresh |
| daemon recently started? | [answered] | yes, user's output proves it |
| first time with sudo keys? | [wisher] | ask wisher |
| version global vs local? | [wisher] | ask wisher, but less critical |
| op read stale data? | [research] | low priority |
| race condition spawn/unlock? | [research] | investigate in code |

## actions taken

1. **updated vision** — marked all questions with triage status ([answered], [research], [wisher])
2. **answered W1** — daemon was freshly started, proven by user's output
3. **answered Q3** — diagnostic hash for bytecode is moot since daemon was fresh
4. **prioritized research** — TTL calculation path is highest priority

## what changed in the vision

updated lines 153-168 to include triage status for all questions:
- Q1, Q2: marked [research]
- Q3: marked [answered] — moot
- W1: marked [answered] — freshly started
- W2, W3: marked [wisher]
- R1, R2: marked [research]

## why the triage holds

### [answered] questions are truly answered

- **Q3 (diagnostic hash)**: the original purpose was to detect stale bytecode. since daemon was fresh (proven by user output), this question no longer applies.
- **W1 (daemon start time)**: user's output explicitly shows `[keyrack-daemon] spawned background daemon (pid: 2540735)`. this is direct evidence, not inference.

### [research] questions require code investigation

- **Q1 (why -270m)**: the specific number suggests a calculable cause. trace the TTL path in code.
- **Q2 (1password tests)**: first reproduce with os.direct to determine if vault-specific.
- **R1 (op read stale)**: low priority, unlikely to be the cause.
- **R2 (race condition)**: possible but less likely given the specific -270m value.

### [wisher] questions require wisher input

- **W2 (first time with sudo keys)**: helps understand if this is a regression or always broken.
- **W3 (version mismatch)**: helps but less critical since daemon was fresh.

---

## reflection: what this review revealed

the initial vision made three key assumptions. upon review:

1. **assumption 1 (symptom vs cause)** was questioned — the -270m is likely the root cause, not a symptom
2. **assumption 2 (tests cover happy path)** partially holds — tests pass but don't cover 1password path
3. **assumption 3 (stale daemon)** was disproven — user output proves fresh spawn

the most significant finding: **the daemon was freshly spawned**.

this changes the entire investigation direction. instead of chasing stale bytecode, we must trace:
- the TTL calculation path for sudo keys
- the IPC serialization of expiresAt between CLI and daemon
- why daemon status shows "no keys unlocked" instead of "key expired"

the specific number -270m (4.5 hours) is a clue. it suggests:
- not random corruption (would produce arbitrary values)
- not a simple off-by-one (would be close to 30m)
- possibly a type mismatch where a timestamp is misinterpreted as a duration, or vice versa

the review is complete. all questions are triaged. the vision is updated with findings.
