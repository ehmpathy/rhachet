# domain.term: glyph

term.chosen   = glyph
term.kind     = noun
term.synonyms.forbidden:
- icon
- symbol
- badge
- mark
- emoji                # ⚠️ a DIFFERENT AXIS, never a plain synonym — banned only where the ROLE
                       #    is meant. see `.the boundary` and `.on emoji`
- sigil                # ⚠️ a distinct term of its own — banned only where a glyph is meant.
                       #    see `.the two near-neighbors`

## .what

**one rendered character that carries a sense in this repo's surface language.** a glyph is a
word of that language, not a decoration: `✋` says *"yours to amend"* and `💥` says *"ours to
repair"*, so a reader who knows the language reads the verdict before the sentence.

stated from the palette side: a single pictographic character that carries a **fixed sense** in a
render — `✋` refuses, `💥` malfunctions, `🔐` roots keyrack, `🫧` marks a credential absent. a
glyph is **content**, never decoration: it is drawn from a declared palette, and each one denotes
exactly one sense.

the language itself is `rule.prefer.emoji-language`. this term names one word of it.

## .the pair law

a glyph never travels alone — it is **paired** to the word beside it, and the pair names one fact
between them:

| glyph | class | who fixes it | exit |
|---|---|---|---|
| `✋` | `ConstraintError` | the caller | 2 |
| `💥` | `MalfunctionError` | the server | 1 |

⇒ a mismatched pair (`✋ MalfunctionError`) asserts both at once, and a reader who trusts the
glyph hunts their own input for a server-side fault.

⇒ therefore **read both from ONE source**. `helpful-errors` declares the pair as two statics on
the class itself (`ConstraintError.emoji = '✋'`, `MalfunctionError.emoji = '💥'`), so a render
that reads the constructor holds them in lockstep by construction. a second table declared at a
render site is a table that can drift.

## ⚠️ .the boundary — glyph vs emoji are DIFFERENT AXES, never synonyms

this is the pair a reader is most likely to collapse, and the repo carries both on purpose:

| word | what it names |
|---|---|
| **emoji** | the CHARACTER CLASS — a unicode fact. `😶` is an emoji whether or not any language uses it |
| **glyph** | the ROLE a character plays in our language — the mark that carries one sense |

⇒ every glyph here happens to be an emoji, which is what makes them look interchangeable. they
are not: `rule.prefer.emoji-language` is named for the character class the language is built
from, and `asCliErrorGlyph` is named for the role its return value plays.

**so `emoji` is NOT forbidden** — it is a legitimate word for a different question. what is
forbidden is `emoji` used where the ROLE is meant, and `glyph` used where the character class is.

## ⚠️ .the two near-neighbors, and why each stays distinct

| word | its own concept | the direction |
|---|---|---|
| **glyph** | a mark WE print for a human to read | outbound, ours |
| **marker** | a shape an EMITTER prints, which we match to recognize a fault (`term=marker`) | inbound, theirs |
| **sigil** | an address prefix a human TYPES (`@:`) — see `define.address-sigils` | inbound, the human's |

⇒ all three are short tokens that carry a sense, which is exactly why the boundary is written
down. a `marker` is matched, a `sigil` is parsed, a `glyph` is rendered.

## .not a mascot

`mascot` is a **distinct concept**, never a synonym. a mascot flavors a *role*'s voice (`🐢`
mechanic, `🦉` bhrain, `🐈` ghlitch); a glyph denotes a *state* or a *domain*. keyrack roots on
the `🔐` glyph and carries **no** mascot — see `rule.require.keyrack-emoji-palette`.

## 🔴 .the owner — a glyph belongs to the RENDER, never to a message

within our own code exactly one layer prints a glyph:

| the layer | owns a glyph? |
|---|---|
| a **thrower** — `throw new XError(msg, meta)` | ❌ **no.** it supplies the class; the render reads the class and adds the mark |
| a **render** — `asCliErrorFrame`, `asCliErrorGlyph` | ✅ yes |
| a **direct writer** — a `process.stdout.write` treestruct | ✅ yes, it IS the render for its own output |

⚠️ a message that carries its own glyph renders **twice**
(`✋ BadRequestError: ✋ roles with…`) — measured 2026-09-04, at two throw sites.

⇒ the test is never *"is it a string literal?"* but **"does this path pass through
`asCliErrorFrame`?"** the full evidence is in the `.reason`.

## .the source of truth for an error's glyph

`helpful-errors` stamps a `static emoji` on each error class for this purpose, so
`asCliErrorGlyph` READS it rather than re-declares a local map. the field is theirs and spelled
`emoji`; the concept it serves is ours and spelled `glyph`.

## .on `emoji`

`emoji` names the *character set* a glyph is drawn from, never its role in a render. so it is
forbidden in our own contracts wherever the ROLE is meant, and allowed in the two places it is
correct: where the character class itself is the subject (*"the language is built from emoji"*),
and where a third-party contract owns the word — `helpful-errors` exposes its static as `.emoji`,
and we read it under that name because it is theirs.

## .refs
- `src/contract/cli/asCliErrorGlyph.ts`      # reads the class's own glyph
- `src/contract/cli/asCliErrorFrame.ts`      # the ONE render that prints an error's glyph
- `src/contract/cli/asCliExitStatusLine.ts`  # picks a glyph by exit-code VALUE, not by class
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts`  # reads glyph + class off the constructor
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`  # `💥` as the per-key malfunction leaf
- `.agent/repo=.this/role=any/briefs/choice.clone-glyph.md`  # one glyph's etymology (`😶`)
- `.agent/repo=.this/role=any/briefs/rule.prefer.emoji-language.md`  # the language
- `.agent/repo=.this/role=any/briefs/rule.require.keyrack-emoji-palette.md`  # the declared palette
- `.agent/repo=.this/role=any/briefs/rule.require.unabridged-error-prefix.md`  # the class half of the pair

## .reason
see the ref-level cluster beside this choice:
- `term=glyph._.choice.reason.md` — etymology, disputes, evidence, the emoji dispute, and why
  per-class and per-value glyph reads differ
