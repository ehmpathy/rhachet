# domain.term: fallback

term.chosen   = fallback
term.kind     = noun
term.synonyms.forbidden:
- backup
- alternate
- default
- secondary
- plan-b
- degraded

## .what

**the path taken only after the preferred path fails.** it is defined by its **order**, never by
its quality: a fallback is second because the primary is tried first, and for no other reason.

two declared uses:

```
getEnvAllFallbackSlug   the env=all slug tried after the exact-env slug misses
genBrainCliPlainClone   the plain-spawn branch taken when the pty branch cannot run
```

> ✅ **a third use was DISPUTED and REMOVED on 2026-09-05.** `socketFallback` named *the reason*
> a socket was unavailable, and its call site **throws** rather than take a second path — so by
> this term's own definition it was never a fallback. it is now `CloneSocketOmissionReason`
> (`term=omitted` plus its `reason`), and **the word `fallback` is unchanged**: the dispute
> challenged the ref, never the term, exactly as its `scope` predicted.
>
> ⚠️ the resolution also **overturned this file's own rename candidate.** `miss` was named here
> as strongest, and it fails 4 of 5 rows under `term=miss`'s own *"data, never a fault"* clause.
> the enumeration is in `term=fallback._.choice.reason.md` — read it before you propose a rename
> from a single instance.

## .why it earns a word

because the ORDER is the guarantee. a fallback silently promoted to primary still succeeds on the
host that runs it, and breaks the claim the design rested on — and no test goes red, because the
fallback path is the one the test exercises either way.

so `fallback` is a word about sequence, and a rename that drops the sequence (to `alternate`, say,
or `default`) drops the guarantee with it.

## .the load-carrying property

**a fallback is reached only on the primary's failure.** that is what lets a design make a
structural claim about the primary's platforms without a runner for them: if the primary succeeds
there, the fallback code never executes, so it cannot regress them.

⚠️ the corollary is the hazard: **to promote a fallback to primary looks like a simplification —
one path is cleaner than two — and it silently voids every claim that rested on the order.**

## .the ORDER is per-context, and the invariant must say which

a fallback's order is fixed **per platform, per host, per env** — never globally. so an invariant
that leans on the order must name the context it binds, or it over-constrains the design.

the worked case: *"darwin/win32 are unregressed"* is bought by *"upstream is their primary."* stated
as the broader *"our copy stays a fallback"* it would also forbid a **linux-only inversion** the
criterion says naught about — and that inversion is what buys the supply-chain property, since only
the copy the primary loads is the copy an attacker must reach.

> **`fallback` names a relation between two paths in one context, never a rank the artifact carries.**
> the same artifact is a fallback here and a primary there, with no contradiction.

## .refs
- `src/domain.objects/keyrack/getEnvAllFallbackSlug.ts`          # the declared dop
- `src/domain.operations/clone/pty/genBrainCliPlainClone.ts`     # the plain-spawn branch
- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts`          # the os.envvar ci fallback

⚠️ `genCloneOndisk.ts` was a ref until 2026-09-05 and is one no longer — its `socketFallback`
became `socketOmissionReason` (`term=omitted`). the file still says `fallback` in one place, and
correctly: the pty-vs-plain spawn, which is a real second path.

## .not a synonym of

- 👎 `default` — a default applies when no choice was made. a fallback applies when a choice was
  made and **failed**. `term=reach` already rejects `default key` on these exact grounds
- 👎 `degraded` — names the OUTCOME's quality, never the path's order. a fallback may be fully
  equivalent (a vendored copy of the same binary); a degraded state may be reached with no
  fallback at all (`--no-socket` is an opt-out, never a fallback)

## .reason
see the ref-level cluster beside this choice:
- `term=fallback._.choice.reason.md` — etymology, the rejected synonyms, evidence, and the RESOLVED
  `socketFallback` dispute in full. it also records why `miss`, this file's own proposed rename,
  was overturned by the enumeration
