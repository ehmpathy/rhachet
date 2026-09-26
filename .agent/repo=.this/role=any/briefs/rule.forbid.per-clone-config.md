# rule.forbid.per-clone-config

> **an ACTOR owns its config. a CLONE references it. never copy an actor's config into a clone,
> and never place a new artifact under `clones/` that derives from `{ brain, roles }`.**

the sync invariant is the law this enforces: *"all clones of an actor share the actor's config by
reference, not by copy. when the actor changes, every clone inherits it — new clones at spawn, live
clones on their next settings read."*

## .why — the copy breaks the one property the model exists to give

| the harm | how it lands |
|---|---|
| **an actor change stops to propagate** | the actor's roleset is edited; the clone reads its own stale copy and never learns |
| **N clones become N truths** | two clones of one actor answer differently, and both look correct from the inside |
| **the drift is silent** | a stale copy renders, boots, and passes every test. only the behavior differs |

⇒ a per-clone copy does not merely duplicate a file. it forks an identity the whole model is built
to keep single.

## .the test — before you place a new artifact

> **"does this derive from `{ brain, roles }`, or from THIS RUN?"**

- from `{ brain, roles }` → **the actor dir.** one file, shared, rewritten as the actor evolves
- from this run — a session id, a transcript, a socket → **the clone dir**
- you cannot name which → read `define.actor-clone-hierarchy` before you place it

| when… | then… |
|---|---|
| you would render a corpus, a prompt, or a settings file **per clone** | it derives from the roleset, so it is the actor's |
| you think *"one path cannot serve two clones"* | it can, and it must. two clones of one actor need the IDENTICAL content |
| you would key an artifact by a **session** id | ask what it derives from. a session id keys a transcript, never a config |
| you would freeze a snapshot of an actor's config into a clone | that is the copy, under a kinder word |
| you would place liveness or reach state in a clone file | liveness needs no store — the socket IS the state |
| your design says a roleset change always yields **a new path** | true for a **hash** actor, false for a **slug** or **derived** one |
| you would add a field to `identity.json` | it holds durable identity ONLY — a serial and a slug |
| you would **name** an operation or field a clone's `config dir` | 🔴 the term asserts this very grain — `rule.forbid.clone-config-misnomer` |

## .a role change is a new actor in one form and the same actor in two

| form | add a role |
|---|---|
| **hash** — `rhx enroll` | a new hash ⇒ **a DIFFERENT actor.** the old one is untouched, correctly |
| **slug** — `actors.yml`, `rhx clone` | identity stable. the roleset is edited and the config is **rewritten in place** |
| **derived** — base ⊕ delta | the base changes ⇒ effective roles change, **re-derived at spawn** |

⇒ the slug and derived forms are where an actor *evolves*, and they are the forms a per-clone copy
breaks. a design checked only against the hash form looks correct and fails on the other two.

## .the worked case — the rendered brief corpus

the rendered brief corpus (`boot.md`) derives from `{ brain, roles }`, so it lives in the actor's
brain dir: **one `boot.md` per actor, rewritten as the actor evolves, never one per session.** all
clones of the actor read that one file.

a per-session corpus, keyed by a session identity, fails the test above: it copies what the actor
owns into each run, and each clone then reads its own stale render.

the objection *"one path cannot hold two corpora"* does not hold — two clones of one actor need the
identical corpus, so one path serves both.

## .enforcement

- a per-clone copy of aught an actor owns = **blocker**
- a new artifact under `clones/` that derives from `{ brain, roles }` = **blocker**
- a frozen snapshot of an actor's config held inside a derived actor or a clone = **blocker**
- liveness or reach state held in a clone file = **blocker** (the socket is the state)
- a design that treats a roleset change as always-a-new-path = **nitpick** (true for hash only)

## .see also

- `catalog.of=actor-clone-design._.md` — the index; read a row before you design here
- `define.actor-clone-hierarchy` — the root brief this rule enforces
- `define.enrollment-identity-is-the-roleset-hash` — how the hash form is computed
- `define.actor-clone-partitions` — the on-disk / in-mem split per grain
- `rule.forbid.clone-config-misnomer` — the term-level twin: this rule forbids the artifact, that one forbids the word
- `define.brain-dir-repo-vs-actor` — the exactly-two brain dirs a clone may read
- `rule.require.search-before-you-claim-absence` — the general form of the worked case
