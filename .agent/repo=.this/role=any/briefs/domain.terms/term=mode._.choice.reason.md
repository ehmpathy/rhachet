# domain.term.choice.reason: mode

## .etymology

latin *modus* — a manner, a measure, a way to do a thing. the word has named "the way a thing is
done" since before software, and it carries that sense unbroken: a camera's mode, a vim mode, a
`--mode plan`. the domain did not have to borrow it; a human already reaches for it.

`style` and `format` were rejected because both name the SHAPE of an output rather than the
COURSE of an action — `asKeyrackGetOutputMode` picks between `value`, `json`, and `vibes`, and
only two of those three are shapes. `vibes` is a whole rendered report; to call the choice a
"format" would understate what changes.

`strategy` and `behavior` were rejected as jargon that says the same with more syllables
(`rule.forbid.buzzwords`). `policy` is RESERVED — it already names a rule the system ENFORCES
(`term=policy`), and a mode is a thing the caller PICKS. to overload it would blur who decides.

## .disputes

### dispute: kind  —  raised 2026-09-02  —  status: RESOLVED (both words kept, on two concepts)

- raised.by  = mechanic, in the `learn.domain.terms` sweep of this round
- claim      = `term=kind` states its invariant as *"the kinds must PARTITION"*, and
               `asKeyrackGetOutputMode` partitions exactly: `'value' | 'json' | 'vibes'` are
               mutually exclusive and jointly exhaustive. it is an `as*` cast over a closed set,
               which is the literal shape `term=kind` documents. by the extant term file's own
               test, the operation should be `asKeyrackGetOutputKind` and `mode` should be
               recorded as a forbidden synonym
- counter    = the partition test is **necessary but not sufficient** — it describes the SHAPE
               both words wear, and cannot see the difference in what they ANSWER.
               `asKeyrackSlugOrgKind` reads a slug and reports what that slug IS; hand the same
               slug to two callers and they get the same answer, always. `asKeyrackGetOutputMode`
               reads no value at all — it reads the caller's own flags and reports what the
               command WILL DO, so two callers can differ because their flags differ.

               ⚠️ the decisive evidence is one line the repo already carries.
               `getRoleDeltaMode.ts:16` reads `delta.kind !== 'absolute'` to compute a mode of
               `'absolute' | 'incremental'`. the `kind` is a property of each delta; the `mode`
               is whether the consumer REPLACES or PATCHES. the same file needs both words in one
               expression, which no synonym pair can ever require.

               the practical cost of a merge runs one way and is severe: a `mode` owes a stated
               PRECEDENCE (two flags can each argue for a different answer), and a `kind` owes
               none (a value has one). collapse them and every mode-cast loses the doc obligation
               that is the whole reason its ternary is not a bug — which is exactly what
               `asKeyrackGetOutputMode` was cut to make explicit (defect via r004, four rounds)
- resolution = keep BOTH. `kind` = what a value IS; `mode` = what a command WILL DO. each term
               file names the other as a peer with the one test that separates them, so the next
               author picks by that question rather than by the shape they both wear.
               `mode` is NOT recorded as a forbidden synonym of `kind`, and `kind` is NOT recorded
               as one of `mode` — they are peers. dispute closed.

## .evidence

### the word already carried weight before it was itemized

`--mode plan|apply` is on the published cli of nearly every skill that writes state, and
`rule.require.safe-by-default` is written in terms of it: *"bare invocation previews; run with
`--mode apply` to actually clear."* a term that a fundamental RULE is phrased in terms of does
definitional work — the strongest evidence a term can have, and the same tell last round
recorded (*"when an extant term's `.what` is written in terms of another word, that other word is
already a domain term"*).

⚠️ this is that check, run and paid. last round's note predicted the class; this round it caught
`mode` before a fourth mode-cast could be named `…Kind` by a reader who matched on shape.

### the discriminator, stated as a reviewer can check it

- a cast whose answer changes when the CALLER's flags change, for one and the same value
  → `mode`
- a cast whose answer changes only when the VALUE changes, for every caller alike
  → `kind`

a cast that is neither (its answer depends on ambient state — a clock, a cwd, an env var) is a
third case and wants a `get*` name, not an `as*` one, because it is not a pure read at all.

### what a mode-cast owes that a kind-cast does not

`asKeyrackGetOutputMode` carries a `⚠️ .note.precedence` because `--value` outranks every peer —
its contract is a raw secret for a `$(…)` capture, so any decoration breaks the caller. that note
IS the operation's content; the four-line body is a consequence of it. a kind-cast has no
counterpart, because a value cannot argue with itself.
