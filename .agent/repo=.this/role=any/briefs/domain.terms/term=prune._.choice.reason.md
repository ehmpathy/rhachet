# domain.term.choice.reason: prune

## .etymology

`prune` is the gardener's word: cut away what has gone stale so the healthy growth continues. a repo
accrues DEAD clones (finished crons, closed headless enrolls) the way a shrub accrues dead wood, and
a daemon ages out of its bytecode the same way — the operation cuts only the dead away, never the
live ones. the horticultural sense also carries the **selective, safe** connotation the surface
guarantees: you prune with intent (a plan first), you do not raze.

it was chosen over the alternatives because each of those names the **wrong half** of the act:

| rejected | why it misleads |
|----------|-----------------|
| `restart` | promises a respawn this operation does not perform. `prune` only kills; the **next command** respawns, lazily. to name it `restart` would have a human wait for a process that arrives only when asked for |
| `reap` | names the collection of an already-dead process (unix `wait`); ours is alive and is killed. it is also already used INTERNALLY for the per-clone step (`delCloneSpawn` reaps one spawn), so to promote it would overload one word onto two grains — the whole-sweep op vs the single-clone step |
| `bounce` / `recycle` | ops jargon for a down-then-up cycle, which is again a respawn we do not do |
| `refresh` / `reload` | both suggest the process survives and re-reads. it does not survive |
| `cleanup` | vague; gives no hint of WHAT is removed or of the safety gate |
| `gc` / `vacuum` | machine jargon (garbage collection, db vacuum); the domain speaks of daemons and clones, not memory or pages (`rule.forbid.buzzwords` / `rule.require.ubiqlang`) |
| `sweep` | implies remove-all; prune is selective (only DEAD, only same-host, only past the age gate) |
| `purge` | implies aggressive/total removal with no safety — the exact opposite of the plan-by-default contract |

the gardener's sense fits every instance cleanly — the daemon **process**, an actor's DEAD
**clones**, and `pruneOrphanedRoleHooksFrom*Brain`'s stale **entries**. one sense, three scales:
**remove what has gone stale.**

## .why the three-way split matters most

`del` / `relock` / `prune` sit on a ladder, and each rung is a different layer of state:

```
vault entry   ← del      (persistent, on disk)
in-memory     ← relock   (the daemon's store)
the process   ← prune    (the bytecode itself)
```

the pair most easily confused is the bottom two, because **both feel like "clear the daemon"**. they
are not the same act, and the difference is invisible in the output — after either, a daemon answers
no ask:

- after `relock`: the process is alive, holds no keys, and still runs **the code it was born with**
- after `prune`: the process is gone; the next command spawns one from **the current dist**

## .the incident that earned this term

2026-08-10, `beav/feat-keyrack-unlock-scope`, in a manual dogfood of the `--reach` axis.

a daemon (`pid 2173788`) had been spawned from a dist that predated the reach axis, so its store was
keyed by **slug alone**. two reaches of one slug collided; last write won. the observed symptoms:

| probe | stale daemon | after `prune` |
|-------|-------------|---------------|
| `get --key T --reach a@x` | ⛔ `sk-B` — a **peer reach's** secret | ✅ `sk-A` |
| `get --key T --reach never-cut` | ⛔ a peer's secret, `"status": "granted"` | ✅ `absent 🫧` |
| `fill`, 3 declared reaches, 1 uncut | ⛔ all 4 `🟢 found vaulted` | ✅ 3 found, uncut → `set the key` |

that is **byte-for-byte the failure a genuine reach-blind defect would produce** — the
wrong-territory credential the whole reach design forbids. it was filed as a blocker. it was a
process on the box.

⚠️ **`relock` had already been run, and it did not help** — precisely because it empties the store
and leaves the code. the hour was spent on a hunt through five layers of correct source
(`daemonKeyStore.set`/`get`, `handleGetCommand`, `daemonAccessGet`, `invokeKeyrack`) for a defect
that was never there.

⚠️ **and the dop's own `.why` had said so all along**: *"restart daemon with current bytecode after
code changes"* (`pruneKeyrackDaemon.ts:7`). the answer sat one file away, unread. that is the same
shape as three other misses the same day — a prior record present and not consulted — and it is why
this reason file leads with the distinction rather than the etymology.

## .disputes

none open.

the near-dispute worth a record: `restart` was the intuitive first reach, because *"restart the
daemon"* is what a human says out loud. it was rejected on a **promise** ground rather than a taste
one — the operation performs no respawn, and a verb that promises one would have a human wait on a
process that arrives only with the next command. the CLI keeps the honest word
(`keyrack daemon prune`), and the help line *"kill daemon process so next command starts fresh"*
supplies the respawn context the verb deliberately omits.

## .evidence

**declarations, across three domains** — so the verb is repo-born vocabulary, not a one-off:

- `pruneKeyrackDaemon({ owner })` → `{ pruned: Array<{ owner, pid }> }`
- `pruneOrphanedRoleHooksFromAllBrains` / `pruneOrphanedRoleHooksFromOneBrain`
- `invokeClonePrune` / `getAllClonesPrunable` / `computeClonePruneDecision`

**invariants:**

1. a prune acts on the **target**, never on its contents. vault entries on disk are untouched.
2. a prune is **idempotent** — a prune of an absent daemon is a no-op that reports
   `no daemon active for owner=$X`, never an error; a clone prune re-run finds fewer DEAD clones and
   converges.
3. a prune performs **no respawn**. the next command spawns lazily, and its stdout says so
   (`[keyrack-daemon] spawned background daemon (pid: N)`).
4. `prune` accepts `@all` to sweep every daemon of the session; `relock` and `del` do not — their
   breadth axes are the key and the address, never the process.
5. a `relock` **never** refreshes bytecode. any claim that it does is false.
6. a clone prune composes the reach-state vocabulary: it acts only on a clone whose
   `computeCloneReachState` reads DEAD — never LIVE, never DEAF — so a slip cannot reap an active
   brain (the pit-of-success tie to `define.invariant.clone-prune-safety`).

**coverage:** the daemon lifecycle suites, the clone prune unit + integration + acceptance suites,
plus the manual repro recorded at
`rule.require.prune-the-daemon-before-you-trust-a-keyrack-read`.

**discovery (the clone instance):** the `rhx clone prune` surface + its `del*` lifecycle family,
declared in the `3.3.1.blueprint.product.yield.md` 2026-08-13 amendment (§B) and the `1.vision`
amendment (§B).

## .see also
- `term=unlock` — the `unlock` ↔ `relock` pair this term sits below
- `define.invariant.clone-prune-safety` — the clone-side safety invariant
- `rule.require.prune-the-daemon-before-you-trust-a-keyrack-read` — the rule this incident produced
- `howto.test-local-rhachet.md` — the twin trap one layer up: a stale **published** binary when the
  `link:.` self-link breaks. same class — the code read is not the code that ran
