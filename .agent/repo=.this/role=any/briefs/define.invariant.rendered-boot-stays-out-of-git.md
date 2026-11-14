# define.invariant.rendered-boot-stays-out-of-git

## .what

the rendered `boot.md` is never tracked, in any actor dir — the repo actor's included. `rhx init`
renders it; the door to it (`AGENTS.md`, `@boot.md`) is tracked.

⇒ **`rhx init` is mandatory before any actor is reachable, the ambient repo actor included.** a
checkout alone holds the repo actor's settings and doors, never a usable actor.

## .kind

**nurture.** git would hold it fine. we chose not to, because a tracked render churns.

## .invariant

```
∀ actor dir:   boot.md ∉ git
repo actor:    AGENTS.md, settings.of.repo.json, the arrows ∈ git
actor usable   ⟸  rhx init  (prepare:rhachet on each install)
```

## .why

- **churn** — `boot.md` derives from the installed role packages. every role upgrade, every
  `rhx init --roles` re-renders it, often by hundreds of lines. tracked, each lands as a diff no human
  authored and no reviewer can read, and buries the diff that matters
- **a render is a derivative, not a source** — the sources (the role packages, `boot.yml`, the
  `prepare:rhachet` roleset) are already tracked or pinned. a second, rendered copy can only drift
  from them
- **box drift** — a render that differs by one byte between boxes flips back and forth in git, one
  commit per box
- **init is owed anyway** — the boot is not the only derived piece. the `.agent/repo=*` role links the
  hooks and skills run through are made by `rhx init` too, so a tracked boot would not make an
  uninstalled checkout usable; it would only make it look usable

## .scope

- covers the rendered corpus only. the repo actor's settings and arrows are tracked
- the cost it accepts: a checkout before its first install, or a ci run (`prepare` skips under `$CI`),
  has no usable actor. a plain `claude` there loads the tracked settings, whose hooks reach unlinked
  skills, and no ambient briefs (`define.invariant.unenrolled-claude-is-ambiently-enrolled`)

## .the litigation

the case for a tracked `boot.md`: ambient enrollment would then reach a plain `claude` in a fresh
checkout, before any install.

the case against, which settles it: every role upgrade would churn the render through git; the install
hook already renders it; and the role links need `rhx init` regardless, so a tracked render would still
point at absent skills. init is the precondition, stated, and the render stays derived.

## .the counter-argument

a fresh checkout's first plain session, before any install, misses the ambient roles, and no output
says so.

the answer: a rhachet repo is installed before it is worked in, and `prepare:rhachet` runs init on
that install; the window is one command. a churned render costs every upgrade, forever.

## .what would overturn it

a render that is stable across role upgrades (so a tracked copy rarely changes) together with role
links that need no init, or evidence that sessions in uninstalled checkouts are common enough to
matter.

## .enforcement

- a tracked `boot.md`, in any actor dir = **blocker**
- a brain dir `.gitignore` that re-includes `boot.md` = **blocker**
- a design that assumes an actor is usable from a checkout with no `rhx init` = **blocker**

## .clamp

- `src/domain.operations/init/boots/setRepoActorBrainDir.ts` — the allowlist omits `boot.md` and the
  retired lines drop any re-include
- `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` — git ignores `boot.md`, and it is never
  addable

## .see also

- `define.brain-dir-repo-vs-actor` — the allowlist this holds
- `define.invariant.unenrolled-claude-is-ambiently-enrolled` — the cost, from the reader's side
