# F11 — the repo anchor and a root `CLAUDE.md`

## .fork

the `agents-md` walk sits behind a remote flag — off on Bedrock, Vertex, Foundry, gateways,
telemetry-off, and the first session after an install (`3.1.1` E3, E4). an unenrolled clone that
reads only `AGENTS.md` boots on a switch we do not control.

| option | verdict |
|---|---|
| a. `<repo>/.claude/AGENTS.md` alone | ✅ **current** — the path is accepted as best-effort |
| b. + a root `<repo>/CLAUDE.md` that imports `.claude/boot.md` | ❌ a root file is the human's surface, and S2 avoids `CLAUDE.md` where possible |

## .verdict — SUPERSEDED by the vision's `.accepted`, and reopened narrower as Q2

- no root `CLAUDE.md` is authored.
- the flag-gate risk F11 named is real and now **measured**: the dogfood of 2026-09-23 had
  `AGENTS.md` + `boot.md` in place, and no `boot.md` content reached a fresh session.
- the narrower fix is blueprint **Q2**: `<repo>/.claude/CLAUDE.md` → `AGENTS.md`, a symlink inside
  our own brain dir, the same shape as the actor's (F7). the wisher's call.

## .grounds

- the enrolled path is unaffected under every branch: its corpus loads through the actor dir's
  `CLAUDE.md` link, engine-native (F7).

## .where

- vision `.accepted` · criteria usecase.4 · blueprint Q2 · `refs/howto.dogfood-brain-dir-boot.md`
