# domain.term: tuple

term.chosen   = tuple
term.kind     = noun
term.synonyms.forbidden:
- platform
- target
- triple
- arch
- slug
- id

## .what

**a fixed-order join of two or more facts into one string, where the ORDER and the SEPARATOR are
part of the contract.** a tuple is not a label for what it describes — it is a *format*, owned by
whoever defined the join.

the one declared use:

```
hostTuple    `platform-arch`, e.g. `linux-x64` — node-pty's own prebuild directory format
```

## .why it earns a word

because **the grain is the guarantee.** `linux` and `linux-x64` are both true statements about
the same machine, and only the second selects a binary. a word that names the *format* rather
than the *subject* makes the grain visible at the point of use:

```
platform: string      ⛔ which grain? `linux` or `linux-x64`? no reader can tell
hostTuple: string     ✅ a tuple is a join, so it must carry more than one fact
```

⚠️ **this is not theoretical.** the field now named `hostTuple` was named `platform` and was fed
a tuple, while its kin `getPtyPlatformSupport` took `platform` for the bare OS string. two
grains, one word, one directory, both plain `string` — a wrong wire would have compiled and
passed. see `term=host._.choice.reason.md` for the full account.

## .the property it guarantees

**a tuple has exactly one owner, and every other site derives from it.** the format belongs to
node-pty (`prebuilds/${platform}-${arch}/`), so we mirror it in one place and never rebuild it by
hand:

```
asPtyHostTuple              the single owner — the only site that knows the separator
getPtyHostTupleFromProcess  the one ambient read
```

before that owner existed, the join was hand-built at **four** sites, so a drift in upstream's
format meant four independent edits and no test to catch a missed one. a peer review escalated
that duplication to a blocker.

## .the test — is it a tuple, or a slug?

> **can you name each position, and would a reorder change the sense?**

- yes → tuple (`linux-x64` — position 1 is the platform, position 2 the arch; `x64-linux` is wrong)
- no → not a tuple; it is a slug, an id, or a name

## .refs
- `src/domain.operations/clone/pty/asPtyHostTuple.ts`                  # the single owner
- `src/domain.operations/clone/pty/getPtyHostTupleFromProcess.ts`      # the ambient read
- `src/domain.operations/clone/asCloneSocketOmissionReasonError.ts`          # the `hostTuple` field
- `src/domain.operations/clone/pty/getPtyPlatformSupport.ts`           # `PTY_PREBUILD_TUPLES`
- `src/domain.operations/clone/pty/getPtyPlatformSupport.integration.test.ts`  # clamps the list vs the tarball

## .not a synonym of

- 👎 `platform` — a platform is **one** of the facts a tuple joins. this is the exact overload
  the term exists to retire; `platform` is a forbidden synonym on those grounds
- 👎 `triple` — the gnu toolchain's `arch-vendor-os` is a *three*-part join. ours is two parts and
  a different order, so `triple` would name a foreign format
- 👎 `target` — `term=target` is already taken in this repo for the subject of an operation
- 👎 `slug` — a slug is an opaque identifier; each position of a tuple carries its own fact
- 👎 `arch` — an arch is **one** position (`x64`), so it carries the same part-for-whole overload
  `platform` does. sharper here: `arch` names the bare OS-string grain this very change retired.
  the old code read `process.platform` alone and treated that as the host's identity, which is
  what let a musl host read as a glibc one. to name the join `arch` would re-adopt a part's word
  for the whole, right after we split the part out
- 👎 `id` — reads as an opaque handle some system minted, so a reader expects to look it up rather
  than decompose it. a tuple is the reverse: **derived** from the host, and every position is
  meant to be read (`getPtyPlatformSupport` branches on the libc position alone)

## .reason
see the ref-level cluster beside this choice:
- `term=tuple._.choice.reason.md` — etymology, the rejected synonyms, evidence
