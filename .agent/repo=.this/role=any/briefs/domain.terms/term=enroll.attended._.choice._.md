# domain.term: enroll.attended

term.chosen   = attended
term.kind     = adj
term.boundary = enroll
term.status   = SUPERSEDED — see `term=enroll.mode`
term.synonyms.forbidden:
- interactive
- manned
- watched
- supervised
- live

## 🔴 .superseded — the term is RETIRED, and its argument is not

`attended` no longer appears in any contract. the axis it fed split in two, and neither half wants
a per-caller attendance read:

| the question it used to answer | what answers it now |
|---|---|
| *may this clone be REACHED?* | nobody — every clone gets a socket. attendance was removed from the
  cube outright, because a caller cannot know who will reach the clone LATER
  (`isCloneSocketEligible`) |
| *what does the ENROLLER do with the child?* | `term=enroll.mode` — `watch` \| `async` \| `await`,
  derived from the tty plus the print flag (`computeCloneEnrollMode`) |

🟡 **the record below is kept because the ARGUMENT outlives the term.** the reason `interactive`
was wrong — a property of a *terminal* used as a stand-in for a property of a *conversation* — is
the same defect that then recurred one surface over, in the mode derivation. a reader who has only
the conclusion *"attended was removed"* will re-derive the tty read and break it again.

⇒ its successor's `.reason` carries the recurrence: `term=enroll.mode._.choice.reason.md`.

⚠️ **`interactive` is the word this term REPLACES, and it is forbidden precisely because it reads
right.** `interactive` names a property of a *terminal* — is there a tty on the other end — and the
enroll used it as a stand-in for a property of a *conversation*. the two agreed for as long as only
humans enrolled clones, and parted the moment a clone did.

⚠️ **`attached` is a DISTINCT term, never a synonym.** attached describes a stream wired to a sink
(the screen feed attaches to the pty's output). attended describes whether anyone is on the far end
to speak.

## .what

**someone will hold a conversation with this clone.** the enroll asks it to decide whether the
clone gets a socket — the channel `clone say` and `clone get` reach it through.

it is TRUE when either holds:

| the caller is… | attended? | why |
|---|---|---|
| a human at a tty | ✅ | they will type at it |
| **a clone** (its own `serial` is in env) | ✅ | it will dispatch through the socket |
| a CI job, a pipe, a cron | ❌ | no one is on the far end; a socket would idle |

## 🚨 .the boundary — attended is NOT "a human is here"

this is the whole reason the term exists, and the defect it was coined to name:

```
isCloneEnrollAttended  asks  "will anyone hold a conversation?"
process.stdout.isTTY   asks  "is a human here?"
```

the enroll read the second and called it the first. a clone invokes `rhx enroll` through a pipe, so
`isTTY` is false → `interactive: false` → `isCloneSocketEligible: false` → **no socket**, and
`clone say` against that peer is impossible. ⇒ a clone could stand up a peer it could never speak to.

⇒ the tty is one *sufficient* condition for attendance, never the *definition* of it.

## ⚠️ .the boundary — attended does not mean UNBOUNDED

attendance says a socket is warranted. it says naught about how many hops of clone may enroll clone
— that is `term=enroll.depth`, a separate budget, and the two are checked independently. an enroll
can be attended and still refused for depth.

## .refs

🟡 the predicate this term named — `isCloneEnrollAttended.ts` — was DELETED, so no ref points at
it. what remains are the surfaces that record its removal:

- `src/domain.operations/clone/pty/isCloneSocketEligible.ts`      # `.why` — both the tty read and
  the widened `attended` read were wrong; the axis is gone from the cube
- `src/domain.operations/clone/pty/isCloneSocketEligible.test.ts` # the `[clamp]` that asserts a
  stray `attended: false` moves no verdict
- `src/domain.operations/clone/pty/computeCloneEnrollMode.ts`     # the successor axis
- `src/utils/cloneEnvKeys.ts`                                    # `serial` — the key `byClone` read

## .reason
see the ref-level cluster beside this choice:
- `term=enroll.attended._.choice.reason.md` — etymology, the measured defect, the rejected peers
