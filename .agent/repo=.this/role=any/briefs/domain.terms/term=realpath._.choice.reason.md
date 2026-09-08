# domain.term.choice.reason: realpath

## .etymology

posix's own word — `realpath(3)`, and node's `fs.realpathSync`. we adopt the syscall's noun rather
than coin beside it, so a reader who knows the platform already knows the semantics: every symlink
followed, one canonical answer.

`resolve` is barred outright by `rule.forbid.term=resolve` (it conflates derive, infer, extract,
expand, lookup, compute, and settle), which rules out the otherwise-obvious `resolvedPath`.
`canonicalPath` and `truePath` are coinages for a concept posix already named, and both invite the
question "canonical/true by whose rule?" — `realpath` answers it by citation.

## .what it is FOR — the two-store trap

it exists for exactly one condition, and that condition is the wish's most expensive finding:

- `<pnpm-root>/node_modules/.pnpm/` — the store every `pnpm` command writes to
- `<pnpm-root>/.pnpm/` — a **stale** store the `rhx` bin shim actually execs from

neither is a symlink to the other. so `pnpm add -g` + `pnpm rebuild` repaired a tree that `rhx`
never loads, while every direct check reported the addon fine. the ONE read that saw it was a
replay of rhachet's own module lookup from its real dist path — which is this term.

so a realpath is a **diagnostic datum handed to a human**, never a command for them to produce.
it replaced a `readlink -f $(which rhx)` incantation that was GNU-only, and so failed with its own
error on two of the three supported platform families.

## .disputes

### dispute: string vs `string | null` — raised 2026-09-02 — status: RESOLVED (nullable)
- raised.by  = a peer review (i030 r010)
- claim      = a realpath is always readable, so a plain `string` is the simpler contract
- counter    = it is read INLINE while the classified socket report is constructed, and
               `realpathSync` throws on ENOENT/EACCES/ELOOP. a throw there means the
               `MalfunctionError` is never built at all — a bare fs error propagates and the
               human reads a stack trace instead of the report. ⚠️ and the failure modes are
               CORRELATED: those errno values arise on a damaged install or an exotic
               overlay/chroot fs, which are the same hosts that make the addon unloadable. so
               the unguarded shape failed worst exactly where it mattered most.
- resolution = `string | null`. a sentinel string was also rejected: `loaded from unknown`
               reads as a path a human might go hunt for, which is a fabrication dressed as a
               datum (`rule.forbid.failhide`). null is stated ignorance, and the hint renders
               it AS ignorance.

## .evidence

- **the symlink row is the only one with teeth.** under jest `__filename` is already canonical, so
  `realpathSync` is a no-op and a naive test stays green with the call DELETED. the clamp reaches
  the module through a symlinked dir under `NODE_OPTIONS=--preserve-symlinks` — measured: default
  lookup makes the faithful and mutant twins indistinguishable; the env var makes them differ.
- **the nullability is clamped both sides.** `getRhachetRealpathFromProcess.integration [case1b]`
  forces the throw through an injected reader; `asCloneSocketOmissionReasonError [case1b]` asserts the
  null row still yields a classified error, still names the reinstall, and fabricates no path.

## .invariants

- a realpath is a VALUE handed over, never a command a human is told to run
- it is nullable — an unreadable diagnostic must never destroy the report it is read into
- a null realpath is RENDERED as stated ignorance, never dropped and never fabricated
