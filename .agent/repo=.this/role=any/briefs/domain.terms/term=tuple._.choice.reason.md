# domain.term.choice.reason: tuple

## .etymology

`tuple` is borrowed from mathematics and adopted across build toolchains, where it names an
**ordered** sequence whose positions are meaningful. we adopt it in the toolchain sense, not the
mathematical one: a *host tuple* is the `platform-arch` string a build system uses to select an
artifact.

the word entered this repo through node-pty's directory layout rather than through a design
choice — upstream stores its prebuilt addons under
`prebuilds/${process.platform}-${process.arch}/`, so `linux-x64`, `darwin-arm64`, `win32-x64`.
we needed a name for that exact string, and `tuple` is what the wider ecosystem calls it.

⚠️ **the gnu convention says `triple`** (`arch-vendor-os`, e.g. `x86_64-unknown-linux-gnu`).
that is a *three*-part join in a *different* order, so `triple` would name a foreign format and
mislead anyone who knows the gnu one. `tuple` is deliberately the generic word, because our join
is two parts and node's own, not gnu's.

## .disputes

### dispute: `platform` — raised 2026-08-30 — status: RESOLVED (adopt `tuple`)

- raised.by  = a peer review (l3 r011)
- claim      = the field was already named `platform`, and `platform` reads naturally for
               *"which platform did this fire on?"*
- counter    = **`platform` was already taken at a different grain, in the same directory, on
               the same error path.** `getPtyPlatformSupport` takes `platform` and branches on
               `input.platform === 'linux'` — the bare `process.platform`.
               `asCloneSocketOmissionReasonError` took `platform` and was handed `linux-x64`. both are
               plain `string`, so a future edit that wired the bare platform into the tuple field
               would compile, pass every test, and silently degrade the diagnostic a human reads
               to know which machine failed.
- resolution = rename the field to **`hostTuple`**, and record `platform` as a forbidden synonym
               for the tuple grain. `platform` keeps its bare-OS sense, which it held first.
               dispute closed.

**the clamp that makes the resolution enforceable**, rather than merely stated:

```ts
expect(meta.metadata?.hostTuple).toEqual(getPtyHostTupleFromProcess());
expect(meta.metadata?.hostTuple).toContain(process.arch);   // a collapse to bare platform reddens
```

the second line is the one that carries the load. a `toBeDefined` would sail right past a tuple
that collapsed to one grain — which is exactly the regression the rename exists to prevent.

## .evidence

### the four-owner duplication, which is why a single owner earns the word

before `asPtyHostTuple` existed, `${platform}-${arch}` was hand-built at **four** sites:
`genCloneOndisk`, `getPtyPlatformSupport`, and two tests. a peer review escalated it to a
blocker with the argument that the format is **node-pty's contract, not ours** — so four owners
meant four independent syncs on an upstream drift, and no test to catch a missed one.

the consolidation produced the two-file shape this cluster documents:

```
asPtyHostTuple({ platform, arch })    pure — the only site that knows the separator
getPtyHostTupleFromProcess()          the one ambient read
```

and the format is now clamped **bidirectionally** against the real tarball, in
`getPtyPlatformSupport.integration.test.ts` — so a platform upstream adds or drops reddens there
rather than reaches a human as a wrong error class.

### why the separator is part of the contract, not a detail

the field report in the wish carried this error verbatim:

```
Cannot find module './prebuilds/linux-x64//pty.node'
```

**note the doubled slash.** that string is assembled from a tuple plus a path join, and its exact
shape is what a human greps for when they report a defect. a tuple whose separator drifted from
`-` to `_` would produce a directory that exists nowhere, with an error that names a path no one
can find — so the separator is as much the contract as the order is.

### the test that distinguishes a tuple from a slug

the practical reason to keep `slug` and `id` as forbidden synonyms: those name **opaque**
identifiers, where no position carries an independent fact and a reorder is meaningless. each
position of a tuple is addressable — which is why `asPtyHostTuple` takes `{ platform, arch }` as
named inputs rather than a single string, and why `getPtyPlatformSupport` can decide support from
the tuple's parts.
