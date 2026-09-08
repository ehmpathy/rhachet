# domain.term.choice.reason: marker

## .etymology

a marker is a sign left BY a thing, read later to know it passed. that is exactly the relation
here: an emitter prints a shape, and we read that shape to name the fault.

the word carries the direction, which is the whole point. a `pattern` or a `matcher` names what WE
do; a `marker` names what the EMITTER left. that direction is the discipline below.

rejected:

| word | why not |
|---|---|
| `pattern` | names our regex, not the emitter's output. invites a loose one |
| `matcher` | same, and it is the verb's noun rather than the datum's |
| `signature` | already taken, twice — a registry `dist.signatures`, and a function signature |
| `token` | ⚠️ the FORBIDDEN sense outright. a token is a fragment; a marker is a whole printed shape. this synonym IS the defect (below) |
| `indicator` | vague; says naught about who produced it |

## .the rule the word encodes

> **a marker counts only in the shape its emitter actually prints, never as a loose token.**

one signal absolves; a fragment in isolation decides naught. so a marker is anchored to the
emitter's real text — `/Failed to load native module:/`, never `/\.node\b/`.

## .disputes

### dispute: token — raised 2026-09-02 — status: RESOLVED (keep `marker`)
- raised.by  = the loose-regex defect itself, three times over
- claim      = "token" is the shorter, more familiar word for a string we match on
- counter    = a `token` is a FRAGMENT, and that connotation is precisely what produced the
               defect. `/\.node\b/` is a legitimate token and an illegitimate marker: it
               matches any message that merely NAMES a `.node` path — a genuine bug in our own
               code among them — which would then be swallowed to `null` and read as "the
               addon is absent" (`rule.forbid.failhide`). the word that names a WHOLE PRINTED
               SHAPE makes the loose form read as wrong on sight; the word that names a
               fragment makes it read as normal.
- resolution = keep `marker`; record `token` as a forbidden synonym. the const is
               `PTY_ADDON_LOAD_MARKERS`, and `HOST_SPECIFIC_SHELL_TOKENS` is the deliberate
               EXCEPTION — see below.

### the one legitimate `token`, and why it is not a synonym

`HOST_SPECIFIC_SHELL_TOKENS` keeps the word `token`, and correctly: its members ARE fragments
(`readlink`, `$(`, `echo $`), matched to FORBID rather than to recognize. it is a denylist over
substrings, so a fragment is the right grain there.

so the two words name two different things, which is what makes them not synonyms:

| | marker | token |
|---|---|---|
| grain | a whole printed shape | a fragment |
| direction | recognize (what the emitter left) | forbid (what we must not write) |
| a false positive costs | a swallowed real bug | a rejected hint |

## .evidence

- **the defect, three instances.** `asNpmInstallFailureKind.ts` documents this class about itself
  twice, one row apart; `isPtyAddonLoadError` was the third, in a different directory a sweep
  bounded to `upgrade/` could not see. the term exists so the class has a name to be swept by.
- **the near-miss that proves the anchor rule.** the obvious cure was to DELETE `.node\b` as dead
  weight. node-pty's own `lib/utils.js` throws `Failed to load native module: pty.node, checked:
  …` — a plain `Error` with **no `.code`** — so that alternative was the ONE that caught the
  field-observed linux failure. to delete it would have reopened the defect this whole behavior
  exists to cure. the cure was to ANCHOR it to the emitter's real text, not to drop it.
- **clamped.** `getPtyModuleOrNull.integration.test.ts` carries one case per emitter, plus
  `[case8]`: a real `TypeError` whose message merely names a `.node` path, which MUST re-throw.
  under the old loose form `[case8]` reddens with `NoErrorThrownError` — the swallowed bug made
  visible.

## .invariants

- a marker is anchored to a shape its emitter is KNOWN to print (cite the emitter)
- a marker that would match a message from any other source is not a marker; it is a token
- a marker list is matched with `.some(...)` — one signal absolves
