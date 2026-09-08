# domain.term.choice.reason: cli.sentence

## .etymology

**a sentence is a unit of prose that states one claim.** that is exactly beat 1's job: name what
broke, in one claim, and stop. the word arrives with the right bound already attached — a sentence
that also told you what to do next would be two sentences.

the boundary is `cli` rather than bare, because `sentence` outside a cli render is a plain english
word with no domain sense (`rule.require.boundary-qualified-terms`). inside the cli boundary it
names one row of a `cli.frame`.

rejected, and why:

| candidate | why not |
|---|---|
| `message` | ⚠️ **already taken, and taken by the WRONG concept.** `Error.message` on a `HelpfulError` is the raw string with metadata serialized into it — a superset that includes the fix. to reuse the word would name two concepts with one word (`rule.forbid.domain-term-ambiguity`) |
| `summary` | a summary condenses a whole; beat 1 is one part of a whole, never a condensation of it |
| `headline` / `title` | both imply *"the row above the content"*. beat 1 is not above beats 2–3; it is beside them |
| `blurb` | carries no bound at all — a blurb may say aught |
| `firstLine` | names a **layout coincidence**, never a concept. it happens to be true of some renders and is false of any error whose first beat wraps |

## 🚨 .the census that forced the term — four derivations, two opposite senses

taken 2026-09-03 at `6840c69`, over `src/**` for `asSentence|asFailureSentence`:

| site | how it derives | what it yields |
|---|---|---|
| `keyrack/reach/assertKeyrackReachRequiresKey.test.ts` — `asSentence` | `message.split('\n')[0]` | the first LINE |
| `keyrack/assertKeyrackExportNamesDistinct.test.ts` — `asSentence` | `message.split('\n')[0]` | the first LINE |
| `upgrade/execNpmInstallGlobal.test.ts` — `asFailureSentence` | `redact(['metadata']).message` | ✅ **beat 1 alone** |
| `upgrade/asNpmInstallFailureError.test.ts` — `asSentence` | redacted message **+ the hint** | ⚠️ **beats 1 + 3, composed** |

⇒ **`asSentence` and `asFailureSentence` name OPPOSITE senses in peer files.** one is beat 1
alone; the other is beat 1 with beat 3 appended. both were authored in this same drive, by me,
within days of each other — which is the whole argument for the glossary: a word left unitemized
drifts inside one round, not across years.

## 🚨 .the measured property that gives the term its load

`HelpfulError.message` **serializes its own metadata into itself**. so:

```ts
expect(error.message).toContain(hint)   // ⚠️ CANNOT FAIL — the hint is inside .message
expect(error.redact(['metadata']).message).toContain(hint)  // ✅ a real assertion
```

a clamp written against the raw `.message` is a **decoration** — it passes whether or not the code
does what it claims to check. that measured fact is why the concept earns a word: the word is what
stops the next author from a reach for `.message` under the name of beat 1.

the production contracts already state the split in prose — `asNpmInstallFailureError.ts` carries
*"the sentence names WHAT broke; the hint names WHAT TO DO"* — so the concept was real and spoken
before it was named. this file names it.

## .disputes

### dispute: message — raised 2026-09-03 — status: OPEN

- raised.by  = self (the census above)
- claim      = `Error.message` is the extant, standard word for *"the line a human reads"*, and every
               js developer already holds it. a second word is a synonym invented for our comfort
- counter    = ⚠️ **on a `HelpfulError` the two are not the same value.** `.message` is a SUPERSET —
               it carries the serialized metadata, so it includes the fix. to call beat 1 *"the
               message"* is to name a proper subset with the superset's word, which is exactly the
               overload `rule.forbid.domain-term-ambiguity` forbids. and the cost is measured, not
               theoretical: an assertion on `.message` cannot fail
- resolution = ⏳ open. `message` stays the word for the RAW string (it is `Error`'s own field and we
               do not own it); `sentence` names beat 1. the dispute stands because the two words
               sit one property-access apart and will be confused again

### dispute: asSentence vs asFailureSentence — raised 2026-09-03 — status: OPEN (deferred)

- raised.by  = self
- claim      = the two fixtures should share one name, since they are the same operation
- counter    = 🚨 **they are not the same operation** — `asSentence` in
               `asNpmInstallFailureError.test.ts` composes beats 1+3, while `asFailureSentence` in
               `execNpmInstallGlobal.test.ts` returns beat 1 alone. a shared name would fuse two
               senses rather than settle them. the composed one is misnamed: it yields a
               `cli.frame` row, never a sentence
- resolution = ⏳ **open, and deliberately NOT renamed this round.** the branch is blocked on two
               human levers and its diff already overflows every l1 review lane at
               `111.9% of 1M tokens`; a rename of test fixtures would add churn to a diff no
               reviewer can currently read, against `rule.require.review-test-changes`.
               **trigger:** the next round that touches either file renames the composed one to
               `asFrameRow` (or its measured equivalent) and leaves `asFailureSentence` as-is

## .evidence

- **discovery move** = a census (`rule.require.enumerate-before-you-name`) — every instance the word
  must cover was listed BEFORE the word was picked. that list is what exposed the opposite senses;
  a single-instance read would have found neither
- **the measured property** = `HelpfulError.message` includes serialized metadata, so
  `toContain(hint)` on it is unfalsifiable. verified this round when the clamp on the inline hint
  was repaired to read through `.redact(['metadata'])`
- **the canon** = `rule.require.errors-name-the-fix` (ergonomist) names the three beats — what /
  why / fix. this term names the first; `fix` names the third; `why` the second
- **invariant** = a sentence never contains its own fix. if a render shows both on one line, that
  line is a `cli.frame` row composed of two beats, never a sentence
