# seed S5 — always exclude `~/.claude/CLAUDE.md`

## .said (2026-10-16)
> defo exclude ~/.claude/CLAUDE.md always

> and clamp that

> we dont want global surprise leakage to impact repos and create unreproducable environments

(the question it answers: once a plain `claude` reads `settings.of.repo.json` through the local arrow,
that file's `claudeMdExcludes` — written by enroll — drops the human's `~/.claude/CLAUDE.md` from a
plain session too. keep that, or carve it out?)

## .settled
- the human's `~/.claude/CLAUDE.md` is never loaded in a session in the repo — a plain `claude` and an
  enrolled clone alike
- "always" means the exclude holds from `rhx init` on, never only after an enroll has run
- the exclude is clamped by a real claude
- why: a session's context in a repo must be reproducible from the repo; a box-global CLAUDE.md is a
  surprise leak that makes two boxes behave differently on one commit

## .landed
- `define.invariant.brain-config-grove-vs-repo` — criterion (6)
- `blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` — the home CLAUDE.md clamp
