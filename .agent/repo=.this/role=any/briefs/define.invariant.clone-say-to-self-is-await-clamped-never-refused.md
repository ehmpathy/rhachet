# define.invariant.clone-say-to-self-is-await-clamped-never-refused

## .what

**a clone MAY say to itself. the dispatch is ordinary; exactly one knob is clamped —
`--await release` lowers to `enqueue`, with a notice.**

a self-say is how a clone nudges its own next turn (a self-driven loop) and how it hands itself a
client-level slash command (`/model`, `/compact`). it is a **key capability**, and no refusal stands
between a clone and its own address.

## .kind

**nurture**, and narrow. the clamp is a choice we make because the alternative — poll the full bound
for a drain that cannot happen — spends 15s to reach a verdict we can compute in zero.

## .invariant

```
caller.serial === target.serial   ⟹   target := 'enqueue'      (never a refusal)
```

## .why the clamp — one mechanism, and only one

`released` needs a transcript rise **and** an empty queue (`computeCloneSayVerdict.ts:184`). the
caller runs **inside its own active turn** — the `clone say` process IS a tool call the brain is
mid-way through — so its own queue cannot drain until this very say returns.

⇒ so `--await release` against self would poll the whole bound for an impossible drain. the honest
act is to lower the target to `enqueue` and say so on stderr.

🟡 **every other knob works.** `--force`, the modal refusal, the dirty-region refusal, the debug
capture, the verdict trio — each behaves identically to a peer say, because each is either a
**server-side instantaneous classification** or a **rise over a count**, and neither is poisoned by
self-reference.

## 🔴 .what this REPLACES — `define.invariant.clone-say-has-a-peer-target`, retired

that invariant refused a self-say outright, on **serial equality alone**, and labelled itself
`nature` — *"no design decision could have gone otherwise."* it rested on two mechanisms, each
claimed *"either alone sufficient."* **both were wrong**, and the refutation of each was already on
disk in this same wish:

| the claimed mechanism | what refutes it |
|---|---|
| **the release deadlock** — *"the poll waits for a transcript rise that is impossible while it waits"* | the brain writes each user turn to the jsonl **the moment it is submitted**, client-side, before any reply (`getCloneSubmittedCount.ts:12-14`, measured against a live peer 2026-09-18 at **678ms**). the rise never waited on a brain turn, so no deadlock reached it |
| **the baseline collision** — *"the caller's own screen already renders the tool call, so no post-read can part the echo from the dispatch"* | refuted by the rise rule it cited. a baseline that **already holds** the text is exactly the case a COUNT parts and a boolean cannot (`getCloneSubmittedCount.ts:15-17`) — a pre-write count of 1 that ticks to 2 is as observable as 0 → 1 |

⇒ 🔴 **the first refutation was written into this repo on 2026-09-18** and sits in
`computeCloneSayVerdict.ts:146-150`: *"the vision justified that ranking as 'a transcript rise is
the stronger observation', and the premise was refuted by measurement."* the invariant was authored
2026-09-17 and **never re-derived against it**.

### the one measurement it rested on was confounded

> the retired invariant: *"48 poll cycles over 15.4s, `countInInput=0` and `countOnScreen=2`
> unchanged on every one, verdict `absent` / `no-rise-observed`."*

that run is confounded with a **separate, named** defect its own `.scope` table listed as a near
neighbour: a clone that **adopts its parent's live transcript by mtime**, so its submit-count reads a
file that never gains its turns
(`.dream/2026_09_16.a-clone-adopts-its-parents-live-transcript-via-mtime.dream.md`). a count that
cannot rise produces exactly `absent` / `no-rise-observed`, for a reason with no relation to
self-reference.

### the measurement that settles it

> **measured 2026-09-20**, a real brain-cli clone that ran `clone say` against **its own** address:
> `delivered: true` · `verdict: enqueued` · `probe: capable` — and the clone confirmed it landed, in
> its own words: *"the `SELFPONG` that arrived as a new user message is the payload I just wrote
> into my own input box."*

⇒ so the retired claim — *"the residual verdict, every time"* — is **false**. and `probe: capable`
settles mechanism 2 directly: the self-say read its own screen **perfectly**.

### 🟡 the same run found the real defect the 2026-09-17 measurement probably read

the first self-say returned `withheld` / `input-region-dirty`, and the debug capture's grid names
why — the clone's **own hook output** occupies its input box:

```
19 │────────────────────────────────────────────────────────────────────────────────│
20 │❯ Using Node v22.21.0                                                           │   ← the input box
21 │────────────────────────────────────────────────────────────────────────────────│
22 │  🗿 route complete 🌴🤙               2 c                                       │   ← stophook output
```

⇒ the pre-check was **right** to withhold, and `--force` landed it. but a check that fires on every
self-say teaches a caller to always `--force`, which defeats it — so the box-vs-hook-panel read is
its own defect, caught at
`.dream/2026_09_20.a-clones-own-hook-output-occupies-its-input-box.dream.md` rather than absorbed
here.

## .the record — how a key capability was closed with no wisher call

stated plainly, because the process failure matters more than the code one:

| what happened | what was owed |
|---|---|
| a capability the wisher considers **key** was closed | a **fulcrum row**, so the council could see the call |
| the refusal was labelled **`nature`** | `nature` means *no decision could have gone otherwise* — so that label made it **unarguable** |
| the label rested on **one** measurement, confounded with a named defect | `rule.require.refute-a-premise-with-a-measurement` — the measurement had to be clean |
| a refutation of mechanism 1 already sat in this wish's own source | `rule.always.reuse-pavement-before-improvise` — the pavement was one file away |

⇒ 🔴 **`nature` is the load-bearing error.** a `nurture` refusal invites a wisher to overrule it; a
`nature` one tells them the domain forbids it. so the mislabel did not merely record a wrong
conclusion — it removed the wisher's seat at the decision.

## .scope

it governs the **self** case only, by serial equality. it says naught about:

| case | behavior |
|---|---|
| two clones of the same actor | a normal peer say — untouched |
| a clone with no `RHACHET_CLONE_SERIAL` (a human at a terminal) | not a clone, so never a self-say |
| a self-say into a **dirty** input box | `withheld` / `input-region-dirty`, and `--force` overrides — identical to a peer |
| a self-say while a **modal** holds focus | `withheld` / `modal-holds-focus`, **no force path** — identical to a peer (V3) |

## .the counter-argument, stated fairly

*"a self-say is still awkward: its own tool-call render sits on its screen, and a caller who reads
`enqueued` cannot tell their own echo from their dispatch."*

⇒ true of a **presence** read, and the verdict set reads **rises**. every field is a post-bound read
compared against a pre-write baseline, which is precisely the instrument that parts the two. the
2026-09-20 measurement is the proof: `enqueued`, off a baseline that already held the text.

## .what would overturn it

a brain-cli whose client **drains its own queue while a tool call is in flight** would make
`--await release` reachable, and the clamp would become a needless narrow. that is a property of the
brain-cli, and the repo pins its version — so a pin lift is the moment to re-measure.

## .enforcement

- a self-say **refused** = **blocker** — it closes a key capability
- a self-say whose `--await release` polls the full bound = **blocker** (clamp it, and say so)
- a self-say that reports a verdict with **no** `delivered`/`verdict`/`probe` trio = **blocker**
- a mechanism claimed `nature` with **one** measurement behind it, where a named defect could
  produce the same read = **blocker** (`rule.require.refute-a-premise-with-a-measurement`)
- a self-say clamp that fires with no notice on stderr = **nitpick**

## .see also

- `isCloneSayToSelf.ts` — the pure predicate, with the two refutations in its docblock
- `define.invariant.clone-say-delivery` — what the verdicts mean
- `define.brain-cli-input-states` — the `buffered` / `enqueued` / `released` triple
- `rule.forbid.deferrals-short-of-a-dedicated-pr` — the rule the retired refusal broke
- `.dream/2026_09_16.a-clone-adopts-its-parents-live-transcript-via-mtime.dream.md` — the defect the
  confounded measurement probably read
