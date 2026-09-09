# domain.term.choice.reason: glyph

## .etymology

greek *glyphē*, a carved mark. in typography a **glyph** is the rendered form a character takes —
distinct from the **codepoint** that identifies it. that split is the whole reason the word was
reached for here: this repo needs a noun for *the mark as it appears to a reader*, separate from
*the character it happens to be*.

put plainly: `glyph` is the typographic word for *a mark that carries sense*, and it names the
**role a character plays in a render** — exactly the property this repo cares about.

the word was already in use in this repo's prose (`choice.clone-glyph`,
`rule.prefer.emoji-language`) long before it entered a contract. it is adopted, never coined.

## .why it is itemized NOW, and not earlier

the trigger is `rule.require.domain-term-itemization`: a word earns a cluster when it composes a
dobj or dop **this repo declares**. `glyph` crossed that line the round `asCliErrorGlyph` and
`asCliExitStatusLine` were declared — two contracts, one noun, no entry.

⚠️ **prose use is not the trigger; a contract is.** the word sat in briefs for many rounds with no
entry owed, which is correct — a brief may reach for any english. the moment it names a return
value, every future caller inherits it, and the glossary must say which sense they inherited.

## .the dispute that settles the shape

### dispute: emoji — raised 2026-09-02 — status: RESOLVED (both stand, on different axes)

- raised.by  = driver, mid-round
- claim      = the repo already carries `rule.prefer.emoji-language` and `helpful-errors` spells
               its field `static emoji`. two words for one concept is synonym drift, so one
               should be forbidden — and `emoji` has the stronger claim, since it is the extant
               rule's own name.
- counter    = they are not one concept. **`emoji` names a character class; `glyph` names a role
               in a language.** the test is a sentence where they cannot swap: *"the language is
               built from emoji"* is true and *"built from glyphs"* is circular; *"read the error's
               glyph"* is legible and *"read the error's emoji"* names the character rather than
               the verdict it carries. a rule that forbade either word would make one of those two
               sentences unwritable.
- resolution = keep BOTH. neither is a forbidden synonym of the other. the cluster's `.what` states
               the axis split so the next reader meets it rather than re-derives it. what IS
               forbidden is either word used for the other's question.

⚠️ **this is the `rule.forbid.domain-term-ambiguity` case in reverse.** the usual hazard is one
word stretched over two concepts; here two words genuinely name two concepts, and the hazard was a
premature merge that would have erased a real distinction.

⇒ no other dispute is open on this term.

## .evidence — two contracts, one round, and they disagree about the KEY

the pair is what proves `glyph` names a concept rather than a preferred spelt form. both return a
glyph; they read a different thing to pick it:

| operation | keyed on | why that key |
|---|---|---|
| `asCliErrorGlyph` | the error's CLASS (`static emoji`) | severity is a property of the class — `ConstraintError` is always the caller's |
| `asCliExitStatusLine` | the exit-code VALUE | a spawned subprocess carries an arbitrary code 0-255, never a class. per-class is unavailable |

⇒ a single operation could not serve both: a class read against a subprocess would render `✋` for
every code, a real `💥` too. so the two sit side by side, and the noun they share is what makes
their difference legible — same concept, two selectors.

that is the discovery test a term passes: **two independent sites needed the word, and each needed
it for a different reason.**

## .why not emoji / icon / symbol / badge / mark / sigil

- `emoji` — names the *character set*, never the role. `✓` and `├─` are glyphs in our palette and
  are not emoji at all, so `emoji` cannot name the category. ⚠️ it is still not a forbidden synonym
  outright — see the dispute above; what is forbidden is `emoji` used where the ROLE is meant
- `icon` — ui vocabulary. it implies a pictorial stand-in for an OBJECT (a file, an app) and a
  clickable affordance in a graphical surface. our glyphs stand for a VERDICT or a domain-root,
  never for an object, and they are bytes in a terminal stream
- `symbol` — the widest word in the set, and already in service elsewhere in software and in this
  codebase: a symbol table, javascript's `Symbol` primitive, the `MARK_AS_HELPFUL_ERROR` registered
  symbol key. it would collide the day this repo touches any of them, so it is an ambiguous overload
  (`rule.forbid.domain-term-ambiguity`)
- `badge` — implies an award or a count attached to another element. a glyph is the first word of
  a line, not an ornament on one
- `mark` — too generic to survive a grep, and it is the stem of `marker`, which this repo already
  declares for the opposite direction (a shape an emitter prints, which we match). one stem for
  both would collapse an inbound concept into an outbound one
- `sigil` — already taken by `define.address-sigils` for the `@` in `@all` / `@this`. one word, one
  concept

`mascot` was never a candidate — it is a **separate concept** already in use for role voices, and
the boundary between them carries enough weight that `rule.require.keyrack-emoji-palette` devotes
a whole table to it.

## 🔴 .evidence — a glyph has exactly ONE owner, and the round that proved it

the axis below answers *"who authors the token"* with **"we"**. that was true and **too coarse**,
and the gap shipped a defect on 2026-09-04.

`asCliErrorFrame` was repaired to render the unabridged `<glyph> <Class>: <message>`. two throw
sites then rendered a **doubled glyph**:

```
✋ BadRequestError: ✋ roles with bootable content but no valid boot hook
```

because `assertRegistryBootHooksDeclared` and `assertRegistryHooksNoNpx` had each baked `'✋ '`
into the head of their own message string. both are "we". both print a glyph. **so the outbound
axis alone declared them correct.**

⇒ 🔴 **the refinement: within our own code, exactly ONE layer owns a glyph — the RENDER.** a
thrower supplies a class and a message; the render reads the class and supplies the mark.

| the layer | what it owns | what it must never do |
|---|---|---|
| a **thrower** (`throw new XError(msg, meta)`) | the class, the message, the metadata | print a glyph — the render will add one |
| a **render** (`asCliErrorFrame`, `asCliErrorGlyph`) | the glyph, read off the class | invent a class the thrower did not raise |
| a **direct writer** (`process.stdout.write`) | its glyph, because it IS the render | — |

⚠️ **the third row is why this is a boundary rather than a ban.** `withSsoTimeout` and
`sourceAllKeysIntoEnv` both open a treestruct with `'✋ '` and both are correct: they write to
stdout themselves, so they are the render for their own output. **the test is not "is it a string
literal?" — it is "does this code path pass through `asCliErrorFrame`?"**

### ⚠️ why the defect was INVISIBLE until the prefix was unabridged

under the redacted render (`<glyph> <message>`), a doubled glyph could not appear. the frame's
glyph and the message's glyph occupied the same slot, so the output read `✋ roles with…` whether
the message owned the mark or the frame did. **the two shapes were indistinguishable.**

⇒ the double is not a defect the repair introduced. it is a defect the repair **revealed** —
latent for as long as the redaction stood, and detectable only once a class name sat between the
two marks.

**the durable lesson: a term whose ownership is unstated will be claimed twice, and a render that
elides structure hides the second claim.**

## .evidence — the word was already canon, and the palette is declared

**the word is already canon.** `rule.require.keyrack-emoji-palette` uses `glyph` throughout and
never `emoji` in its own prose — *"keyrack's own root glyph"*, *"the blocked leaf glyph"*,
*"`💥` … the shared `MalfunctionError` glyph"*. this itemization records a choice the repo had
already made in practice.

**the palette is declared, not ad hoc** — nine entries with one slot and one sense each
(`rule.require.keyrack-emoji-palette` `.the palette`).

## .evidence — the pair law was settled by an incident, 2026-09-05

a render change kept the class name but left the glyph hardcoded to `✋`, so
`getKeyrackInfraInitErrorReport` emitted `✋ MalfunctionError: gh repo create failed` — the
caller-fixable glyph on a server-fixable class. neither half was wrong alone; the **pair** was.
the repair was to stop the two independent reads:

```ts
// before — the class read off the message, the glyph hardcoded ⇒ they can disagree
const errorClass = redactedMessage.match(/^[^A-Za-z]*([A-Z][A-Za-z]*Error):\s*/)?.[1] ?? …;
`   └─ ✋ ${errorClass}: ${bareMessage}`

// after — one read, off the constructor ⇒ they cannot
const ctor = input.error.constructor as { name: string; emoji?: string };
`   └─ ${ctor.emoji ?? '✋'} ${ctor.name}: ${bareMessage}`
```

⇒ the invariant this term now carries: **a glyph and the word it pairs with are read from one
source, or they will drift.**

**a corollary settled the same day**: `.name` is not that source. `HelpfulError` never assigns
`this.name`, so it reads `'Error'` for every subclass — a fallback that looked correct and was
silently wrong for every error whose message had been hand-composed.

## .the neighbors this cluster keeps apart

`glyph` sits between two extant declared terms, and all three are short tokens that carry a sense:

```
sigil   →  a human TYPES it     (@:)         → we parse   → define.address-sigils
marker  →  an emitter PRINTS it (ERR_PNPM_*) → we match   → term=marker
glyph   →  WE print it          (✋ 💥 😶)    → a human reads
```

⇒ the axis is **who authors the token, and who consumes it**. stated once here so no later round
has to re-derive it from three separate files.
## .see also

- `term=chrome._.choice._.md` — the content-vs-chrome axis a glyph sits on (a glyph is content)
- `term=blocked._.choice._.md` — the term whose *render* is a glyph + a class, never the word
- `rule.require.unabridged-error-prefix` — the class half of the pair
