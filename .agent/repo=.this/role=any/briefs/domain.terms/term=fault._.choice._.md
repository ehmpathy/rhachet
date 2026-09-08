# domain.term: fault

term.chosen   = fault
term.kind     = noun
term.synonyms.forbidden:
- error
- failure
- errno
- oserror
- exception

## .what

**a failure the environment raised, never one this code caused.** the half of a thrown value a
diagnostic may answer with data rather than a rethrow.

## ⚠️ .the boundary — a `fault` is the WORLD's, a defect is OURS

this is the whole reason the word exists, and it is the line `rule.forbid.failhide` demands a
catch draw:

| the throw came from | it is a | the catch must |
|---------------------|---------|----------------|
| the filesystem, the network, a subprocess | **fault** | answer with data — the caller's report survives |
| this code, or a caller's injected seam | **defect** | rethrow — a bug must never read as a broken host |

🚨 **`defect` is not a forbidden synonym of `fault` — it is its CONTRAST.** to collapse the two is
to report *"your install is damaged"* about a host whose install is fine, which is a confidently
wrong attribution rather than a swallowed one.

## .the pair — `fault` is the CAUSE, `unreadable` is the VERDICT

neither word carries the design alone. a fault is what the host raised; `unreadable` is what we
then hold — a probe that ran and established no answer (`term=unreadable`). so a fault yields an
unreadable verdict, and a defect yields no verdict at all, because it throws.

## .the shape

`fault` reads as the noun a membership test is named for, never as a field:

```ts
// getRhachetRealpathFromProcess.ts
const isFsFault = (error: unknown): boolean =>
  error instanceof Error &&
  typeof (error as NodeJS.ErrnoException).code === 'string';
```

the qualifier before it names WHOSE fault — `fs` here, node's own name for the subsystem that
raised it. ⚠️ that is not a drift on `ondisk`: `ondisk` is an adj that names the durable
partition of an identity grain (`CloneOndisk`), never the subsystem.

## .why not `error` / `failure` / `errno` / `oserror` / `exception`

- `error` — the genus, and already the language's own type name. every throw is an error, so the
  word cannot name the half of them this one does
- `failure` — overloaded here: `asNpmInstallFailureKind` uses it for a package manager's *exit*,
  which is a classified outcome rather than a thrown value
- `errno` — names the FIELD the test reads, not the concept. a fault detected by another signal
  would falsify the name
- `oserror` — imports python's word for a class we do not have
- `exception` — a control-flow mechanism, not a claim about who is at fault; it says how the value
  travelled, never whose problem it is

## .refs
- `src/domain.operations/clone/getRhachetRealpathFromProcess.ts`  # `isFsFault`, the allowlist

## .reason
see the ref-level cluster beside this choice:
- `term=fault._.choice.reason.md` — etymology, the three lanes that converged on it, evidence
