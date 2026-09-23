# F06 — `--onDirty refuse` is the default, and case=6 gets no `force`

**rework** clean · **status** OPEN · **confidence** 88%

## .the fork, stated fairly

the issue asks the say to *"skip/hold the dispatch rather than paste on top of it"* — and leaves two
calls open: what the default is, and whether an override exists.

| option | cost |
|---|---|
| **A** — default `refuse` (exit 2); `--onDirty force` overrides for a dirty line; **no** override for a modal | a daemon's nudge is dropped whenever a human is mid-type. the daemon must retry |
| **B** — default `force`, `--onDirty refuse` opts in | the safe path is the one you must ask for. a human's words are destroyed by default |
| **C** — `refuse` with no override at all | an operator who genuinely wants to overwrite a stale stuck paste has no move |

## .taken, and why at the time

**A**, on the asymmetry of the two failure costs:

| wrong call | cost | recoverable? |
|---|---|---|
| refuse, wrongly | one nudge delayed a tick | ✅ the daemon retries by design |
| force, wrongly | a human's in-flight words destroyed, with no record of what they were | ❌ |

⇒ `rule.require.safe-by-default`: the easy path must be the correct path, and the destructive act
takes a deliberate step. C is over-strict — a stuck paste is a real state an operator should be able
to clear.

### 🔴 and the modal refusal takes no override

case=2's worst outcome is bounded by the conversation — a sentence. case=6's is **not**: a `\r` into
a permission prompt is an *approval*, so a forced say could approve a write, a delete, or a network
call. `rule.require.safe-by-default`'s ladder says make it **impossible**, not merely hard, when the
wrong action's cost is unbounded.

⇒ so `force` covers a dirty line and never a modal. one flag, two reasons, one of them unforceable.

## .rework, and why

**clean.** the default is one branch in `invokeCloneSay`; a flip is a one-line change plus a help
string. no caller is hardened against the refusal, because the refusal does not exist yet.

## .confidence 88%, and why not higher

the 12% is operational, not ethical: a daemon that refuses whenever a human is mid-type may nudge
**rarely** in practice, if a driver's human types often. I have not measured how often a driver's
input line is dirty, so I cannot say whether `refuse` costs 1% of nudges or 30%. at 30% the wisher
may want a `--onDirty wait <ms>` third mode, which A does not provide.

## 🔴 .this entry has NO SUBJECT under either lever — read F05 and F07 before it

F06 is the one fulcrum **either** lever deletes, and its two halves fall to different verdicts:

| the half | deleted by | because |
|---|---|---|
| the `--onDirty` default for a **dirty line** | **F05 = B** (the progress-extended wait) | a transcript cannot see an unsubmitted line, so there is no pre-check, so there is no flag to default |
| **no `force` for a modal** | **F07 = out of scope**, *or* F05 = B | a modal is seen on the rendered screen and only there; and with case=6 out there is no modal cell at all |

⇒ so a verdict on F06 is **wasted attention** until both levers are ruled, and a wisher who rules F05 = B
retires this entry without ever a read of its options table.

⚠️ **the dependency is stated HERE, in the entry a council opens** — as well as in the inventory's
lever-collapse table — so a wisher who opens F06 reads that both levers retire it, rather than a live
fork with its own confidence.

## .where

- `rule.require.safe-by-default` (ergonomist) — the ladder both calls rest on
- `inventory.of=fulcrums._.md` — the lever-collapse table this entry's dependency belongs in
- `…case=F05….md` · `…case=F07….md` — the two levers that delete this entry's subject

### 🔴 .the demos that RENDER this call

| demo | what it renders | marked unruled? |
|---|---|---|
| `case=2` t2 | the shipped hint `wait for the box to clear, or re-send with --force to override the dirty box` — the flag's **name and its existence** | 🟡 **no** |
| `case=2` `.why the default is refuse` | the asymmetry argument, and the verdict it reaches | 🟡 **no** |
| `case=6` t1 | `there is NO --force path for this reason (unlike case=2)` | 🟡 **no** |
| `case=6` `.no force opt-out, deliberately` | the unbounded-cost argument | 🟡 **no** |

⚠️ **four renders, none marked — and that is a deliberate call rather than an oversight, so it is
recorded as one.** F06 differs from F01/F02/F08/F09 in *what* the demo renders:

| fulcrum | the demo renders | so an unmarked render… |
|---|---|---|
| F01 · F02 · F08 · F09 | a **shape** — a literal, a key, a field placement | is a silent contract choice. **must be marked** |
| **F06** | an **argued position**, with its cost table beside it | is the argument itself, on the page, for a council to overturn |

⇒ a marker on case=2's `.why the default is refuse` would say *"this section is unruled"* about a
section whose entire body is the case for the verdict. **the argument is its own flag**, and the
`--onDirty` flag name is F06's subject rather than a smuggled side effect of it.

🟡 the residual: `--onDirty force` reaches the criteria as a **flag name** regardless, and a wisher
who rules option B (no `force` at all) edits two demos. that cost is real and it is the `.rework =
clean` claim, so it is stated rather than hidden.

## .the verdict

unruled.
