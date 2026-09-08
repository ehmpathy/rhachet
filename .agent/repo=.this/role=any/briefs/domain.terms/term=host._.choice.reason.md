# domain.term.choice.reason: host

> ⚠️ one blockquote below cites a peer review **verbatim** and carries a word our own prose
> forbids. it is retained inside the citation only, where a paraphrase would falsify it.

## .etymology

`host` is inherited, never coined — it arrived from two unrelated conventions at once, which is
exactly how a one-word-two-senses overload forms without anyone deciding to make one.

**sense A (the machine)** comes from the unix/build-toolchain convention, where a *host tuple*
(`platform-arch`, e.g. `linux-x64`) names the machine an artifact is built for. node-pty itself
uses it — `prebuilds/${process.platform}-${process.arch}/` — so the word entered our vocabulary
through the dependency's own directory layout, not through a choice of ours.

**sense B (the terminal adapter)** comes from the hosted-process convention: the party that
*hosts* a guest supplies its environment. a `PtyCloneHost` supplies the child's stdout, input,
size, and signals — it hosts the clone the way a server hosts a site.

both are correct english. neither is a misuse. that is what makes the overload durable rather
than a slip a rename would cure.

## .disputes

### dispute: the two senses of `host` — raised 2026-08-30 — status: OPEN (compound, do not split)

- raised.by  = the driver, during the `platform` → `hostTuple` rename (l3 r011)
- claim      = one word at two senses in the same bounded context is precisely what
               `rule.forbid.domain-term-ambiguity` forbids. `clone/pty/` holds both
               `PtyCloneHost` (adapter) and `hostTuple` (machine), so a reader who meets a bare
               `host` there cannot tell which is meant, and **no type catches a wrong wire** —
               sense A is a plain `string`, sense B is an interface.
- counter    = a split would cost more than it buys, on three counts:
               1. **each sense's compound already disambiguates.** `hostTuple` cannot read as an
                  adapter; `PtyCloneHost` cannot read as a machine. the ambiguity exists only in
                  the bare word, which is used in no contract.
               2. **sense A is not ours to rename.** it mirrors node-pty's own `prebuilds/`
                  directory contract. to call it `machineTuple` would break the correspondence
                  that makes `asPtyHostTuple`'s output checkable against the tarball on disk —
                  which is what `getPtyPlatformSupport.integration.test.ts` clamps.
               3. **sense B has no better word.** `PtyCloneTerminal` is wrong (the adapter is
                  faked in tests, where no terminal exists); `PtyCloneWires` and `PtyCloneIo` are
                  both less legible than the extant name.
- resolution = **OPEN.** the compound rule (below) is adopted as the interim guard. the dispute
               stays open because the interim guard is a convention, not a mechanism — no test
               reddens on a bare `host`, so it holds only as long as readers honor it.

**the interim guard, adopted:** never use `host` bare in a contract. compound it so the sense is
local — `hostTuple` / `hostPid` / `hostHash` for A, `PtyCloneHost` for B.

**what would close this dispute:** either a lint rule that reddens a bare `host` identifier in
`clone/`, or a branded type on sense A (`type PtyHostTuple = string & { __brand: … }`) which
would make a wrong wire a **compile** error rather than a convention. the branded type is the
stronger move and is the recommended close.

## .evidence

### the drift this dispute exists to prevent is not hypothetical — its twin already shipped

the sibling word `platform` carried the identical defect and **reached production**:

- `getPtyPlatformSupport` took `platform` and meant the **bare** `process.platform` (`'linux'`)
- `asCloneSocketOmissionReasonError` took `platform` and was handed the **tuple** (`'linux-x64'`)

same word, same directory, same error path, two grains, both plain `string`. a peer review
(l3 r011, 2026-08-30) named it a blocker with the argument that settled it:

> *"nothing (not the type — it's plain `string`, no branding) stops a future edit from wiring
> `process.platform` straight into `asCloneSocketOmissionReasonError`'s `platform` field, since the
> name matches."*

the consequence would have compiled, passed every test, and degraded the one field a human reads
to know which machine failed — from `linux-x64` to `linux`. it was fixed by a rename to
`hostTuple` plus a drift clamp that pins the field to its owner's actual output:

```ts
expect(meta.metadata?.hostTuple).toEqual(getPtyHostTupleFromProcess());
expect(meta.metadata?.hostTuple).toContain(process.arch);
```

> 🚨 **that is the whole case for this cluster.** `platform`'s overload was found only because a
> reviewer read two files side by side. `host`'s overload is the same shape, is already at more
> call sites, and has no clamp at all. it is recorded now so it is met as a known hazard rather
> than rediscovered as a defect.

### the `…ForHost` rejection — the same ambiguity, caught earlier

a prior round proposed `isPtyPlatformSupportedForHost` for the ambient-read wrapper. it was
rejected on two independent grounds, the second of which is this cluster's:

1. `For<Noun>` names the noun as an **input** in all 15 extant uses; here the host is ambient,
   never passed
2. `Host` in `clone/pty/` already means the terminal-mirror adapter (`PtyCloneHost`), so the
   suffix would read as sense B while it meant sense A

the resolution was `…FromProcess`, which names the *source of the read* rather than a noun —
sidestepping both senses. the reason is recorded in `getPtyPlatformSupportFromProcess.ts`'s own
header, so the fact survives at the call site as well as here.

### the split is per-sense, and an invariant must say which

a claim about `host` binds to **one sense only**. *"the host decides which prebuild loads"* is
true of A and meaningless for B; *"the host receives every byte the child writes"* is true of B
and meaningless for A. any invariant, test name, or error message that says `host` unqualified
is under-specified — which is the practical reason the compound rule is worth honoring even
while the dispute stays open.
