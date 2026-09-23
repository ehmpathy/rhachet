# F26 — the plain-clone socket inheritance is FIXED with a clamp, over a dream deferred for an unobservable child env

**rework** clean · **status** OPEN · **confidence** 95%

## .the fork, stated fairly

`genBrainCliPlainClone` built its child env as `{ ...process.env, serial, depth }`. it overwrote the
child's serial and depth and did **not** touch `socket` — so a clone enrolled by another clone on the
socket-less path inherited `RHACHET_CLONE_SOCKET` from its parent: a path to a socket it does not own.

| the spawn branch | serial | depth | socket (before) |
|---|---|---|---|
| `genBrainCliPtyClone` | ✅ set | ✅ set | ✅ set |
| `genBrainCliPlainClone` | ✅ set | ✅ set | 🔴 inherited |

| option | cost |
|---|---|
| **A** — catch it as a dream; land no prod change this round | the trap stays loaded; the first reader added to `CLONE_ENV_KEYS.socket` gets a wrong answer with no signal |
| **B** — land the one-line fix (`[CLONE_ENV_KEYS.socket]: undefined`) now | a prod change at a buttonup gate, and `stdio: 'inherit'` appeared to make the child's env uncapturable by the test that spawned it |

## .taken, and why

🔴 **B — the fix landed, WITH a clamp.** the dirt that argued for A turned out to be surmountable, so
the deferral it justified was withdrawn.

- the fix: `genBrainCliPlainClone.ts:43` sets `[CLONE_ENV_KEYS.socket]: undefined`, so `spawn` omits
  the key and the child sits in the same state a non-clone shell is in — the state a future reader
  branches on correctly
- the clamp: `genCloneSpawn.integration.test.ts` `[case6]` — **the child reports its own env**, which
  is what dissolved the blocker. A's whole case rested on *"a child that echoed the var would write to
  the PARENT's stdout"* — true of stdout, and the child need not use stdout: it writes `{ socket }` to
  a temp report file the test then reads
- the clamp sets `process.env[CLONE_ENV_KEYS.socket]` to a sentinel **before** the spawn and restores
  it in `finally`, so the inheritance it guards against is real rather than hypothetical, and it
  asserts both `toBeNull()` and `not.toEqual(parentSocket)`

⇒ 🟡 **this reverses the call recorded here through 2026-09-17, and the reversal is the honest outcome**:
`rule.always.fix-forward-under-scouts-honor` grades SAFE and CLEAN, and CLEAN failed only for as long as
the clamp looked impossible. once the report-file capture was found, both halves passed and the fix was
owed in this round.

## .the clamp's verification state

✅ **written and well-formed**, with a DOGFOOD note that states exactly what to revert to redden it:
*"drop the `[CLONE_ENV_KEYS.socket]: undefined` line from `genBrainCliPlainClone` and this reddens."*

✅ **RUN, and its BITE OBSERVED — 2026-09-20.** the dogfood note's own revert was performed:

| take | result | 📄 the record |
|---|---|---|
| 🟢 green, as it stands | **9 passed, 0 failed** | `.log/…/what=integration/2026-09-20T20-06-59Z.stderr.log` |
| 🔴 red, `[CLONE_ENV_KEYS.socket]: undefined` dropped | **8 passed, 1 failed** — `[case6]`: `Received: "/tmp/parent-owns-this.sock"` | `.log/…/what=integration/2026-09-20T20-07-25Z.stderr.log` |
| 🟢 green again, line restored | **9 passed, 0 failed** | `.log/…/what=integration/2026-09-20T20-07-55Z.stderr.log` |

⇒ the red take reproduces the **exact** defect — the child inherits the parent's socket path verbatim. so
`rule.require.clamp-edge-cases`' *"prove the clamp bites"* step is **done, not owed**.

🔴 **this section once read *"unrun locally… the keyrack wrapper's `AWS_PROFILE` unlock walls it… terminus
cicd."*** that was true of a **cold** credential cache and false the moment one was live:
`rhx keyrack status --owner ehmpath` showed `ehmpathy.test.AWS_PROFILE` unlocked with 50m left, so the run
was a **driver** lever (`rule.always.spend-own-levers-before-escalation`), never cicd's to inherit.

🟡 the **wall itself is real and unchanged** — the tier reads no aws byte and this clamp spawns
`process.execPath -e`, so the unlock ahead of jest is still work the tier never uses. that remains
`.dream/2026_09_17.git-repo-test-unlocks-credentials-the-tier-never-uses.dream.md`. what was wrong was the
inference from *"a wall exists"* to *"no local path exists"* — a warm cache is a path straight through it.

## .rework, and why

**clean** — the fix is one line in one env block, and it breaks no caller: `child_process.spawn` omits
`undefined` values, so the key is ABSENT rather than the literal string `"undefined"`. the clamp is
additive. a wisher who prefers A reverts both in one diff.

## .confidence 98%, and why it is not higher

the call is settled by the code, and the clamp's bite is now **observed** rather than argued — so the
**unproven-bite** residual that held this at 95% is closed (see the verification state above).

🟡 the other residual, carried from the original entry: the INERTNESS claim. `CLONE_ENV_KEYS.socket`
was walked against `src/` on 2026-09-16 and had no ambient reader — a reader in another repo, or in a
shell procedure, would not appear in that walk. the fix is correct either way; the claim it was
*harmless today* is what the walk bounds.

## .where

- `src/domain.operations/clone/pty/genBrainCliPlainClone.ts:43` — the fix
- `src/domain.operations/clone/genCloneSpawn.integration.test.ts` `[case6]` — the clamp
- `src/domain.operations/clone/pty/genBrainCliPtyClone.ts:120` — the branch that always set it
- 🔴 **no dream is owed.** an earlier draft of this entry cited
  `.dream/2026_09_16.plain-clone-inherits-its-parents-socket-path.dream.md` and its route symlink as
  the artifact of option A. the fix superseded A, that dream was never written, and its route symlink
  dangled until this correction removed it

## .the demos that RENDER this call

NONE. every `case=N` demo reaches a socket-capable clone; the socket-less path carries no demo. a
verdict here changes no demo.

## .the verdict

unruled. the drive took B; the wisher may revert to A in one diff.
