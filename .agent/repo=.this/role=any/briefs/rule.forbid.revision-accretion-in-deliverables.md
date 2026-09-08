# rule.forbid.revision-accretion-in-deliverables

## .what

a **deliverable** — a vision, a blueprint, a distillate, a brief, a readme — must state **what IS**.
it must not narrate its own revision history.

a **review** — a dated inspection record — is where the trail of a correction belongs.

these are two artifact kinds with two different natures, and the trail belongs to exactly one of
them.

## .why

a review is a **dated inspection record**. its nature is temporal: it says *"on this date, against
this subject, I found X."* a reader who cites it must know the version it inspected, so the trail is
the artifact.

a deliverable is a **statement of what IS**. a reader consumes it to learn the current design, not
the path that reached it. every revision block a deliverable carries is decode tax: the reader must
diff the layers to find what holds now, and the dead layers outnumber the live one.

this is `rule.require.timeless-comments` at document scale, and
`lang.prose/rule.forbid.chronological-accretion` applied to a whole artifact rather than a passage.

## .the trap that produces it

**in-place revision across review rounds.** each round's find is *appended* as a ⚠️ correction block
rather than *absorbed* into the prose. four rounds later the deliverable is a stratigraphy: a first
draft, plus four layers of "an earlier draft said X; it now says Y."

the second half of the trap is structural, and it is the harder one to see: when a review changes
the **recommendation**, an in-place revision *demotes* the old option instead of *rewrites around*
the new one. the demoted option keeps every table column, every comparison, every section it framed
— so it still carries the structure while it claims to be a footnote.

⚠️ **and one review conclusion that sounds honest makes it worse:** *"the trail of a correction
should survive rather than be silently erased."* that is true — and it names the **review artifact**,
never the deliverable. to apply it to the deliverable is to file a temporal record under a timeless
heading.

## .the test

grep the deliverable for its own history:

```
earlier draft|first draft|once looked|a correction to|this revision|became the fallback|no longer
```

any hit is accretion. then ask the structural question, which grep cannot answer:

> if the recommendation had been the FIRST thing written, would the document look like this?

if the answer is no — if a demoted option still supplies the comparison tables, the section order, or
the framing — the deliverable was revised in place rather than rewritten.

## .how

when a review round changes a deliverable:

1. **absorb the find into the prose.** state the corrected fact as what IS; do not narrate that it
   changed
2. **put the trail in the review artifact**, which is dated and whose whole nature is the record
3. **when the recommendation changes, rewrite around the new one** — do not layer it over the old
4. **demote a rejected option to one honest paragraph**, never a threaded comparison
5. **if a review quoted text that later moved, add a dated note to the review** — one line: the find
   still holds, only its form in the deliverable moved. that keeps the review citable without a
   pretense that its quotes are still verbatim

## .examples

### 👎 bad — the deliverable narrates its own revisions

```md
### why the fork became the fallback

an earlier draft of this vision recommended the fork. r3 found that our CI already builds the
binary, so the recommendation now reads differently. the comparison table below still lists the
fork first, since that was the original frame.
```

### 👍 good — the deliverable states what IS

```md
### the recommendation — vendor our own prebuild, built in our own CI

...

### the contingency, recorded

if the vendored build proves harder than it reads, `@lydell/node-pty` is the fallback shape.
it is not the recommendation, for the provenance reason above.
```

...with the trail of *how* the recommendation moved kept in the dated review that moved it.

## .enforcement

- a revision-history reference in a deliverable = **blocker**
- a demoted option that still frames the deliverable's structure (its tables, its section order) =
  **blocker**
- a review that quotes post-fix text which later moved, with no dated note = **nitpick**

## .see also

- `rule.require.timeless-comments` (mechanic) — the code-comment twin of this rule
- `lang.prose/rule.forbid.chronological-accretion` (mechanic + architect) — the passage-scale peer
- `rule.always.trust-the-self-review-process` — the review rounds that produce the trap
