# F72 — must the 1password `keyrack set` refusal adopt the peer refusal shape in this PR?

- **raised** = 2026-10-06, at `5.3.verification`, `review.peer i001` — `ergo-snapshot-visual-blemishes` nitpick.2
- **rework** = dirty
- **status** = OPEN — **no**; keyrack is not this behavior's subject
- **confidence** = **90%**

## .the fork, stated fairly

the 1password `keyrack set` refusal nests `exid:` and `ran:` beneath the error, where the skills this
branch adds (`calc.tokens`, `get.package.format`, `install.age`) put `ran:` first, then the error,
then the remedy.

| | **leave the keyrack render as `main` ships it** (taken) | **align it now** |
|---|---|---|
| whose render | `vaultAdapter1Password`, untouched by this branch's prod diff | — |
| what moves | naught | a keyrack renderer, every keyrack refusal that shares it, and their snapshots |

## .the call, and why

the reviewer's own text names the cause: *"the bytes are inherited from the legacy
`vaultAdapter1Password` renderer."* this branch did not change that renderer. the snapshot exists
because this branch's acceptance pass needed the suite green, which pinned bytes `main` already
emits.

the wisher has ruled keyrack out of this behavior twice — the real-`op` lanes (`F49`), and keyrack as
a whole. this is the fourth instance of the class `F44`, `F45`, `F49` record: **a defect this branch
did not introduce is not this branch's to close.**

## .why the confidence is 90%

the divergence is real. the open question is only whose PR repairs it.

## .rework

dirty — a keyrack render change ripples into every refusal the adapter emits, and into a subsystem
this wish does not own.
