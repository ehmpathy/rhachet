# fulcrum F004 — the repo actor's brain dir tracks the `settings.grove.json` arrow

## .the concern

`behavior-intent-coverage-src` nitpick.1 (r015, i004.e7bc94af): the brain dir `.gitignore` is an
allowlist that tracks `settings.grove.json`, while the vision's first draft said the grove arrow is
gitignored.

## .the facts

- the vision line predates the wisher's call of 2026-09-29, which tracks the settings names in the
  repo actor's brain dir
- that call is recorded where a reader of the layout looks: `define.brain-dir-repo-vs-actor`
  (*"re-include `.gitignore`, `AGENTS.md`, the `CLAUDE.md` symlink, and
  `settings.{,repo,grove,local}.json`"*), and the `.note` on `BRAIN_DIR_GITIGNORE_LINES`
- the arrow's target is `~/.claude/settings.json`, which resolves in the home of whoever reads it, so
  a tracked arrow points each teammate at their own grove
- only the repo actor's brain dir is visible to git; every other actor dir is ignored whole

## .why it is fine to continue

the code follows the wisher's later call, and the briefs record it. to ignore the arrow would undo a
decision the wisher made, which a review may not do alone (`rule.forbid.dropped-behavioral-requirements`:
only the wisher amends what a requirement asks).

## .what the council decides

whether the wisher's 2026-09-29 call stands (the arrow tracked), or the vision's first draft returns
(the arrow ignored). the driver holds the former.
