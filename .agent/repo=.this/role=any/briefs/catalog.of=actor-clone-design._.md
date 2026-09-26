# catalog.of=actor-clone-design

> the identity model this repo is built on. read a row before you design against this surface.
>
> `clone → actor → { brain, roles }`

## .the three invariants that decide most designs

1. **an ACTOR owns the config. a CLONE references it.**
   *"if config lived per-clone, clones would drift."* ⇒ per-clone config is an anti-pattern, and
   it has a rule: `rule.forbid.per-clone-config`.
2. **the sync invariant** — *"all clones of an actor share the actor's config by reference, not by
   copy. when the actor changes, every clone inherits it — new clones at spawn, live clones on their
   next settings read."*
3. **identity is one of THREE forms**, and they behave differently under a role change:

| form | dir | add a role |
|---|---|---|
| **hash** (anonymous) — `rhx enroll` | `actor.via.hash=$hash` | new hash ⇒ a DIFFERENT actor. the old one is untouched, correctly |
| **slug** (explicit) — `actors.yml`, `rhx clone` | `actor.via.slug=$slug` | identity stable — the roleset is edited, the actor's config is rewritten in place, every clone inherits |
| **derived** — base ⊕ delta | `actor.via.slug=$base._.delta=$hash` | the base changes ⇒ effective roles change, re-derived at spawn |

the hash form gives a new path per roleset; the slug and derived forms hold their path and evolve
their content. so a role change is a new actor in one form and the same actor in two.

## .the catalog

| # | brief | what it settles |
|---|---|---|
| 1 | `define.actor-clone-hierarchy` | the root. the grain ladder, the sync invariant, the on-disk shape, the three identity forms, derived actors, the `rhx clone` verb surface |
| 2 | `define.enrollment-identity-is-the-roleset-hash` | how the **hash** form is computed (`sha256({brain, roles})`, roles sorted), and the two artifacts it already keys |
| 3 | `define.actor-clone-partitions` | each grain has an **on-disk** and an **in-mem** partition; every contract speaks the bare `Actor`/`Clone` |
| 4 | `define.address-sigils` | `@<slug>` addresses an **actor**, `@:<slug\|serial>` a **clone**; markedness encodes the grain |
| 5 | `define.clone-reach-states` | a clone is **LIVE / DEAF / DEAD** — one word answers "can a caller talk to it" |
| 6 | `define.invariant.clone-say-delivery` | `delivered` is reported only after the **whole** message reached the brain-cli |
| 7 | `define.invariant.clone-socket-brain-cli-only` | the dispatch socket grants input to a **verified-live brain-cli** and to no other process |
| 8 | `define.invariant.clone-directioned-observe` | `get` yields `CloneMessage { direction: 'in' \| 'out' }` — a field a machine parses, never a glyph it scrapes |
| 9 | `define.invariant.clone-prune-safety` | `prune` reaps only a **DEAD** clone on **this host**, and is plan-by-default |
| 10 | `rule.require.short-serial-for-unslugged-clones` | a slugless clone is addressed to a human by its **8-char short serial** |
| 11 | `choice.clone-glyph` | the clone domain-root glyph is **😶**, a mouthless face — and why |
| 12 | `rule.forbid.per-clone-config` | the anti-pattern forbidden: no per-clone copy of what an actor owns |
| 13 | `rule.forbid.clone-config-misnomer` | the same anti-pattern at the term grain: a clone has no `config dir`, it reads a **brain dir** |

## .what lives where on disk

```
.agent/.actors/actor.via.{hash=$h | slug=$s | slug=$base._.delta=$h}/
  brain/.claude/settings.json   # the ONE shared config — clones REFERENCE it
  roles/enrollment.jsonl        # append-only role history
  clones/
    slug=$slug -> serial=$uuid/ # RefByUnique → RefByPrimary
    serial=$uuid/
      identity.json             # { serial, slug } — durable identity ONLY, never liveness
      history/                  # symlinks to the brain-cli's own <exid>.jsonl transcripts
```

each artifact under `clones/` differs only by SESSION — identity, history, socket. no artifact that
derives from `{ brain, roles }` belongs there; that is the actor's, by the sync invariant.

⇒ liveness needs no stored state: the socket is the state. the socket lives in
`$XDG_RUNTIME_DIR`, not the clone dir (a `sun_path` cap of ~104 chars).

## .the test — before you place a new artifact

> **"does this derive from `{ brain, roles }`, or from this run?"**

- from `{ brain, roles }` → **the actor dir.** one file, shared, rewritten as the actor evolves
- from this run — a session id, a transcript, a socket → **the clone dir**
- you cannot name which → you have not read row 1. read it before you design

## .see also

- `define.rhachet.v3` — actor = 🧠 brain ⊕ 🧢 role, the core-objects brief this extends
- `define.agent-dir` — the `.agent/` layout this frame lives within
- `../../role=user/briefs/actors/howto.use.clones.md` — how to bake and talk to clones
- `.behavior/v2026_08_07.enroll-with-interface/` — the wish + vision that introduced the model
