# F17 — where the corpus record lives

## .fork

a drift guard compared a corpus to a record of the last sanctioned render. where did the record live?

| branch | shape |
|---|---|
| a. a sidecar | `AGENTS.md` + `AGENTS.md.sha256` — two writes, a torn pair under concurrent renders |
| b. a content address | `.corpus/<digest>.md` under an `AGENTS.md` symlink — one atomic swap |

## .verdict — VOID (F21)

there is no drift guard, so there is no record. the design holds one rendered file, `boot.md`,
beside a one-line `AGENTS.md`.

## .grounds

- F21 deleted the guard, and with it the only reader of a record.
- the race (b) closed was a two-file race. with one rendered file it cannot arise: `boot.md` is
  written temp + rename, the pattern `genBrainCliConfigArtifact.ts:92-95` already uses, so a
  concurrent reader sees the old bytes or the new, never a mix.
- byte-determinism needs no digest in a path: sorted roles, sorted files, no stats (D2).

## .where

- blueprint D2, `setBrainDirBoot` · F21
- dream `v2026_09_23.chore.reap-unreferenced-corpus-bodies` is void with it — no `.corpus/` dir exists
