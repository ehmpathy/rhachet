# domain.term: sentence

term.chosen   = sentence
term.kind     = noun
term.boundary = cli
term.synonyms.forbidden:
- summary
- headline
- title
- blurb

term.synonyms.disputed:            # ⚠️ LIVE in this repo today — see `.reason`
- message                          # `Error.message` — the RAW string, metadata serialized into it

term.siblings:                     # the other parts of what a human reads — peers, never synonyms
- fix                              # beat 3, the next move. carried as `hint` metadata (its own dispute)
- why                              # beat 2, the cause. rendered `why:`; carried as `note` metadata
- cli.frame                        # the whole render the sentence is beat 1 OF

## .what

**beat 1 of a report — the line that names WHAT broke, and no more than that.**

it is the error's message with its metadata redacted: `error.redact(['metadata']).message`. it
carries no fix and no cause, because those are beats 3 and 2 and each has its own field.

## ⚠️ .what a sentence is NOT

| not this | because |
|---|---|
| `Error.message` raw | a `HelpfulError` **serializes its metadata into that string**, so a raw read matches the hint too |
| the first line (`message.split('\n')[0]`) | a coincidence of layout, never a definition |
| the composed human line (sentence + fix) | that is a `cli.frame` row, never the sentence. ⚠️ this is the live ambiguity |

🚨 the second row is why the term is load-bearing rather than tidy: an assertion on the raw
`.message` **cannot fail**, so a clamp written against it is a decoration.

## .refs

declared (test fixtures — ⚠️ two of them name OPPOSITE senses; see `.reason`):
- src/domain.operations/upgrade/execNpmInstallGlobal.test.ts        # `asFailureSentence` — beat 1 alone ✅
- src/domain.operations/upgrade/asNpmInstallFailureError.test.ts    # `asSentence` — beats 1+3 composed ⚠️
- src/domain.operations/keyrack/reach/assertKeyrackReachRequiresKey.test.ts  # `asSentence` — first line
- src/domain.operations/keyrack/assertKeyrackExportNamesDistinct.test.ts     # `asSentence` — first line

the production contracts that state the split in prose:
- src/domain.operations/upgrade/asNpmInstallFailureError.ts  # *"the sentence names WHAT broke; the hint names WHAT TO DO"*
- src/domain.operations/upgrade/execUpgrade.ts               # `asUpgradeFailureMessage` composes the two by name
- src/contract/cli/asCliErrorFrame.ts                        # renders the sentence, then the fix on its own row

the canon that names the three beats:
- .agent/repo=ehmpathy/role=ergonomist/briefs/fundamentals/rule.require.errors-name-the-fix.md

## .reason
- `term=cli.sentence._.choice.reason.md` — etymology, the four-derivation census, the open dispute
