# domain.term.choice.reason: prune

## .etymology

`prune` is the gardener's word: cut away what has gone stale so the healthy growth continues. it was
chosen over the mechanical alternatives because each of those names the **wrong half** of the act:

| rejected | why it misleads |
|----------|-----------------|
| `restart` | promises a respawn this operation does not perform. `prune` only kills; the **next command** respawns, lazily. to name it `restart` would have a human wait for a process that arrives only when asked for |
| `reap` | names the collection of an already-dead process (unix `wait`). ours is alive and is killed |
| `bounce` / `recycle` | ops jargon for a down-then-up cycle, which is again a respawn we do not do |
| `refresh` / `reload` | both suggest the process survives and re-reads. it does not survive |

the gardener's sense also carries the **brains** usage cleanly — `pruneOrphanedRoleHooksFrom*Brain`
cuts away stale entries, not a process. one sense, two scales: **remove what has gone stale.**

## .why the three-way split is the load-bearing part

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

**declarations, three, across two domains** — so the verb is repo-born vocabulary, not a one-off:

- `pruneKeyrackDaemon({ owner })` → `{ pruned: Array<{ owner, pid }> }`
- `pruneOrphanedRoleHooksFromAllBrains`
- `pruneOrphanedRoleHooksFromOneBrain`

**invariants:**

1. a prune acts on the **process**, never on its contents. vault entries on disk are untouched.
2. a prune is **idempotent** — a prune of an absent daemon is a no-op that reports
   `no daemon active for owner=$X`, never an error.
3. a prune performs **no respawn**. the next command spawns lazily, and its stdout says so
   (`[keyrack-daemon] spawned background daemon (pid: N)`).
4. `prune` accepts `@all` to sweep every daemon of the session; `relock` and `del` do not — their
   breadth axes are the key and the address, never the process.
5. a `relock` **never** refreshes bytecode. any claim that it does is false.

**coverage:** the daemon lifecycle suites, plus the manual repro recorded at
`rule.require.prune-the-daemon-before-you-trust-a-keyrack-read`.

## .see also
- `term=unlock` — the `unlock` ↔ `relock` pair this term sits below
- `rule.require.prune-the-daemon-before-you-trust-a-keyrack-read` — the rule this incident produced
- `howto.test-local-rhachet.md` — the twin trap one layer up: a stale **published** binary when the
  `link:.` self-link breaks. same class — the code read is not the code that ran
