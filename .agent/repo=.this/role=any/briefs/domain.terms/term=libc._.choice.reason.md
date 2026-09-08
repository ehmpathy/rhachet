# domain.term.choice.reason: libc

## .etymology

**`libc` is the ecosystem's own word**, not one we coined. node itself, the musl/glibc projects,
every distro's package index, and node-pty's own build notes all use it for the same axis. so the
choice here was not *"which word"* but *"which axis"* — and the axis had to be named because the
`platform-arch` tuple, which upstream's prebuild layout is keyed by, **cannot decide linux**.

the boundary is `host` because it is a fact about the machine, never about our code or our render
(`rule.require.boundary-qualified-terms`). it sits beside `platform` and `arch` on the same host.

rejected, and why:

| candidate | why not |
|---|---|
| `abi` | far broader — abi covers the call convention, node's own `NODE_MODULE_VERSION`, and more. node-pty is n-api and therefore abi-stable across node majors, so `abi` would name an axis that does **not** vary here while it hid the one that does |
| `flavor` / `variant` | say only *"there is more than one"*, and name no axis. two hosts differ in flavor of what? |
| `distro` | wrong grain and factually wrong: alpine is a distro, musl is a c library, and other distros ship musl. the addon cares about the library it links, never the distro's name |
| `glibc` | ⚠️ a **position** on this axis, never the axis. to name the axis after one of its values makes `libc === 'musl'` read as a contradiction |

## 🚨 .the position that earned the whole cluster — `unreadable`

a two-position enum (`glibc | musl`) is the obvious shape and it is **wrong**, for a measured
reason.

the read is `process.report.getReport()`, and node names `header.glibcVersionRuntime` **only** on
glibc. so a naive read is:

```ts
const libc = header.glibcVersionRuntime ? 'glibc' : 'musl';   // ⚠️ WRONG
```

that treats *"the report told us naught"* as *"this host is musl"*. the witness field closes it:

| `nodejsVersion` (witness) | glibc marker | verdict |
|---|---|---|
| absent | either | **unreadable** — the report failed us, so we know naught |
| present | present | glibc |
| present | absent | musl — a populated report that genuinely lacks it |

`nodejsVersion` is the cheapest field a real report always carries: node knows its own version with
no syscall, no libc, and no platform dependency. so it is present on musl and glibc alike, and its
absence is evidence about the **report**, never about the host.

### why the third position is decisive rather than pedantic

it decides an **error class**, which decides an **exit code**, which decides **whose defect it is**:

| libc, on linux | platform-support | the report a human reads |
|---|---|---|
| `glibc` | supported | 🔴 `MalfunctionError`, exit 1 — the prebuild ships; OUR artifact or install is broken |
| `musl` | unsupported | 🟡 `ConstraintError`, exit 2 — no binary exists; `--no-socket` |
| `unreadable` | **unknown** | neither party can be named, so neither is blamed |

⇒ with two positions, an unreadable probe on a **glibc** host renders as *"pass `--no-socket`"* —
loud about the wrong party, which is the failure mode `rule.forbid.failhide` names.

## ⚠️ .the boundary against `unknown` — two words, one line, on purpose

`getPtyPlatformSupport` carries both, and a reader's first instinct is that one is a typo for the
other. they are different terms with different subjects:

- **`unreadable`** — a probe ran against *this* subject (the libc) and returned naught
- **`unknown`** — no probe of *its* subject (platform support) ever ran, because an input was
  unreadable

so `unreadable` is strictly **upstream** of `unknown`, and only on linux: an unreadable libc yields
`unknown` there and is **ignored** on darwin and win32, since libc governs neither. that asymmetry
has exactly one owner (`getPtyPlatformSupport`); a caller that re-derived *"libc matters only on
linux"* would be a second copy of it, free to drift.

⇒ the split is recorded on the term side at `term=unreadable._.choice._.md`, *"the second
boundary"*, and cited from the code line itself.

## .disputes

no dispute is open. the word is the ecosystem's, the axis is forced by upstream's build (a
glibc-2.28 sysroot), and the three positions are each reachable from a unit test.

⚠️ one candidate was weighed and **declined rather than forbidden**: a `libc` position for a host
that links **neither** (a statically-linked or non-linux host). it is not a fourth position because
the type is only ever consulted where the answer matters — `getPtyPlatformSupport` reads it on
linux alone. a `notApplicable` position would be a value that is never read, and a value never read
is a value no test can redden.

## .evidence

- **discovery move** = the five whys, run against a real symptom. *"the addon will not load"* →
  *"there is no linux prebuild"* → refuted at the bump → *"the prebuild is there and may still fail"*
  → *"it is glibc-linked"* → **the axis**. the term is the answer that stopped to shift
- **the upstream fact that forces it** = node-pty's linux prebuilds are built against a glibc-2.28
  sysroot (upstream `#853`). that is what makes `linux-x64` a necessary-but-insufficient tuple, and
  therefore what makes libc a required second axis rather than a detail
- **purity is the clamp's enabler** = `asLibcFromReport` takes the report as an INPUT rather than a
  read, and `getPtyPlatformSupport` takes `libc` as a required input rather than an inference. so
  every row above — the `unreadable` row above all, which no host we can run on would produce —
  is reachable from a unit test on any machine
- **invariant** = `unreadable` is never converted to a default. a caller that coerced it to `musl`
  or `glibc` would restore the two-position defect with an extra step
