# define.invariant.clone-directioned-observe

## .what

`rhx clone get` observes a clone's transcript as a **directioned conversation** — each turn a
`CloneMessage { direction: 'in' | 'out' }`, in transcript order: a dispatched `say` (or human turn)
is `in`, the clone's own reply is `out`. `direction` is a **field a machine parses**, never a glyph
it must scrape (named `direction`, not `dir` — `dir` already means "directory" throughout this
domain: `cloneDir`, `actorDir`, `tempDir`; rule.forbid.ambiguous-labels). the default render blocks
the turns with a direction glyph (`🎙️` in / `🎧` out); `--format raw` is the pipe-clean outbound-only
stream a comms relay forwards verbatim.

## .invariant

for every complete transcript record `get` distills, its direction is fixed by the record type:

```
record.type = 'assistant' ∧ has text   ⟹  CloneMessage { direction: 'out', text }
record.type = 'user'      ∧ has text   ⟹  CloneMessage { direction: 'in',  text }
textless (tool-use / tool-result / other type)  ⟹  null   (omitted from the stream)
```

order and completeness are preserved, and a broken line never lies:

```
messages are emitted in transcript (arrival) order, both directions interleaved
a CORRUPT complete line  ⟹  a loud fail (MalfunctionError), never a silent skip
a TORN last line (a partial write)  ⟹  held back (not-yet-a-record), never judged corrupt
--format raw  ⟹  only `out` turns, verbatim text, no direction glyphs (relay-forwardable)
--tail N      ⟹  the last N LOGICAL messages (both directions), never N raw jsonl lines
```

## .why

before this, `get` dropped the inbound half (every `type:'user'` record) and flattened the rest to
bare assistant text with no turn breaks — so a caller could not tell a `say` from a reply, and a
comms relay had no clean outbound-only stream. the directioned model fixes both:

- **a machine parses `direction` as a field** (`--output json` carries `messages: CloneMessage[]`), so a
  cron/comms consumer branches on a value, never a box-glyph — the same machine-consumption
  principle the whole talk surface follows.
- **a human sees a legible two-sided conversation** (`🎙️` in / `🎧` out blocks with a turn break),
  so the observe half is as legible as the dispatch half.
- **a comms relay gets `--format raw`** — only the clone's own words, verbatim, with no direction
  glyphs — the exact bytes it forwards to a chat, never a human-decorated tree it would have to
  strip.
- **honesty at the edges** — a textless record (a tool call, a tool result) is not a turn, so it is
  omitted, never rendered as an empty line; a corrupt *complete* line fails loud (`get` only hands
  complete lines to the adapter) so drift surfaces, never a swallowed record; a *torn* last line (a
  transcript mid-write) is held back as not-yet-a-record, so a partial write is never judged
  corrupt (`rule.forbid.failhide`).

one owner of the transcript shape (`asCloneMessage`) means a second brain-cli's transcript format
is a second adapter here, not a scatter of ad-hoc json across the observe path.

## .evidence

- **the per-brain adapter** — `src/domain.operations/clone/socket/asCloneMessage.ts`: assistant→
  `out`, user→`in`, textless→null, corrupt-complete→`MalfunctionError`.
- **the tail-by-logical-message** — `src/domain.operations/clone/computeCloneMessages.ts`: maps the
  complete lines through the adapter, drops the nulls, tails LOGICAL messages both directions.
- **the observe op** — `src/domain.operations/clone/getCloneOutput.ts`: multi-episode mtime merge,
  returns `{ messages, exidsUnreadable, exidsAmbiguous, total, truncated }`; a torn last line is held
  back (a completeness check), a corrupt complete record fails loud.
- **the render + the raw format** — `src/domain.operations/clone/cli/asCloneConversationText.ts`
  (the `🎙️` in / `🎧` out blocks) + `src/contract/cli/invokeCloneGet.ts` (`--format blocks|raw`,
  json always structured).
- **the clamps** —
  - `asCloneMessage.test.ts`: assistant→out, user→in, tool-result→null, corrupt→a loud fail
  - `computeCloneMessages.test.ts`: interleaved in/out in transcript order, tail by logical message
  - `asCloneConversationText.test.ts` (+ snapshot): the directioned block render
  - `getCloneOutput.integration.test.ts`: a real multi-record transcript → the directioned messages
  - `blackbox/cli/clone.acceptance.test.ts` (t12): the real binary renders a `🎙️` (in) block AND a
    `🎧` (out) block for one say+reply, and `--format raw` yields only the verbatim outbound reply
- **settled by** — the better-get requirement (vision amendment 2026-08-13): "turn the observe
  stream into a directioned message stream — `CloneMessage { dir; text }` … a `--format raw` keeps
  the verbatim-forwardable path the comms relay needs".

## .enforcement

- an observe path that drops the inbound (`type:'user'`) half = **blocker** (a one-sided conversation)
- a directioned render that scrapes a glyph instead of the `direction` field for `--output json` =
  **blocker**
- a corrupt COMPLETE transcript line silently skipped instead of a loud fail = **blocker**
  (`rule.forbid.failhide`)
- a `--tail N` that counts raw jsonl lines rather than logical messages = **blocker** (a tail of 1
  could return an empty tool-result line, never a whole reply)

## .see also

- `define.clone-reach-states.md` — `get` observes across LIVE / DEAF / DEAD (a transcript pull needs
  no live socket, so even a DEAD clone with a retained transcript is observable)
- `define.invariant.clone-say-delivery.md` — the dispatch half (`in` turns originate as `say`s)
- `src/domain.operations/clone/socket/asCloneMessage.ts` — the one owner of the transcript shape
