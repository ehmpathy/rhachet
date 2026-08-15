# domain.term: direction

term.chosen   = direction
term.kind     = noun            # a CloneMessage attribute: [...noun][state]?
term.synonyms.forbidden:
- dir
- side
- role
- sender
- origin
- way
- flow

## .what

the **direction** of a clone message names WHICH WAY one turn of a conversation went:

| value | means |
|-------|-------|
| `'in'` | an INBOUND turn — a dispatched `say`, or a human's own typed turn |
| `'out'` | an OUTBOUND turn — the clone's own reply |

it is the one field that makes `get` a two-sided **conversation** rather than a one-sided
assistant-only stream. `direction` is a **field a machine parses**, never a glyph it must scrape —
`--output json` carries `messages: CloneMessage[]`, so a cron/comms consumer branches on a value.
the human tree renders it as a glyph (`🎙️` in / `🎧` out), but the glyph is a display of the field,
never its source of truth.

⚠️ **`dir` is the forbidden synonym, and the reason is the whole point of this entry.** `dir`
already names **directory** throughout this domain — `cloneDir`, `actorDir`, `tempDir`,
`historyDir`, `getCloneDir`, `getActorEnrolledDir`. to reuse it for "direction" would put one word
on two unrelated senses, exactly the overload `rule.forbid.ambiguous-labels` and
`rule.require.ubiqlang` forbid. the four saved characters buy no clarity; the ambiguity costs every
future reader a re-read.

## .refs

where the term is declared / used:
- src/domain.operations/clone/socket/asCloneMessage.ts            (the `CloneMessage` type + the per-brain adapter that assigns it)
- src/domain.operations/clone/computeCloneMessages.ts             (tails LOGICAL messages, both directions)
- src/domain.operations/clone/getCloneOutput.ts                   (the multi-episode observe op)
- src/domain.operations/clone/cli/asCloneConversationText.ts      (the `🎙️`/`🎧` block render off the field)
- src/contract/cli/invokeCloneGet.ts                              (`--format blocks|raw`; json always structured)

## .reason

see the ref-level cluster beside this choice:
- `term=direction._.choice.reason.md` — etymology, why not `dir`, the overload that earned it
