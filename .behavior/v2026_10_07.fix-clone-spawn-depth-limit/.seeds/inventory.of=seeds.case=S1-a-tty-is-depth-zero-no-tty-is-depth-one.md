# seed S1 — a tty is depth 0; no tty is depth 1

## .said

> same as top level rhx enroll
>
> if its got its own terminal or tmux pane, its `rhx enroll` depth = 0
>
> just like a raw claude

(on Q7a, the launch terminal: `printf '%s\n' "$RHACHET_CLONE_DEPTH"` printed an empty line)

> yeah, it should have depth 1 if run with TTY=0; i.e., if its not a TTY, then its depth=1

(on Q8, whether a human's own `rhx review` brain is depth 1)

> good catch

## .settled

- a clone a human starts at a terminal or tmux pane — via `rhx enroll` or a raw `claude` — is
  top-level: depth 0, whatever env that pane inherited.
- a spawn that runs with no tty is never top-level: it is at least depth 1. an absent depth var
  on a no-tty caller counts as a depth-0 caller, so its child is depth 1.
- a review brain is a spawn, never top-level: a human's own `rhx review` mints its brain at depth 1.

## .landed

- `1.vision.yield.md`
- `1.vision.experience.dimensions.md`
- `1.vision.experience.case=_.md`
- `1.vision.experience.case=7.raw-claude-reviewers-are-depth-one.md`
