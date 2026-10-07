# F53 — how `install.age` constructs its no-tty arm in a test: an env seam, or no clamp?

- **raised** = 2026-09-28, at `5.1.execution.from_vision`, `review.peer i006` —
  `arch-hazards-behavior` nitpick.1
- **rework** = clean
- **status** = OPEN — **the env seam**
- **confidence** = **84%**

## .the fork, stated fairly

`install.age.sh` reads its tty path from `INSTALL_AGE_TEST_TTY_PATH` (default `/dev/tty`). the
reviewer names it ambient state that can steer the refusal branch.

| | **env seam** (taken) | **no seam** | **a hidden cli flag** |
|---|---|---|---|
| no-tty arm clamped | ✅ `install.age.acceptance` `[case10]`, on any box | 🔴 unreachable — a test child inherits its runner's terminal | ✅ |
| surface a caller sees | none — the name is test-scoped, absent from help | none | 🔴 a flag in argv that `--help` must either list or hide |
| misuse | a caller must export a variable named `..._TEST_...` | none | a caller must pass a flag |

## .the call, and why

**the env seam.** the refusal it guards is exit 2 with the exact command to run, so a misuse costs a
clear refusal and never a wrong install. a flag moves the same seam into the public argv. with no
seam, the branch that fixed a measured defect (a `-n`-only probe that refused a real terminal)
goes unclamped.

## .why the confidence is 84%

a reviewer who prefers argv over env for test seams has a defensible taste; the harm either way is
a refusal that names its fix.

## .rework

clean — rename the variable, or move it to a flag.
