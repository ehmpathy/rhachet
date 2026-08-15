# define.actor-clone-hierarchy

## .what

the core identity model behind `rhx enroll`, `rhx clone`, and `.agent/.actors/`:

```
clone  →  actor  →  { brain, roles }
```

- a **clone** is a live (or revivable) instance of an actor.
- an **actor** is a durable, reusable identity — a brain enrolled in a set of roles.
- an actor **composes** exactly one `{ brain, roles }`, from which its config derives.

this extends `define.rhachet.v3.md` (which declares actor = 🧠 brain ⊕ 🧢 role) with the **clone**
grain and the on-disk shape.

## .why

clones of one actor must **stay in sync long-term**. if config lived per-clone, clones would drift.
so clones nest under a shared actor that owns the one config — a change to the actor (e.g. add a role
`achiever`) reaches every clone at once, because clones **reference** the actor's config, not copy it.
this is the whole reason for the `actor=$slug/` group over a flat `.agent/.clones/`.

## the hierarchy

```
clone   — a live instance; differs from its siblings ONLY by session
  └─ belongs to → actor   — a durable identity = ONE shared config
                    └─ composes → { brain, roles }
```

- **actor** — a durable, reusable identity: one `{ brain, roles }` composition and the config derived
  from it. many clones spawn from one actor and share that config. (*how* an actor is identified — the
  hash vs slug namespaces — is detailed in "filesystem shape" below.)
- **clone** — a single run of that actor. shares the actor's brain + roles. carries its own session.
- **brain** — the inference cli the actor uses (claude, …).
- **role** — a bundle of skills + briefs the actor is enrolled in.

## what stays shared vs what differs

| aspect | scope | note |
|---|---|---|
| brain | **actor** (shared) | all clones use the same brain |
| roles | **actor** (shared) | all clones enrolled in the same roles |
| config (`settings.json`) | **actor** (shared) | clones REFERENCE it; an actor change propagates to all |
| serial | clone | the clone's primary ref (`RefByPrimary`); its `--as` slug is a unique ref (`RefByUnique`) |
| history (series → episodes → exchanges) | clone | each clone's own conversation continuity — symlinks to the brain-cli's own transcripts |
| socket | clone | each clone's own dispatch socket; **its liveness IS the clone's liveness** (no stored state) |

## the sync invariant

> all clones of an actor share the actor's config by **reference**, not by copy.

when the actor changes, every clone inherits it — new clones at spawn, live clones on their next
settings read. this invariant is why the frame is `actor=$slug/{brain, roles, clones/…}` and not a
flat clone list.

## philosophy — clones learn, actors retain; lessons ratchet forward

a clone is **cherished**, not disposable — across its run it earns hardwon lessons. but a clone is also
**mortal**: like any of us, it is always one meteorite away — a crash, a closed terminal, a lost
context. what a clone learned dies with its session UNLESS it is externalized.

the actor is where it survives. **externalize a clone's hardwon lessons into the roles of an actor**
(durable, declared in `actors.yml`) and they outlive the run: every future clone of that actor inherits
them at spawn. the ephemeral run passes; the lesson persists in the lineage.

this is a **ratchet** — rhachet's namesake. a ratchet turns one way only: lessons latch forward and
never slip back. a clone learns, the lesson ratchets up into the actor's roles, the next generation of
clones starts from a higher floor. so our communities and ecosystems of actors compound — each
generation stands on the lessons the last one latched forward, for everyone.

this is the **learner principle** at the identity grain: capture the hardwon lesson before the session
fades. the purpose-name rule (`../../role=user/briefs/actors/rule.prefer.name-clones-after-purpose.md`)
is the everyday nudge toward it — name the run for its purpose, and harvest what it learned into the
durable actor.

## filesystem shape

an actor is **identified** through one of **three forms** — by hash (anonymous), by slug (explicit),
or by a base-slug ⊕ delta-hash (a **derived** actor, see below):

```
.agent/.actors/
  actor.via.hash=$hash/               # hash-identified (anonymous) — genEnrollmentHash({brain, roles})
  actor.via.slug=$base._.delta=$hash/   # DERIVED — a base actor ⊕ a durable role-delta (see "derived actors")
  actor.via.slug=$slug/               # slug-identified — declared in actors.yml (or a fully-qualified role name); reached via rhx clone
    brain/.claude/settings.json   # the ONE shared config (roles→hooks, auth, claude.md)
    roles/enrollment.yml        # append-only role history: which, why, when
    clones/
      slug=driver -> serial=7f3a…/ # symlink: slug → serial (RefByUnique → RefByPrimary) — the fast slug lookup
      serial=$uuid/                # a clone — keyed by its RefByPrimary (serial); session differs
        identity.json              # { serial, slug } — formalizes the map; the serial→slug reverse lookup
        socket                     # unix domain socket — dispatch INTO the clone (the `say` verb);
                                   #   its liveness IS the clone's liveness (connectable = LIVE, else DEAD)
        history/                   # symlinks to the brain-cli's own <exid>.jsonl transcripts —
                                   #   `get` reads these; the exid (for wake) lives in the link name
```

> **note that supersedes two labels (2026-08-08) — both above are illustrative; the build-forced forms
> differ.** the `v2026_08_07.enroll-with-interface` blueprint (`3.3.1.blueprint.product.yield.md`, F2 +
> "on-disk-tree fidelity") corrects two literal labels in the diagram above, for technical
> constraints — the shape/intent is unchanged, only these two forms:
> - **`roles/enrollment.yml` → `roles/enrollment.jsonl`.** an append-only log is idiomatic as `.jsonl`
>   (one JSON object per line, appended without a whole-doc rewrite); a `.yml` doc must be re-serialized
>   on every append. the label above says "append-only," so `.jsonl` is the faithful form.
> - **the in-dir `socket` file → `$XDG_RUNTIME_DIR/clone.$serial.$homeHash.sock`.** a unix-domain socket
>   path is capped at ~104 chars (`sun_path`); a repo-nested `…/clones/serial=…/socket` blows that cap,
>   so the socket lives in the host runtime dir (it mirrors `getKeyrackDaemonSocketPath`). the clone dir
>   keeps identity + history only; `Clone.socketPath` records the runtime path (or null for a
>   plain-spawn fallback clone). the per-clone-socket intent (liveness IS the clone's) is unchanged.

the **slug↔serial map is formalized in `identity.json`** (`{ serial, slug }`, in the serial dir) and
mirrored by a **`slug=<slug>` symlink** for the fast forward lookup. the two directions:

- **slug → serial** — follow the `slug=driver` symlink.
- **serial → slug** — read the serial dir's `identity.json` (a `list` needs no scan of every symlink).

`--as @:driver` **findserts** both (writes `identity.json`, points the symlink); to reach `@:driver`,
follow the link; `@:7f3a` reaches the dir directly. the slug is the clone's `RefByUnique`, the serial its
`RefByPrimary` — one clone, two refs. note `identity.json` records **durable identity only** (serial ↔
slug), never liveness: liveness stays socket-derived, so no state machine returns.

liveness needs **no stored state** — the socket is the state. a clone whose socket accepts a connection
is LIVE; a socket that is absent or refuses is DEAD. so there is no `status.json` state-machine to keep
in sync, and no stale-serial reap: findsert the clone dir, leave the socket, and let a dead socket speak
for itself. (observe is read from the brain-cli's own transcripts in `history/`; a streamed stdout
mirror is a **future todo**, not needed to reach a clone.)

`rhx enroll` is **hash-only**: `rhx enroll claude -r -driver` (and bare `rhx enroll claude`) derives
`actor.via.hash=genEnrollmentHash({brain, roles})` and never consults `actors.yml` — every enroll lands
in the hash namespace. the **slug** namespace is `rhx clone`'s: a `slug:` entry declared in
`.agent/repo=.this/actors.yml` (its roleset recorded as concrete roles, or a base peer actor `@<slug>`
with deltas — never the repo default, an enroll-time concept actor scope cannot reference) is reached
via `rhx clone actor://foreman`. no cli flag mints an actor — enroll derives the hash actor, clone reads
the slug actor.

a **role-derived** slug (no custom name) is **always fully-qualified**, mirroring `.agent/repo=*/role=*`:
an external role → `actor.via.slug=ehmpathy.mechanic`; a native role → `actor.via.slug=.this.redteamer`,
where `.this` is this repo's own `.agent/repo=.this/actors.yml`.

## derived actors — a base ⊕ a durable delta

`rhx clone @builder -driver` clones the `builder` actor WITHOUT the `driver` role. this does
**not** freeze a snapshot — it yields a **derived actor** tethered to its base. (this one usecase
exercises the maximum set of boundaries in the model — identity, sync, config projection, delta
grammar — so it is the premier steel-test critipath.)

## the address sigils — `@` the actor, `@:` the clone

address an actor with `@<slug>` (shorthand for `actor://<slug>`) and a clone with `@:<serial>`
(shorthand for `clone://<serial>`). **markedness** encodes the grain — the actor is the unmarked base
`@` (the durable recipe you reach for by default), the clone wears the `:` grain-marker (`@:` — one of
the many live instances an actor spawns) — and the shared `@` root encodes **descent**: `@:bob` visibly
comes from `@mechanic`. so `rhx clone @builder` ≡ `rhx clone actor://builder`. the full rationale
(markedness, shell-safety, distilisys convergence, rejected alternatives) lives in
`define.address-sigils.md`.

- **identity** — `actor.via.slug=$base._.delta=$hash/` — the base slug (`builder`) ⊕ a hash of the delta
  (`-driver`). named **and** hashed at once. `$hash = genEnrollmentHash(delta)` is deterministic, so
  `actor://builder -driver` always resolves the **same** derived actor, and its clones stay in sync.
  (the term is **delta**, not `diff` — the codebase's role-delta vocab: `getRoleDeltaTokens`.)
- **not a copy** — the derived actor references the base + stores the delta
  (`roles/delta.yml: base=builder, delta=[-driver]`). its effective config = builder's config with
  `-driver` applied, **re-derived at spawn** — the same projection `enroll` already makes via
  `genBrainCliConfigArtifact`. the source of truth is `base ⊕ delta`, never a hand-kept copy.
- **the sync invariant extends** — a derived actor is in sync with `base ⊕ its own delta`. add
  `achiever` to builder → every derived clone's effective roles become `builder.roles + achiever −
  driver`, inherited at next spawn (live clones on respawn; no hot reload). the delta rides *on top of*
  a live base; it does not fork away from it. that tether is the whole point of a derived actor vs a
  frozen snapshot.
- **the invariant, refined** — the earlier "identified by exactly one of slug or hash — never both" now
  admits a third form: a derived actor is identified by **both** (base-slug ⊕ delta-hash). the three
  forms: explicit (slug), anonymous (hash), derived (base-slug ⊕ delta-hash).

**scope** — the `rhx clone actor://builder -driver` *command* needs `actors.yml` for a named base, but
the identity **model** must be able to *represent* a derived actor regardless, so it is carried here.

## relation to extant vocab

- **serial vs series** — `serial` is a clone's **primary ref** (`RefByPrimary`); its `--as` slug is a
  **unique ref** (`RefByUnique`) — so `@:<slug|serial>` is just a `Ref` to the clone. `series` is a
  `BrainSeries` (the continuity of episodes; see `domain.thought/define.term.brain.episodes.md`). one
  clone ↔ one series of history.
- **exid** — the brain-cli's own native session id. rhachet does not store it in a state file — it lives
  in the `history/` symlink name (`<exid>.jsonl`). revive and fork delegate to the brain-cli's native
  resume (e.g. `claude --resume <exid>`); rhachet stores the exid pointer, not the transcript
  (`genBrainSeries.ts` builds the series in memory).
- **on-disk vs in-mem partitions** — each grain (`actor`, `clone`) has two partitions: the **on-disk**
  record this brief describes, and the **in-mem** SDK object (`src/domain.objects/`, a brain ⊕ role
  composition you engage). the CLI speaks the on-disk clone, the SDK speaks the in-mem clone — and both
  call it the bare `Clone` / `Actor`. see `define.actor-clone-partitions.md` (a dream unifies the two).

## the `rhx clone` surface

the `rhx clone` verbs split into two groups by what they do:

**talk — `list` / `say` / `get`** — observe and dispatch into clones that already exist. address a
clone by its assigned slug (`--as @:<slug>`) or its serial — `clone://<slug|serial>` (≡ `@:<slug|serial>`):

- `rhx clone list [actor://<slug>]` — clones (all, or scoped to one actor), with state.
- `rhx clone say clone://<slug|serial> --what <m>` — dispatch a message into a live clone.
- `rhx clone get clone://<slug|serial> [--tail N]` — observe the clone's recent output (read from its transcript).

**bake — `make` / `fork` / `wake`** — create or reopen a clone outside an interactive enroll, via one
verb **`gen`** (implicit unless the token after `clone` is `get`/`say`/`list`); full form
`rhx clone gen <make|fork|wake> <uriOfSource> [--as @:<slug>]`:

- `rhx clone make actor://<slug>` — **make**: a NEW clone from an actor's config (fresh).
- `rhx clone fork clone://<slug|serial>` — **fork**: a NEW clone from a clone, seeded with its `exid`/history.
- `rhx clone wake clone://<slug|serial>` — **wake**: reopen an EXTANT clone — revive if dead, return if live.

**make** is the only verb against an **actor**; **fork** and **wake** are always against a **clone**
(`clone://<slug|serial>`, or `@:<slug|serial>`). the `@:` prefix on `--as` is mandatory (see
`define.address-sigils.md`).

**`--as` flips create → findsert.** the `--as @:<slug>` handle is the idempotency key — it gives the new
clone a stable slug to find-or-create against, so a re-run converges instead of a duplicate (findsert is
the `gen` semantics — `rule.require.get-set-gen-verbs`). the same flip applies whether you `make` from an
actor or `fork` from a clone:

| invocation | verb | semantics |
|---|---|---|
| `rhx clone @<actor>` | make | **create** — a fresh clone, new auto-serial every call |
| `rhx clone @<actor> --as @:<slug>` | make | **findsert** — return `@:<slug>` if it exists, else create it |
| `rhx clone @:<clone>` | fork | **create** — a new lineage, new auto-serial every call |
| `rhx clone @:<clone> --as @:<slug>` | fork | **findsert** — return `@:<slug>` if it exists, else fork it |
| `rhx clone wake @:<clone>` | wake | **findsert** — reopen the SAME clone (idempotent by its handle) |

a bare source URI takes its scheme's default mechanism: a bare **actor** URI ≡ **make** (a fresh clone
each call), a bare **clone** URI ≡ **fork** (a new lineage each call). both create by default; add a
`--as @:<slug>` handle to either for findsert. to reopen an extant clone rather than fork it, reach for
the explicit **wake** verb — `rhx clone wake @:<clone>` — findsert by construction (it addresses an
extant clone by its handle).

## see also

- `../../role=user/briefs/actors/howto.use.clones.md` — bake (make/fork/wake) and talk (list/say/get) to clones.
- `../../role=user/briefs/actors/howto.author-actors-yml.md` — how to declare reusable actors by slug in `actors.yml`, spawnable via `rhx clone actor://<slug>`.
- `define.actor-clone-partitions.md` — the on-disk vs in-mem partitions, and why every contract speaks the bare `Clone`/`Actor`.
- `define.address-sigils.md` — the `@` actor / `@:` clone address sigils and why they were chosen.
- `define.rhachet.v3.md` — actor = 🧠 brain ⊕ 🧢 role; the core-objects brief this extends.
- `define.agent-dir.md` — the `.agent/` layout this frame lives within.
- `domain.thought/define.term.brain.episodes.md` — the series / episode / exchange continuity vocab.
- `.behavior/v2026_08_07.enroll-with-interface/` — the wish + vision that introduce this model.
