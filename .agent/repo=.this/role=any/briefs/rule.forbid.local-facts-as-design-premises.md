# rule.forbid.local-facts-as-design-premises

> **a design may not rest on a fact about one box. a shell alias, an env var, a dotfile, an installed
> tool, a login — each is true on the box where you wrote the design, and false on the next one.**

a **local fact** = state that lives on a machine, a shell, or a user account, rather than in the repo:
an alias, an exported var, a dotfile in `~`, a global install, a cached login, a host path.

## .why

- the author's box is the one box where the premise always holds, so every test the author runs
  passes. the premise fails first on a box the author never sees
- a local fact cannot be reviewed: it is absent from the diff, so a reviewer reads the design as if
  the premise were a property of the code
- it fails silently. the design does not break on the other box — it quietly does less

## .the test

> **"on a fresh box — clean shell, empty home, no setup — does this premise still hold?"**

- yes → it is a repo fact. proceed
- no → pick one of two, and say which:
  - **promote it** to a stated precondition the repo enforces: a check that fails loud and names the
    fix, or a setup step the repo runs itself
  - **design for its absence**: the reader without the alias, the run without the var

⇒ there is no third option where the premise stays implicit.

## .the cues

| when… | then… |
|---|---|
| a design note says "every human does X" or "X is always set" | 🔴 the strongest cue. how does the repo know? |
| the premise names a shell alias, a dotfile, or `~` | a local fact. run the test |
| a test passes on your box and you cannot say why it would pass on ci | the box is a premise. find it |
| a test reads an env var or a home path it did not set itself | isolate it: a temp home, a cleared env |
| a precondition is real but unchecked | promote it: a check that fails loud, with the fix in the message |

## .the worked case — rhachet pr #600, v1.49.2

the split layout rested on one sentence in its design brief:

> every reader is an enrolled clone (`claude` is aliased to `rhx enroll claude`)

the alias lived on one box's shell. the design read it as a property of the repo, and dropped the
settings door a plain `claude` used. on any box without the alias — a new machine, an ide plugin, a
command that calls `claude` directly — a session in the repo loaded none of its settings, and no
output said so.

the repair took both moves: the layout now serves the reader without the alias (the
`settings.local.json` arrow), and the one premise that cannot be designed away — that `rhx init` has
run — is now a stated precondition (`define.invariant.rendered-boot-stays-out-of-git`).

## .the second case — the box leaks into a test

a real-claude acceptance test inherited the runner's env, and with it `CLAUDE_CODE_CHILD_SESSION` from
the session that launched the suite. the probe behaved differently under it than on a clean box — the
test's verdict was a fact about the runner, not the product (measured 2026-10-15). the cure: the test
now spawns with a temp home and the `CLAUDE*` vars dropped
(`rule.require.real-brain-tests-in-isolated-tempdir-and-home`).

## .the boundary

| a violation | not a violation |
|---|---|
| a design that silently does less when a local fact is absent | a stated precondition the repo checks, with a loud failure that names the fix |
| a test whose verdict depends on the host's env or home | a test that builds its own env and home |
| a premise in a design note with no check behind it | a premise the repo itself establishes (its own install step) |

## .enforcement

- a design or a test whose correct behavior rests on a local fact, unstated = **blocker**
- a stated precondition with no check that fails loud = **blocker**

## .see also

- `rule.require.reader-table-before-a-shape-change` — the reader without the local fact is a row
- `rule.forbid.host-specific-cures-in-hints` — the same defect, narrowed to an error hint
- `rule.require.clamp-the-premise-a-guard-rests-on` — the same demand for a premise in code
