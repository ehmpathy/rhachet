# domain.term: glyph

term.chosen   = glyph
term.kind     = noun
term.synonyms.forbidden:
- icon
- symbol
- badge
- mark

## .what

**one rendered character that carries a sense in this repo's surface language.** a glyph is a
word of that language, not a decoration: `✋` says *"yours to amend"* and `💥` says *"ours to
repair"*, so a reader who knows the language reads the verdict before the sentence.

the language itself is `rule.prefer.emoji-language`. this term names one word of it.

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

## .refs
- `src/contract/cli/asCliErrorGlyph.ts`      # reads the class's own glyph
- `src/contract/cli/asCliErrorFrame.ts`      # the ONE render that prints an error's glyph
- `src/contract/cli/asCliExitStatusLine.ts`  # picks a glyph by exit-code VALUE, not by class
- `.agent/repo=.this/role=any/briefs/choice.clone-glyph.md`  # one glyph's etymology (`😶`)
- `.agent/repo=.this/role=any/briefs/rule.prefer.emoji-language.md`  # the language

## .reason
see the ref-level cluster beside this choice:
- `term=glyph._.choice.reason.md` — etymology, the emoji dispute, why per-class and per-value differ
