# radio dispatch — queued

## route

- **via:** os.fileops
- **into:** @this
- **role:** driver
- **kind:** feature → ergonomic improvement to `rhx clone get`
- **status:** QUEUED
- **origin:** ehmpathy/rhachet `enroll-with-interface` dogfood session (2026-08-13)

## title

make `rhx clone get` render a directioned, block-separated conversation (in vs out)

## description

### the pain (lived, dogfooded)

while `say`/`get`-ing a live clone against itself, `get` output was hard to read: every logical
message rendered as bare assistant text with **no direction marker** (`←` inbound vs `→` outbound)
and **no visual break between turns**. a reader cannot tell a dispatched `say` from the clone's
reply, and cannot see where one turn ends and the next begins.

### the root cause (found in source)

the observe adapter drops half the conversation and flattens the rest:

- `src/domain.operations/clone/socket/asCloneOutputText.ts:37` — `if (record.type !== 'assistant')
  return ''` — every `type:'user'` record (the dispatched `say`s + human turns = the **inbound**
  half) is discarded. only assistant replies survive.
- the adapter returns a bare `string`, so `computeCloneReplyLines` → `getCloneOutput` → `invokeCloneGet`
  carry **no direction tag** and render `lines.join('\n')` with no per-turn block separation.

the transcript ALREADY contains both directions (`type:'user'` and `type:'assistant'` JSONL records) —
we are simply throwing the inbound half away.

### the ask

turn the observe stream from `string[]` into a directioned **message stream**, and render it legibly.

**1. the domain shape** — introduce a `CloneMessage`:

```ts
interface CloneMessage { dir: 'in' | 'out'; text: string }
// in  = a say / human turn  (transcript type:'user')
// out = a clone reply       (transcript type:'assistant')
```

**2. the adapter** (`asCloneOutputText.ts` → rename to `asCloneMessage.ts`, per
`rule.require.sync-filename-opname`) — return `CloneMessage | null`:
- `type:'assistant'` with text → `{ dir:'out', text }`
- `type:'user'` with text → `{ dir:'in', text }` (NEW — no longer dropped)
- a textless record (tool-use-only, tool-result) → `null` (still filtered)
- a corrupt COMPLETE line → still fail loud (`MalfunctionError`, unchanged)
- keep it the ONE per-brain transcript adapter (the `.why` note about a second brain = a second
  adapter still holds)

**3. the fold** (`computeCloneReplyLines.ts` → `computeCloneMessages.ts`) — return `CloneMessage[]`;
tail counts LOGICAL messages (both directions), preserving the map-then-tail order note.

**4. `getCloneOutput.ts`** — tail `CloneMessage[]` not `string[]`; the json body carries the
structured `messages: CloneMessage[]` (a machine reads `dir`, never scrapes a glyph). keep
`exidsUnreadable` / `exidsAmbiguous` / `total` / `truncated` exactly as-is.

**5. `invokeCloneGet.ts`** — render each message with a direction glyph + label header and a
blank-line block break between turns:

```
← say
   wrap up and commit what you have

→ reply
   on it — committing the WIP now 🐢
   done, pushed to the branch.
```

### the ONE design fork (flag for the ergonomist + council, do NOT silently pick)

`get`'s tree is documented as **"BARE text (pipe-clean) so a comms relay forwards it verbatim"**
(`invokeCloneGet.ts:39`). direction glyphs BREAK that contract. decide explicitly:

- **best-guess:** default tree = human-legible (glyphs + blocks); add `--format raw` = today's bare
  assistant-only stream for relays; **json always carries structured `{dir,text}[]`**.
- alt: keep tree bare, put direction only in json (rejected — the human complaint is the tree).

whichever wins, the relay usecase (wish: "comms… via observation of the clone's ipc") must keep a
verbatim-forwardable path. name the decision in the PR.

### glyph choice (ergonomist call)

the human asked for `←` / `→`. align with the extant `say` glyph (`📨 delivered`) if the ergonomist
prefers. keep it ASCII-safe + pipe-considered per `rule.require.treestruct-output` +
`rule.prefer.chill-nature-emojis`.

### acceptance (mandatory — no gaps)

- unit: `asCloneMessage` data-driven caselist — assistant→out, user→in, tool-result→null,
  corrupt→fail-loud.
- integration: `getCloneOutput` returns interleaved in/out messages in transcript order.
- acceptance (blackbox, real stub brain): `clone.acceptance` — enroll `--as @:driver`, `say poke
  <nonce>`, `get` shows a `← say` block with the nonce AND a `→ reply` block with `ack:<nonce>`;
  snapshot the directioned render (nonce masked). PAIR the snapshot with a functional assert
  (`rule.require.snapshots` — never snapshot-only).
- re-snap every extant `clone get` snapshot; assert exit codes unchanged.

### files

- `src/domain.operations/clone/socket/asCloneOutputText.ts` → `asCloneMessage.ts` (+ test)
- `src/domain.operations/clone/computeCloneReplyLines.ts` → `computeCloneMessages.ts` (+ test)
- `src/domain.operations/clone/getCloneOutput.ts` (+ integration test)
- `src/contract/cli/invokeCloneGet.ts` (+ acceptance re-snap)
- a `CloneMessage` type home (co-locate with `Clone.ts` domain object or the adapter — driver's call)

### out of scope

- per-turn timestamps (a later `--verbose`); the say-vs-live-keystroke interleave (council/playtest).
