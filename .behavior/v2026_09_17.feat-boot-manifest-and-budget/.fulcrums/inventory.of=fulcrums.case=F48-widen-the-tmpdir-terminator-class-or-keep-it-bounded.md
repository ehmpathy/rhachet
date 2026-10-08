# F48 — widen the tmpdir mask's terminator class, or keep it bounded

| field | value |
|---|---|
| **case** | F48 |
| **title** | widen the tmpdir terminator class, or keep it bounded |
| **rework** | clean |
| **status** | `[driver]` — best-guessed, kept bounded |
| **confidence** | 88% |
| **where** | `blackbox/.test/infra/invokeRhachetCliBinary.ts` — `asSnapshotSafe`, the OS-temp-root mask |

---

## .the fork

the mask that collapses `tmpdir()` to `/TMP_ROOT` is bounded by a lookahead:

```ts
`${tmpdir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[/"\\s]|$)`
```

the terminator class is `{ / , " , whitespace }` plus end-of-string. the fork is whether that
class is wide enough, or whether it should admit further separators — a comma, a colon, a
right paren.

| option | what it buys | what it costs |
|---|---|---|
| **keep it bounded** (taken) | the mask fires only where a real path boundary follows, so it cannot over-consume a name that merely BEGINS with the root | a render that emits `<tmpdir>,` leaks the volatile root |
| widen the class | every plausible separator terminates | each added character is a guess at a render nobody has produced, and a wider class over-consumes wider |

## .taken, and why at the time

**bounded.** no render in this repo emits a temp root followed by a comma, a colon, or a paren —
the two shapes that actually occur are a path continuation (`/`) and a JSON string terminator
(`"`), and both are in the class. whitespace was added for the `<root> (N files)` shape.

⇒ to add a character for a render that does not exist is speculative generality, and the repo
forbids it (`rule.prefer.wet-over-dry`). the class grows when a render demands it, and that
render is the evidence.

## .rework, and why

**clean.** one character inside one class in one expression. a wider class can only mask MORE,
so no extant snapshot can move unless a render already leaks — which is the case the edit would
exist to fix.

## .confidence — 88%, and why it is not higher

the 12% is that `tmpdir()` on a mac is `/var/folders/<xx>/<yy>/T`, a **single-letter final
segment**. a render that emits that root adjacent to any punctuation this class omits leaks it,
and a single letter has more adjacency shapes than a long path does. no such render is known
here — but the whole reason this mask exists is that the last unmasked root was invisible until
an independent run found it (`rule.require.snapshot-verified-on-independent-run`).

## 🔴 .what this fulcrum is NOT

**it is not the concern `r001 nitpick.1` raised, and that concern is refuted.** the concern's
claim was that `\\s` reaches the regex as a **literal `s`** — that the class is
`{ /, ", \, s }` and whitespace never terminates at all.

that reads the pattern as a regex LITERAL. it is a TEMPLATE literal, so `\\` yields one backslash
into the pattern string and the regex parser then reads `\s`. measured 2026-09-25 under node:

```
source string -> "/tmp(?=[/\"\\s]|$)"      parsed -> \/tmp(?=[/"\s]|$)
'/tmp ok'     -> '/TMP_ROOT ok'            ⇒ whitespace DOES terminate
'/tmps/x'     -> '/tmps/x'                 ⇒ a literal `s` does NOT
```

⇒ and the concern's own proposed fix — *"write the lookahead as `(?=[/"\s]|$)`"* — compiles to
the **identical** regex, so it would change naught. the measurement is pinned beside the mask so
the misread is not re-derived.

## .the verdict

open. bounded stands until a render demands a character in the class.
