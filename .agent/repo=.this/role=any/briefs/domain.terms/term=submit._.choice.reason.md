# domain.term.choice.reason: submit

## .etymology
why `submit`: a brain-cli TUI has an input buffer a human types into, then presses Enter to
**submit** it as a turn. `submit` is the exact word the interaction already uses — the message
is submitted from the buffer to the brain. chosen over `send` (overloaded with socket/network
delivery — that is `say`'s job), `enter` (names the keystroke, not the effect), `commit`
(overloaded with git), and `post` (http jargon).

the domain has a three-stage message lifecycle, one canonical verb each:
- **say**    — dispatch bytes onto the clone's socket (the `say` CLI verb, `sayClone`)
- **submit** — the brain lifts those bytes off its input buffer as a user turn (this term)
- **get**    — read the brain's reply back from its transcript (the `get` CLI verb)

`say` and `submit` are NOT synonyms: `say` returns once bytes are `delivered` to the socket;
`submit` is a later, separate event the brain performs. the whole point of this term is to keep
them distinct, because a merge of the two is precisely the defect below.

## .disputes
none. `submit` was adopted directly from the brain-cli's own interaction vocabulary; no synonym
was seriously contended.

## .evidence
- the dogfood defect (2026-08-12): `rhx clone say @:<serial> --what "tell me a joke"` acked
  exit-0 `delivered`, yet the real claude wrote NO transcript turn — the message was `delivered`
  to the socket but never `submit`ted. root cause: the dispatch frame bundled the submit `\r`
  into the same pty write as the bracketed-paste close, so the TUI committed the paste and
  submitted an EMPTY line. fix: bulk-write the whole message content, wait a length-scaled
  `computeCloneSubmitDelay({ messageLength })` (long enough for a large paste to commit), then write
  `\r` as a SEPARATE pty read (`genCloneSocketServer`), so the submit lands in its own read.
- the self-verify: `invokeCloneSay` now proves the submit — it baselines `getCloneSubmittedCount`
  (occurrences of the message in the brain's own transcript), dispatches, then
  `getCloneSubmitLanded` polls until the count rises. the brain records each user turn to its
  transcript ON submit (before the slow reply), so a risen count is deterministic proof the
  message left the input buffer. a submit that never lands fails LOUD (`MalfunctionError`), never
  a false `delivered`.
- related state word: **landed** — the verified-submitted outcome (`getCloneSubmitLanded`
  returns whether the submit landed). it is the adjective form of a confirmed `submit`, not a
  distinct term.
