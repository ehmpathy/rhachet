# radio dispatch — queued

## route

- **via:** os.fileops (radio/gh.issues blocked for now — enqueue as a file, promote to gh.issues later)
- **into:** rhachet-roles-ehmpathy
- **role:** mechanic
- **kind:** lesson → brief
- **status:** QUEUED
- **origin:** ehmpathy/rhachet `enroll-with-interface` 1.vision drive (2026-08-07)

## title

teach the mechanic to hunt the max-boundary critipath — the steel-test of every proposal

## description

### the lesson

when you propose or review a design or an implementation, do not settle for the obvious happy path.
**actively search for the critical path that exercises the MAXIMUM number of boundaries at once** — the
single case that simultaneously stresses identity, sync, config, deltas, ipc, lifecycle, persistence,
concurrency, and whatever other seams the model has. that path is the **steel-test**: it exposes the
most defects per unit of effort and proves the model holds under the worst combined load.

### the why

a proposal that only survives the easy paths is untested where it matters. the max-boundary critipath
is where a model's seams show. to find it early — at proposal time, before code — surfaces design flaws
cheaply and hands verification one high-value target instead of many shallow ones. one path through all
the boundaries beats ten paths through one boundary each.

### the worked example (lived this drive)

`rhx clone actor://builder -driver` — clone an actor with a role-delta. this one path exercises, all at
once:

- **identity** — a derived actor is named **and** hashed (`actor.via.slug=builder._.delta=$hash`), the
  only form that carries both
- **the sync invariant** — it tethers to `builder` and inherits builder's updates (`+ achiever`), it
  does not fork away
- **config projection** — its effective config is re-derived at spawn (`genBrainCliConfigArtifact`),
  not copied
- **the role-delta grammar** — `-driver` applied durably against a live base
- **the clone lifecycle** — spawn, reuse, sync

one path, the whole model under load. the derived-actor design was only de-risked once we named this
as the max-boundary case and reasoned the model through it. that is the move to institutionalize.

### the ask

add a mechanic brief — e.g. `rule.require.steeltest-max-boundary-critipath` (or
`howto.hunt-max-boundary-critipaths.[guide].md`) — that instructs: **for every proposal, name the
critipath that exercises the most boundaries simultaneously, and prove the proposal against it.** frame
it as a first move in design + review, not an afterthought. pairs with behaver
`philosophy.verification-strictness` (exhaustive coverage) and mechanic `rule.require.clamp-edge-cases`.

### evidence

the derived-actor model held only after the `actor://builder -driver` steel-test forced every seam —
identity + sync + config + delta + tether — to be reconciled at once. absent that case, the model read
"done" while its hardest path was unproven.
