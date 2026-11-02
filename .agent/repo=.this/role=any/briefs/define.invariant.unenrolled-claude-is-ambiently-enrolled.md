# define.invariant.unenrolled-claude-is-ambiently-enrolled

## .what

a brain-cli that rhachet did not enroll — a plain `claude` at the repo root, no alias, no
`$CLAUDE_CONFIG_DIR` — is still enrolled, ambiently, by the repo: it loads the repo actor's roles, their
allows and their hooks, exactly as a clone of the repo actor would.

## .kind

**nurture.** claude would happily run a bare session with no roles at all. we chose that the repo, not
the launch path, decides what a session in it carries — because the launch path is the one thing a
human forgets.

## .invariant

```
session.cwd ∈ repo  ∧  session not enrolled by rhachet
  ⟹  session.settings ⊇ repo actor's settings.of.repo.json
```

and the dual, which `inventory.of=requirements.case=9` already holds:

```
session enrolled by rhachet as actor A  ⟹  session.hooks ⊆ hooks of A's roles
```

explicit enrollment narrows or swaps the roleset. its absence never empties it — it falls back to the
ambient roles (`term=ambient`).

## .why

- the alias `claude → rhx enroll claude` lives on a box, not in the repo. a new box, a new shell, an ide
  integration, or a command that calls `claude` directly all skip it
- without this, those sessions run with none of the repo's allows (every pre-approved command prompts)
  and none of its hooks (no permission guard, no boot notice) — and no output says so. a role's
  guardrails that hold only when the human remembers the alias are not guardrails
- the repo's own permission hooks already judge a plain session against `settings.of.repo.json`; a session
  that never loaded that file makes the judge and the judged disagree

## .scope

- covers **reads**: what a plain session loads. it does not promise where claude writes a plain
  session's "don't ask again" grant — claude decides that, and it silently refuses a local-layer write
  under a symlinked `<repo>/.claude` unless that dir is its config dir (measured on 2.1.292 by
  `blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` [case2 t1])
- covers sessions whose cwd is the repo (or a worktree of it). a session elsewhere is not in the repo
- does not loosen case 9: a clone enrolled with `-driver` still loads no driver hook
- holds from the first `rhx init` on, never from the checkout alone: init renders `boot.md` and links
  the roles, so it is mandatory before the ambient repo actor is reachable
  (`define.invariant.rendered-boot-stays-out-of-git`). `prepare:rhachet` runs it on each install

## .the litigation

the case against: every reader is an enrolled clone, because `claude` is aliased to `rhx enroll
claude`; clones spawn with user-only config sources plus `--settings`, so the local layer has no reader
and needs no name.

what settles it: the alias is a fact about one box's shell, never about the repo. an ide, a ci job, a
fresh box, or a human with no alias launches a plain `claude`, and on a layout with no local arrow that
session loads none of the ambient roles (measured downstream; `inventory.of=requirements.case=10`). so
the repo enrolls whoever arrives, and explicit enrollment only refines that
(`rule.forbid.local-facts-as-design-premises`).

## .the counter-argument

a plain `claude` is the human's escape hatch: a session with no repo opinions, for when the roles get in
the way. to make it ambiently enrolled removes the hatch.

the answer: the hatch still exists, explicitly — a launch from outside the repo, or an enroll with a
roleset that subtracts. an escape that one reaches by accident (a forgotten alias) is a hole, not a hatch.

## .what would overturn it

evidence that sessions launched outside rhachet are, in practice, deliberate opt-outs rather than
forgotten aliases — or that claude grows a native, repo-declared default roleset that makes the arrow
redundant.

## .enforcement

- a layout in which a plain session at the repo root loads none of `settings.of.repo.json` = **blocker**
- a design that assumes every session is enrolled by rhachet = **blocker**

## .clamp

proven — `inventory.of=requirements.case=10.plain-claude-loads-repo-settings.md`.

## .see also

- `define.brain-dir-layout-is-one-for-every-actor` — the layout this invariant constrains
- `inventory.of=requirements.case=9.clone-loads-only-its-roles-hooks.md` — the dual
- `catalog.of=actor-clone-design._.md` — an everyday `claude` is a clone of the repo actor
