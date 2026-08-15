# domain.term.choice.reason: wedged

## .etymology

`wedged` comes from the sense of a thing jammed IN PLACE — driven into a gap so it can
neither advance nor fall back. it names the clone fault precisely: the dispatch **socket**
is connected (not fallen back to DEAD), yet the message never advances to `delivered` (not
progressed to LIVE). the clone is lodged between the two clean states — exactly a wedge.

chosen over the vaguer synonyms, each of which blurs the specific fault:

- **stuck / jammed** — generic; reveal no detail about WHERE (the socket connects, the ack
  does not come). `wedged` is the established reach-cause literal the code already carries
  (`cause: 'wedged'`), so the term matches the contract.
- **hung / frozen** — imply the whole PROCESS is dead or unresponsive; a wedged clone's
  process may be perfectly alive and busy (a healthy brain mid-reply also delays its ack —
  which is why the timeout is length-scaled, so a busy-but-healthy send is not misjudged
  wedged). the fault is about the ACK, not the process's vital signs.
- **stalled / unresponsive** — describe a symptom, not the specific socket-accepts-but-
  never-acks shape; and `unresponsive` overloads with the human-facing sense of a slow ui.

## .the dead-vs-wedged split

the reason `wedged` earns its own word rather than folding into `dead`:

| state | socket | ack | fix |
|-------|--------|-----|-----|
| LIVE   | connects | `queued` → `delivered` | — |
| DEAD   | refused / absent | none (never connects) | re-enroll to spawn a fresh clone |
| WEDGED | connects | never arrives | the brain is jammed; a different remedy |

a DEAD clone and a WEDGED clone present differently at the socket (refused vs connected-
but-silent) and demand different remedies, so `computeCloneUnreachableHint` names them
apart with distinct causes + hints. to collapse them into one word would overload it onto
two distinct faults (the ambiguity-from-overload the ubiqlang rules forbid).

## .evidence

- the reach-cause set is enumerated in `computeCloneUnreachableHint` (the hint selector)
  and consumed by `sayClone` (`reachCause: 'wedged'`) and `asCliErrorJson` (the machine
  `reachState` field) — one owner, many readers, all speaking the one word.
- the length-scaled `computeCloneWedgedTimeout` exists precisely BECAUSE a healthy long
  send must NOT be misjudged wedged: the timeout scales with the message length so only a
  genuinely jammed clone (one that never acks) trips it (dogfood 2026-08-13: a 3700-char
  message delivers at 31.2s under the scaled window, where a fixed 30s window would have
  false-reported it wedged).
