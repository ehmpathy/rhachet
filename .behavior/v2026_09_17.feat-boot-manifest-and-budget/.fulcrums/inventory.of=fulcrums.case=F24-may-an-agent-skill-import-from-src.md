# fulcrum F24 — may a `.agent/` skill import from this repo's `src/`?

- raised  = `5.1.execution` `review.peer r008` (behavior-intent-coverage, nitpick.1)
- rework  = clean
- status  = ANSWERED
- confidence = 🔴 **97%**

## .the fork, stated fairly

`calc.tokens.ts` constructs its own tokenizer:

```ts
import { encodingForModel } from 'js-tiktoken';
...
const encoder = encodingForModel('gpt-4o');
```

a reviewer graded that a duplication, and cited **this behavior's own brief**:

> *"reuse the extant domain operation. `calc.tokens` wraps `calcBrainTokens`'s tokenizer rather
> than a second copy of it. a skill that re-implements a domain operation is a second path beside
> a serviceable one."* — `howto.entool-a-measurement-as-a-skill.md`

⇒ **the citation is fair and the reviewer read the brief correctly.** the fork is what *"reuse"*
means for an artifact that does not live in `src/`.

| option | what it claims |
|---|---|
| **A — import it** | `calc.tokens.ts` imports `getOneBrainTokenEncoder` from `src/domain.operations/brainCost/`, so one memoized accessor serves both |
| **B — reuse the VOCABULARY, not the module** | the skill constructs its own `o200k_base` encoder at module scope; `src/` is not reachable from it |

## .taken, and why at the time

**B.** three grounds, and the first is dispositive on its own:

**1. 🔴 a `.agent/` skill is not in this repo's module graph — it is a SYMLINK in every consumer.**
`roles link` symlinks a role's dir into a consumer repo's `.agent/`, which is the whole mechanism
`define.invariant.a-symlink-under-agent-is-foreign` rests on — and which this behavior's
requirement 8 already measured at **13 of 15** specs. so a consumer that runs
`rhx calc.tokens` executes the skill from **their** tree, where an `@src/...` specifier points at
**their** `src/` or at naught.

⇒ **option A does not make the skill share an operation. it makes the skill break wherever it is
linked**, which is everywhere but here.

**2. the defect memoization exists to prevent cannot arise.** `getOneBrainTokenEncoder` is memoized
because a long-lived process would otherwise pay ~1.8s of construction per call. a skill is a
**one-shot program**: it constructs once at module scope, encodes the corpus, and exits. the code
states this, at the site:

```ts
// .note = that operation is deliberately NOT imported. a `.agent/` skill is a standalone
//   program that ships beside the briefs and reaches into `src/` not at all, and the
//   defect memoization exists to prevent — a per-CALL construct — cannot arise here,
//   since this process encodes from one module-scope encoder and then exits.
```

**3. the brief's claim is satisfied as written.** it says the skill *"wraps `calcBrainTokens`'s
**tokenizer**"* — and it does: the same library (`js-tiktoken`), the same model (`gpt-4o`), the
same vocabulary (`o200k_base`). the shared thing is the **encoder choice**, which is the property
that would make two counts disagree. a second `import` statement shares no additional truth.

⇒ 🟡 **and the brief is the weaker half of its own claim.** *"reuse the extant domain operation"*
reads as *"import it"*, and for a `src/` caller it means exactly that. the brief owes the
`.agent/` carve-out in its own words — filed below.

### ✅ the carve-out is DELIVERED — `5.1.execution`, 2026-09-19

`howto.entool-a-measurement-as-a-skill.md` now carries a `### 🔴 .but REUSE is not IMPORT` section
under the very clause the lane cited, plus **two new enforcement rows**:

- a `.agent/` skill that imports from this repo's `src/` = **blocker**
- a skill that duplicates a domain operation's **vocabulary** with no clamp = **blocker**

🔴 **the second row is the one the dispute owed and the fulcrum had not yet demanded.** it is what
parts a *sanctioned* duplication from a *silent* one: the model string legitimately appears twice,
and what makes that safe is `calcBootPayloadTokens.test.ts:114-117` — an exact-count pin whose own
comment says *"pinned to a value, never a range … a range would hide a vocabulary change."*

⇒ **so the reviewer's concern is now answered in the brief rather than only in this fulcrum.** that
is the `r009` lesson applied one file over: **a fulcrum is a record of a decision, never a delivery
of it** — where a decision changes what a later author reads, the fulcrum owes a companion edit at
the surface.

## .rework, and why

**clean.** were B refuted, the repair is one import and one deleted line at a single call site.
no caller is hardened against either shape.

## .confidence, and why it is not higher

**97%.** ground 1 is mechanical and checkable — `roles link` creates the symlink, and a linked
skill has no path to this repo's `src/`. the 3% is that I have not **executed** `calc.tokens` from
a consumer repo to watch the import fail; the argument is from the link mechanism rather than from
a reproduction.

⇒ and it is worth naming that a reproduction is cheap and was not run. a peer lane that disputes
this should ask for one rather than re-argue the mechanism.

## .what it costs, stated plainly

- the `gpt-4o` model string now appears at **two** sites, and a future vocabulary change must
  touch both. that is a real duplication, and it is the price of a portable skill
- 🟡 **the mitigation is a clamp, not a convention:** `calcBootPayloadTokens.test.ts` pins the
  vocabulary by asserting an exact count rather than a range, *"so a range would hide a vocabulary
  change"*. a divergence between the two sites therefore turns a test red rather than drifting

## .what would overturn it

- a mechanism by which a linked `.agent/` skill can reach this repo's `src/` — then ground 1
  falls and option A is simply better
- a decision that `calc.tokens` is repo-local and must never be linked — then the portability
  argument does not apply, and the import is free

## .where

- `.agent/repo=.this/role=any/skills/calc.tokens.ts:353-361` — the note and the construction
- `.agent/repo=.this/role=any/briefs/howto.entool-a-measurement-as-a-skill.md` — the brief the
  reviewer cited, and the one that owes the carve-out
- `.agent/repo=.this/role=any/briefs/define.invariant.a-symlink-under-agent-is-foreign.md` — the
  invariant ground 1 rests on
- `src/domain.operations/brainCost/getOneBrainTokenEncoder.ts` — the operation not imported

## .the verdict, once ruled

— (open; taken as B for this stone, and cited in the `--as disputed --why` for r008 nitpick.1)
