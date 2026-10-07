# F71 — must an actor row carry a change marker when its hooks did not change?

- **raised** = 2026-10-06, at `5.3.verification`, `review.peer i001` — `ergo-snapshot-visual-blemishes` nitpick.3
- **rework** = clean
- **status** = OPEN — **no**; a bare hash is the no-op row, and the shape is unchanged
- **confidence** = **88%**

## .the fork, stated fairly

the brain-dir-boot journey snapshot moved from `6fdfcc44: +1` to `6fdfcc44`. the reviewer reads that as
a lost marker and asks for one on every actor row.

| | **bare hash on a no-op** (taken) | **a marker on every row** |
|---|---|---|
| what it says | this run wrote naught to that actor | a marker such as `±0` on a row that changed naught |
| peer convention | the brain rows omit a no-op apply outright; `✨ hooks: no changes needed` | no row in the repo renders a zero marker |

## .the call, and why

the marker was not removed. the render is one line, `syncHooksForLinkedRoles.ts:283`:

```ts
console.log(`   ${prefix} ${actor.hash}${changes ? `: ${changes}` : ''}`);
```

— the same `: +N, ~N, -N` suffix as `main`, printed exactly when the actor's hooks changed.

what changed is **what the actor receives**. `main` wrote every linked role's hooks into every actor;
this branch narrows each actor to its OWN roleset (`rolesForActor`, line 236), because an actor
enrolled `-driver` must never carry the driver's Stop hook. the journey's actors enroll the native
roles `shaper` / `glasser` / `sander`, and the only role with hooks is the package role `waxer`, so
each actor now receives zero hooks — a no-op, rendered bare.

⇒ the old `+1` was the **defect**: a foreign hook written into an actor that never enrolled its role.

## .why the confidence is 88%

a reader may still prefer an explicit word on a no-op row (`unchanged`). that is a render taste, and
it would diverge from the brain rows, which omit a no-op entirely.

## .rework

clean — one suffix in one `console.log`.
