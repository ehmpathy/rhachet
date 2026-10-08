# F50 — this repo's own `role=any` budget: a ratchet at `25_000`, or trim to `5_000`?

- **rework** = `clean`
- **status** = OPEN — best-guessed, flagged for the council
- **confidence** = **82%**
- **raised at** = `5.1.execution.from_vision`, after the `.this` onStop hook was dogfooded (S18)

---

## .the fork, stated fairly

the findsert writes `budget: { tokens: 5_000 }` where a `role=any/boot.yml` declares none. this
repo's own `role=any` payload measured **22,697 tokens**, so the default cap would halt every stop
of every session in this repo, from the moment the hook landed.

| option | what it does |
|---|---|
| **A — ratchet** | set the cap just above the measured payload (`25_000`), with a comment that says it only moves down, and a raise is a reviewed choice |
| **B — trim** | move `say` briefs to `ref` or `.md.min` until the payload fits `5_000` |
| **C — leave it unset** | 🔴 not on the table. the findsert would write `5_000` at the next `init`, so C collapses into B |

## .taken, and why

**taken: A.** the gate's job (S18) is to catch **growth**, not to force a trim of a payload that
was already in place. a ratchet at the current size catches the next brief that piles on, which is
the hazard S18 names. B is a real trim of this repo's boot, a separate call about which briefs earn
residence (`philosophy.minimal-budget-for-maximum-perspective`), and not this behavior's to make.

## .rework, and why it is clean

one line in `.agent/repo=.this/role=any/boot.yml`. lower it as briefs move to `ref`; no caller or
test depends on the value.

## .confidence, and why it is not higher

- `25_000` leaves ~2.3k tokens of headroom. that may be too loose to catch one mid-size brief, or
  too tight to absorb an unrelated rename of a `say` brief. unmeasured either way
- the wisher asked for a findsert of `5_000` as best practice. a repo that sits 5× over the default
  may read as a sign the default is wrong, rather than that this repo is heavy

## .a side effect the council should see

once a `.this` spec declares a budget, the built-in gate arms, so the hook sync runs for this repo
on each `init --hooks` (`S20`; no hook file exists). a repo with **no brain adapter** installed now
gets a hook-sync error it did not get before: the gate has a declaration and no brain to relay it
into. the error is loud and names the absent adapter, so it fails fast rather than silently; but it
is a new surface for such a repo.

## .verdict

**ruled by the wisher 2026-10-06: neither arm as posed — a cap of `15_000`, with the boot tuned to
fit.** the `25_000` ratchet was a guess, never a choice the wisher made.

the tune moved four `say` briefs to `ref`, each long reference detail behind a shorter cue that
stays resident:

| moved to ref | tokens | the resident cue that still fires |
|---|---|---|
| `define.actor-clone-hierarchy` | 4,382 | `catalog.of=actor-clone-design._` (its invariants + a row per brief) |
| `define.claude-md-vs-system-prompt` | 2,096 | `philosophy.minimal-budget-for-maximum-perspective` |
| `define.enrollment-identity-is-the-roleset-hash` | 1,461 | the catalog, row 2 |
| `howto.test-local-rhachet` | 1,456 | `rule.forbid.node-modules-bin-rhx` |

measured: `npx rhachet roles cost --repo .this --role any` → 22,712 before, **13,360** after, 89%
of the `15_000` cap. `npx rhachet roles cost --all --when hook.onStop` → silent, exit 0.
