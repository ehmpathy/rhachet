# rule.forbid.host-specific-cures-in-hints

## .what

an error hint must not name a command that fails on a host the error can fire on. before you
write a command into a hint, ask **which hosts this row reaches**, then check the command runs
on every one of them.

where the datum is one we already hold, name no command at all — put the value in the metadata
and point at it.

## .why

- **a cure that cannot run is worse than no cure.** a bare failure sends a human to look. a
  confident command that fails with its own error sends them from one dead end to a second, and
  costs them the time it takes to doubt the tool.
- **`rule.require.errors-name-the-fix` is about the fix WORKING**, and a fix that works only on
  the author's laptop does not. the rule is usually read as "name a next move"; it also demands
  the move be available.
- 🚨 **no compiler and no test reads a string as a shell.** a hint is prose to every gate in the
  repo, so this class has exactly one barrier by default — a human's memory of which coreutils
  are GNU — and that barrier fails silently.

## .the trap that produced this

`asCloneSocketOmissionReasonError`'s `MalfunctionError` row shipped this hint:

> compare `readlink -f $(which rhx)` against your package manager global root

| host | `readlink -f` | `which` | `$(…)` |
|------|---------------|---------|--------|
| linux (glibc) | ✅ | ✅ | ✅ |
| **darwin** | ❌ BSD `readlink` has no `-f` | ✅ | ✅ |
| **win32** | ❌ absent | ❌ absent (`where`) | ❌ not cmd/powershell |

the row fires whenever a pty addon is absent on a **supported** platform, and all three families
are supported. so on two of the three the named cure failed with its own error — inside a change
whose whole purpose was to retire a cure that ran clean and changed naught.

the aggravation worth a record: every rule needed to catch it was loaded, cited in the same file,
and applied to the **adjacent row**. it shipped because at the moment of authorship the attention
was on *whether the diagnostic was correct*, never on *whether it could run*.

> **correctness and portability are different questions.** prose review answers the first and
> silently skips the second.

## .the ladder

reach for the highest rung the case allows (`rule.prefer.prevent-over-correct`):

1. **hand over the datum** — if the process already holds the answer, put it in the metadata and
   point the hint at the field. no shell, so no portability question exists
2. **name a portable command** — one that runs on every host the row reaches (`node -p …` is
   usually available, since the human runs a node cli)
3. **name a host-specific command on a row that is host-specific** — legal, and only when the
   row's host is fixed by a checkable premise
4. **name no command** — state the observation and ask for a report. weaker, and still honest

## .rung 3 needs a CLAMPED premise

a host-specific command is fine on a row that only fires on that host — but *"only fires on that
host"* is a fact whose owner lives elsewhere, so it decays in silence.

`ldd --version` is legal in the `unknown`-libc hint **because** `getPtyPlatformSupport` returns
`unknown` solely inside its `platform === 'linux'` branch, **and because that premise is clamped**:
its test asserts an unreadable libc yields `supported` on darwin and win32, and `unsupported` on
linux-riscv64 — and each of those rows names the hint as its reason.

without that clamp the same line would be rung 3 by luck rather than by design.

## .the guard

a token list, checked across **every** row rather than only the row a defect was found in:

```ts
const HOST_SPECIFIC_SHELL_TOKENS = ['readlink', '$(', '`which', '`realpath'] as const;
```

anchor each token (a backtick, or a bare `$(`) so ordinary english cannot false-positive.

⚠️ **check every row, never only the guilty one.** the original defect entered a row whose test
asserted merely that the hint mentioned a stale store — a targeted guard would not have looked
there.

## .the test

for each command in a hint: **list the hosts this row can fire on. does the command exist, with
these flags, on all of them?**

- yes → fine
- no, and the row's host is fixed by a clamped premise → fine, cite the clamp
- no → climb the ladder

## .enforcement

- a hint that names a command absent (or differently-flagged) on a host its row reaches = **blocker**
- a host-specific command on a row whose host is fixed by an unclamped premise = **blocker**
- a hint that names a command for a datum the process already holds = **nitpick**

## .see also

- `rule.require.errors-name-the-fix` (ergonomist) — the rule this sharpens
- `rule.prefer.prevent-over-correct` (ergonomist) — the ladder
- `rule.require.clamp-edge-cases` (mechanic) — why the guard, not just the fix
- `src/domain.operations/clone/getRhachetRealpathFromProcess.ts` — the rung-1 cure in full
