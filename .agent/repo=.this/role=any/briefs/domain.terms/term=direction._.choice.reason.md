# domain.term.choice.reason: direction

## .etymology

`direction` is the plain english word for which way a turn travels. a conversation has two
directions — toward the clone and away from it — so the word maps onto the domain with no gloss: a
`say` goes IN, a reply comes OUT. it was preferred over every alternative because each of those
names an attribute OTHER than the way the turn traveled:

| rejected | why it misleads |
|----------|-----------------|
| `dir` | **the decisive rejection** — `dir` already means "directory" everywhere in this domain (`cloneDir`, `actorDir`, `tempDir`, `historyDir`). one word, two unrelated senses, is the exact overload `rule.forbid.ambiguous-labels` forbids |
| `side` | names a POSITION (which end of the wire), not the way a turn traveled. a reader must then ask "whose side?" |
| `role` | catastrophically overloaded — `role` is a first-class rhachet concept (`.agent/repo=*/role=*`, `--roles`, the roleset an actor hash derives from). it would collide with the framework's own headline noun |
| `sender` / `origin` | name the AUTHOR of a turn, a different attribute; they also invite a value like `'human'`/`'clone'`, which the two-valued in/out model deliberately does not carry |
| `way` / `flow` | vague; `flow` is buzzword-adjacent (`rule.forbid.buzzwords`) and names a stream rather than one turn |

## .why the `dir` rejection is the point of this entry

the shorter form was in the shipped code first. the wisher caught it on a real `--output json`
read (2026-08-15):

> "why does this say dir instead of direction? `"dir": "in",`"

and, on the case for the rename: **"duh"**.

the abbreviation saved four characters and cost one word its single sense. within the SAME domain a
reader meets `cloneDir`, `actorDir`, `tempDir`, `historyDir` — every one a filesystem path — and
then meets `dir: 'in'`, which is not a path at all. the reader stops. that stop is the whole cost
`rule.require.ubiqlang` exists to prevent, and it repeats on every future read, forever, for four
characters saved once.

the shape of the mistake is worth a record, because it recurs: an abbreviation is cheap to type and
expensive to read, and it is cheapest to type at exactly the moment the author holds the most
context — so the author never feels the cost they impose on everyone after.

## .disputes

none open.

the near-dispute worth a record: `dir` had the weak claim of brevity in a field a machine reads
often. it was rejected on an **overload** ground rather than a taste one — brevity is a real good,
but never at the price of a second sense for a word the domain already spent. had `dir` not
already meant "directory" here, the short form would have been defensible.

## .evidence

**declaration** — the `CloneMessage` contract, one owner of the transcript shape:

```ts
export interface CloneMessage {
  direction: 'in' | 'out';
  text: string;
  at: string | null;
}
```

**invariants:**

1. direction is fixed by the transcript record type, never guessed:
   `assistant` + text ⟹ `'out'`; `user` + text ⟹ `'in'`; textless ⟹ omitted (not a turn).
2. direction is a **field**, never a glyph. `--output json` carries it verbatim; the `🎙️`/`🎧`
   render is a display OF the field. a consumer that scrapes the glyph instead of the field is a
   blocker (`define.invariant.clone-directioned-observe`).
3. both directions are emitted in transcript (arrival) order, interleaved — a `--tail N` counts
   LOGICAL messages across both directions, never raw jsonl lines.
4. `--format raw` filters to `direction === 'out'` only — the verbatim outbound stream a comms
   relay forwards, with no direction glyphs to strip.

**coverage:** `asCloneMessage.test` (assistant→out, user→in, textless→null, corrupt→loud fail);
`computeCloneMessages.test` (interleaved order, tail by logical message);
`asCloneConversationText.test` + snapshot (the directioned block render);
`getCloneOutput.integration.test` (a real multi-record transcript);
`blackbox/cli/clone.acceptance` (the real binary renders both an in and an out block).

## .see also
- `define.invariant.clone-directioned-observe` — the invariant this term is the subject of
- `rule.forbid.ambiguous-labels` (ergonomist) — one label, one sense
- `rule.require.ubiqlang` (mechanic) — one canonical word per concept
- `rule.prefer.emoji-language` — the `🎙️`/`🎧` verb-artifact pair that RENDERS this field
