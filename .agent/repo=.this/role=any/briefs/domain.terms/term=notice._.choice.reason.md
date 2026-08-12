# domain.term.choice.reason: notice

## .etymology

from latin *notitia* — "a fact made known". a notice **makes a fact known**; it does not judge that
fact, and it does not report a result. that is exactly the job: a flat-namespace sweep drops a
reach, and the human must be told, though no error occurred and no value is wrong.

the word was chosen over `warn` because a warn implies a hazard to avert. an omitted reach is
not a hazard — it is a **constraint of the namespace**, stated plainly. the human is not warned
away at all; they are informed of a boundary and handed the command that crosses it one at a time.

## .the deferral this closes

captured at i069 with an honest deferral: *"`notice` has a tension with `report` and `warn` that
needs an emit-site sweep before the word can be settled."* the sweep ran at i070 — a grep of
`Notice|Report|Warn` across `src/domain.operations/keyrack`, then a read of one member of each
family. the tension resolved rather than persisted: the three words sit on **one axis** (what
triggered the render) and occupy **three separate points** on it.

that is the good outcome of a deferral. the word was not settled by taste under deadline; it was
settled by a read of every emit site that could have contradicted it.

## .disputes

### dispute: warn-as-the-noun — raised 2026-08-09 — status: RESOLVED (keep `notice`)
- raised.by  = the driver, at the i070 term sweep
- claim      = the render leads with `⚠️`, and what it describes is unwanted. `warn` is the word a
               human would reach for on sight, so it is the plainer domain word
               (`rule.forbid.ambiguous-labels` favors what a human expects)
- counter    = `warn` is already spent in this domain, on a **narrower and different** concept:
               `emitKeyrackDurationCapWarn` renders ONE LINE about ONE VALUE the command silently
               altered. the notice renders a TREE about work the command **did not do**. one word
               over both would overload a value-was-changed sense with a work-was-omitted sense,
               which is precisely the overload `rule.forbid.domain-term-synonyms` blocks. the `⚠️`
               glyph is a severity marker shared across the palette
               (`rule.require.keyrack-emoji-palette`), never a claim on the noun
- resolution = keep `notice`; record the noun form of `warn` as a forbidden synonym. the glyph
               stays.

### dispute: report — raised 2026-08-09 — status: RESOLVED (keep `notice`)
- raised.by  = the driver, at the i070 term sweep
- claim      = keyrack already renders trees under `report` (`getKeyrackBlockedReport`,
               `getKeyrackInfraInitReport`, `getKeyrackInfraInitErrorReport`). a fourth tree under a
               fresh noun is synonym sprawl — reuse `report` and the vocabulary stays lean
- counter    = the two differ on a property the type signature already carries. a `report` **is**
               the command's outcome, so it can never be absent — `getKeyrackBlockedReport` returns
               `string`, because a blocked command always has a cause to render. a `notice` sits
               beside an outcome that already stands alone, so it returns `string | null`, and
               `null` is its **normal** case. that nullability is not incidental: it is what makes
               e1 hold, since a repo that declares no reach renders byte for byte as before.
               to name both `report` would make "does this always render?" unanswerable from the
               name
- resolution = keep `notice`; record `report` NOT as a forbidden synonym but as a **peer term** on
               the same axis. both stay, each with one sense. the axis is recorded in the
               say-file's three-noun table.

## .evidence

**the emit-site sweep (i070).** every file under `src/domain.operations/keyrack` that matches
`Notice|Report|Warn` — 19 files, of which the render authors are:

| operation | noun | returns | absent when |
|-----------|------|---------|-------------|
| `getKeyrackBlockedReport` | report | `string` | never |
| `getKeyrackInfraInitReport` | report | `string` | never |
| `getKeyrackInfraInitErrorReport` | report | `string` | never |
| `emitKeyrackDurationCapWarn` | warn | `void` (writes) | the cap did not apply |
| `asKeyrackReachOmittedNotice` | notice | `string \| null` | no reach omitted |

the `returns` column is the whole argument. three reports, all non-nullable. one notice, nullable
by design.

**the prefix agrees.** `as*` marks a pure transformer that returns a shape
(`rule.require.get-set-gen-verbs`), and the notice is exactly that — it renders and returns, while
the CALLER writes to stderr. the warn carries `emit*` because it writes. so the noun and the prefix
tell one consistent story: a notice is a value a caller may or may not have, a warn is an act.

**the split is deliberate elsewhere too.** `emitKeyrackDurationCapWarn`'s own doc-comment records
that the third ttl bound is **not** announced, because *"a caution a reader learns to skip takes
this one down with it"*. the same discipline governs the notice: it renders only when a reach
was truly omitted, so it never fires on the normal path.

## .invariants

1. **a notice is nullable.** any render named `*Notice` that cannot return `null` is misnamed — it
   is a `report`.
2. **a notice never fires on the normal path.** if it renders on a run where no work was omitted,
   it becomes a line readers learn to skip, and it takes the real cases down with it.
3. **a notice never carries a secret.** it names an address (`KEY @ label`) and a fix command,
   never a value. clamped by an explicit assertion in every notice test.
4. **a notice states one fact one way across surfaces.** the three flatten surfaces (cli
   `keyrack source`, sdk `sourceAllKeysIntoEnv`, `getKeyrackKeySecrets`) share one notice
   operation, so a reach reads identically wherever it is announced.
