# rule.require.prune-the-daemon-before-you-trust-a-keyrack-read

## .what

the keyrack daemon is a **long-lived process**. it does not reload when you rebuild. so before
you test any keyrack read against a local change — and before you file a defect against one —
kill it:

```bash
npx rhx keyrack daemon prune --owner $OWNER    # ← then the next command respawns it from your dist
```

⚠️ **`keyrack relock` is NOT this.** relock empties the store *inside* the live process; the
process itself — and its compiled-in logic — survives. only `daemon prune` replaces the code.

## .why

a stale daemon **serves wrong answers from correct-looking code**. every layer you read in `src/`
is right, and the behavior is still wrong, because the bytes that answered were compiled weeks ago.

lived case (2026-08-10), on `beav/feat-keyrack-unlock-scope`, as the `--reach` axis was probed:

| probe | stale daemon (pid 2173788) | after `daemon prune` |
|-------|---------------------------|----------------------|
| `get --key T --reach a@x` | ⛔ `sk-B` — **a peer reach's secret** | ✅ `sk-A` |
| `get --key T --reach never-cut` | ⛔ returned a peer's secret, `"status": "granted"` | ✅ `absent 🫧` + the `set` fix |
| `fill` w/ 3 declared reaches, 1 uncut | ⛔ all 4 `🟢 found vaulted` | ✅ 3 found, uncut one → `set the key` |

the stale daemon's store was keyed by **slug alone** (it predated the reach axis), so two reaches
of one slug collided and last-write-won. that is **byte-for-byte the failure mode a genuine
reach-blind defect would produce** — the wrong-territory credential the whole design forbids.

**i filed it as a blocker. it was a process on the box.** that hour is what this rule buys back.

## .the tell — a contradiction that has exactly one shape

> **every layer of the code reads correct, and the behavior is still wrong.**

when you have traced a value through every seam and each one is right, stop. do not hunt harder
for a bug in code you have already proven correct. ask instead: **is the live process the code
i am reading?**

in the lived case i had read and confirmed, in order:

- `daemonKeyStore.set` — address-keyed via `asKeyrackKeySlugAtReach` ✓
- `daemonKeyStore.get` — address-keyed via `getAllKeyrackProbeAddresses` ✓
- `handleGetCommand` — threads `reach` ✓
- `daemonAccessGet` — threads `reach` ✓
- `invokeKeyrack.ts` — threads `reach` ✓

five correct layers and one wrong answer. that contradiction was the evidence, and i reasoned past
it in search of a sixth layer to blame.

⚠️ a **second tell**, which is cheaper to spot: a read path is wrong while a write path is right.
`unlock` (manifest + vault, all in-process) was correct the whole time; only `get` and `fill`
(daemon round-trip) were wrong. **the seam between them is the process boundary.**

## .how — the dogfood preamble

any manual test of a keyrack read against local changes opens with these three:

```bash
npm run build                                  # bin/run.jit loads dist/, not src/
npx rhx keyrack daemon prune --owner $OWNER    # kill the stale process
npx rhx keyrack status --owner $OWNER          # expect: "daemon: not found"
```

only then do the probes mean what they appear to mean.

## .why the tests never catch it

the blackbox acceptance suites are hermetic — each spawns its own daemon against its own socket in
a temp `HOME`, so they can never meet a stale one. that is correct for a test suite and it is
exactly why **this hazard belongs to manual dogfood alone**. a green suite is no evidence at all
about the daemon on your machine.

## .enforcement

- a keyrack defect reported from a manual read, with no `daemon prune` in the repro = **blocker**
  (the report is unfounded until the process is known)
- a manual dogfood of a keyrack read path that omits the prune = **nitpick**
- a claim that `relock` refreshed the daemon's code = **blocker** (it empties the store; the
  process and its logic live on)

## .see also

- `howto.test-local-rhachet.md` — the twin trap one layer up: `npx rhx` runs a stale
  **published** binary when the `link:.` self-link is broken. same class of failure — the code you
  read is not the code that ran — at a different boundary
- `rule.require.trust-but-verify` (mechanic) — verify inherited claims before you act on them; here
  the inherited claim was my own, that the process matched the source
- `rule.forbid.blanket-resnap-after-rebase` — the other place a wrong answer and a right one are
  visually indistinguishable, so the classification must come before the action
