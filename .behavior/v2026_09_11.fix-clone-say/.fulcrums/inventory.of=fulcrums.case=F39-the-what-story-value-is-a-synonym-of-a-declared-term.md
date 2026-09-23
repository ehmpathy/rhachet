# F39 — `--what story` is a synonym of a declared term, and the wisher coined it

## .the fork, stated fairly

the wisher named the surface: *`rhx clone get --what buffer|queue|story`, with story as the default?*

`story` reads the transcript. and `transcript` is a **declared domain term** whose cluster already
forbids `conversation` — *"the human-side label, not the on-disk artifact"* — which is the exact
objection `story` inherits.

| option | the value set | what it costs |
|---|---|---|
| **A — keep `story`** (taken) | `story` · `buffer` · `queue` | a synonym of a declared term sits in a published CLI contract, which `rule.forbid.domain-term-synonyms` grades a **blocker** |
| **B — `transcript`** | `transcript` · `buffer` · `queue` | the wisher's word is overridden by a rule they did not cite, and the set mixes a storage noun with two surface nouns |
| **C — `story` earns its own cluster** | as A | correct only if `story` names a genuinely DISTINCT concept, which is a call the drive cannot make alone |

## .taken, and why AT THE TIME

**option A** — the surface ships with `story`, and the collision is recorded as a dated dispute in
`term=transcript._.choice.reason.md` rather than absorbed in silence.

three reasons, in the order they weighed:

- 🔴 **the rule's own escape valve names this case.** `rule.forbid.domain-term-synonyms` offers
  *adhere or dispute*, and says a dispute is right where *"you believe the synonym is right (or names a
  genuinely distinct concept)"*. a wisher-coined word in a contract is the strongest etymology evidence
  there is (`rule.require.persist-domain-term-evidence`), so the dispute is the sanctioned move — never
  a workaround around the forbid
- **the claim has real force.** `--what` names three READ SURFACES. `buffer` and `queue` each name a
  surface a reader looks at; `transcript` names the FILE the third read opens. option B is the only
  value set that mixes a storage noun into a surface axis, and that asymmetry is a genuine ergonomics
  cost (`rule.forbid.ambiguous-labels` cuts both ways here)
- **the wisher's message carried a `?`.** so the word was proposed rather than decreed — which means a
  unilateral override (option B) would settle by side effect a question they explicitly opened, and a
  unilateral keep with no record would hide it. the dispute does neither

## .the rework, and why it is CLEAN

| what changes | where |
|---|---|
| one tuple line | `CLONE_GET_WHAT_VALUES = ['story', 'buffer', 'queue']` — the type DERIVES from it |
| one hint string | the `asCloneGetWhat` constraint copy |
| the `--help` line | `clone get --help` |
| a handful of snapshots | `clone.acceptance`, `clone.help.acceptance` |

⇒ the type derives from the tuple, so a rename is compiler-forced through every consumer. **no caller
outside this repo can hold the value yet** — the flag ships in this PR, so there is no back-compat
surface to honor. clean by the definition `rule.always.defer-fulcrums-to-last` gives: a swapped default
that does not ripple.

## .confidence

**58%** that option A survives the council.

why it is barely above a coin flip, stated plainly:

- the rule that option A violates is graded a **blocker**, and the exemption it leans on is a *process*
  (a recorded dispute) rather than a *substantive* defense. so a reviewer who reads the forbid and not
  its valve will grade this a defect on sight
- and the counter-argument is strong: `conversation` was already refused for the reason `story`
  inherits, so the glossary has effectively pre-ruled the axis once
- what holds it above 50% is the wisher's authorship plus the `?` — a rule may not settle a word its
  author asked about

🟡 **it is above the ~50% bar cure 34 named, and only just.** that bar came from F15, whose deferral was
carried at 45% and refuted — so this row states the figure rather than rounds it up, and a drop below 50
on any later read should convert it from a guess to a surfaced question.

## .where

- `src/domain.operations/clone/cli/asCloneGetWhat.ts` — the tuple, the parse, the hint
- `.agent/repo=.this/role=any/briefs/domain.terms/term=transcript._.choice.reason.md` — the dispute
- `blackbox/cli/clone.help.acceptance.test.ts` — the `--help` line that publishes it

## .the verdict

unruled. **surfaced because a declared term is involved**, and because the wisher's own `?` invites the
check rather than forecloses it.
