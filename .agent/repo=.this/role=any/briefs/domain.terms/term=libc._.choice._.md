# domain.term: libc

term.chosen   = libc
term.kind     = noun
term.boundary = host          # a fact about the machine, never about our code
term.synonyms.forbidden:
- abi
- flavor
- variant
- distro
- glibc                       # ⚠️ a POSITION on this axis, never the axis itself

term.positions:               # closed set — `Libc`
- glibc                       # the host links gnu libc; upstream's linux prebuilds are built for it
- musl                        # the host links musl (alpine); the glibc prebuild dlopen-fails on it
- unreadable                  # the probe ran and returned naught. a FIRST-CLASS answer, never a musl synonym

## .what

**which c library a host links.** it is the axis that decides whether upstream's linux prebuilt
pty addon can `dlopen` on this machine — the `platform-arch` tuple alone cannot, because a musl
host matches `linux-x64` and still fails to load.

## 🚨 .why `unreadable` is a position and not an absence

node names a runtime glibc version **only** where glibc is linked, so the field's presence is the
signal. its ABSENCE carries two senses — *"this host is musl"* and *"this report told us naught"* —
and only the first is a fact about the host.

`asLibcFromReport` separates them with a **witness** field (`nodejsVersion`): a genuine report
always carries it, on musl and glibc alike, so a report that lacks the witness is not a musl
report — it is not a report we can read.

⇒ to collapse `unreadable` into `musl` would tell a glibc human *"pass `--no-socket`"* about an
install **we** broke — a cure that runs clean and repairs naught, which is the exact defect class
`rule.require.errors-name-the-fix` bans.

## ⚠️ .the boundary against `unknown`

they sit on one line of `getPtyPlatformSupport` and are **different terms**, never a typo:

| word | whose subject | means |
|---|---|---|
| `unreadable` | the **libc probe** | a probe ran against this subject and returned naught |
| `unknown` | the **platform-support verdict** | no probe of ITS subject ran, because an input was unreadable |

`unreadable` is upstream of `unknown` — the first propagates into the second, on linux alone.
see `term=unreadable._.choice._.md`, *"the second boundary"*.

## .refs

- src/domain.operations/clone/pty/asLibcFromReport.ts          # declares `Libc`; the witness rule
- src/domain.operations/clone/pty/getLibcFromProcess.ts        # the ambient read
- src/domain.operations/clone/pty/getPtyPlatformSupport.ts     # `libc` as a REQUIRED input, never inferred
- src/domain.operations/clone/pty/asPtyHostTuple.ts            # the peer axis (`platform-arch`) libc alone cannot decide

## .reason
- `term=libc._.choice.reason.md`
