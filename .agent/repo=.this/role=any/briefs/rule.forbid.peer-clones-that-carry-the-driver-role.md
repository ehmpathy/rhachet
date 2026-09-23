# rule.forbid.peer-clones-that-carry-the-driver-role

> **a peer clone is enrolled with `--roles -driver`. always. a peer that carries the driver role
> boots your route and drives it — in your worktree, over your files.**

```sh
👍  npx rhx enroll claude --as @:peer1 --roles -driver --async
👎  npx rhx enroll claude --as @:peer1 --async
```

## .why — the clone inherits your cwd, so it inherits your route

a clone is a real brain-cli process in **your** worktree. its `SessionStart` hooks are your
worktree's hooks, so a driver-enrolled peer boots the same route bind you hold and reads the same
stone. it has no way to know the stone is not addressed to it.

- ⇒ it drives. it edits the files you are mid-edit on, with no lock and no announcement
- and the damage is **invisible at spawn** — `enroll` reports `baked`, `say` reports `released`, and
  the peer answers correctly. the edits land in the background

🔴 **measured 2026-09-18.** `@:wedge1`, enrolled with default roles, answered `reply with exactly:
PONG` correctly — and 2m46s later its own transcript holds an `Edit` tool call that rewrites a
docblock in `computeCloneInputState.ts`, a file its enroller held open. it then parked on a
permission prompt and went deaf to `say` (`withheld` / `modal-holds-focus`).

`@:nodrive1`, enrolled `--roles -driver`, replied `PONG` and took no further act.

| when… | then… |
|---|---|
| you enroll a peer to **ask it a question** | 🔴 the strongest cue. `--roles -driver`, every time |
| you enroll a peer for a **second opinion** | it must read and answer, never act. drop driver |
| a peer answers correctly and you call it healthy | the answer proves naught about what it does next. read its transcript |
| you enroll from **inside a bound route** | your bind is the peer's bind. it is the hazard, not a coincidence |
| a peer goes deaf mid-session (`modal-holds-focus`) | it hit a permission prompt of its own. it was acting |
| you see edits you do not recall making | check `clone list` for a LIVE peer before you check `git log` |
| you would enroll a peer **to** drive a route | that is a different contract, and it needs its own worktree |

## .the test

> **would this peer's route bind be MINE?**

yes → drop driver · no, it has its own worktree → then it may carry it.

## 🟡 .the mechanism already exists — the gap was the rule

`--roles -driver` is supported on `enroll`, in both the space and comma forms, and the null-byte
sentinel that once broke it is cured (`rule.require.roles-flag-dual-format`). so this is no feature
ask: the flag works, and an enroller who does not reach for it gets a peer that drives.

## 🟡 .the bound — a peer with its OWN worktree may carry driver

the defect is a **shared** worktree, never the driver role itself. a peer enrolled in its own
worktree, on its own branch, with its own route bind, is a legitimate second driver — the whole
point of a clone graph. what this forbids is a peer that inherits YOUR bind and acts on it.

blocker: a peer clone enrolled into the enroller's own worktree with the driver role live · a peer
declared healthy on the strength of its reply alone, with no read of what it did next.
false positive: a peer enrolled into its own worktree with its own route bind · a peer enrolled
expressly to drive, where the enroller holds no bind.

⇒ see also: `rule.require.roles-flag-dual-format` (the flag this rule reaches for) ·
`define.actor-clone-hierarchy` ·
`define.invariant.clone-say-to-self-is-await-clamped-never-refused` ·
`.dream/2026_09_17.a-peer-clone-inherits-its-enrollers-route-bind.dream.md` (the caught dream this
rule closes).
