# fulcrum F29 — a clone's transcript identity is ASSIGNABLE, and six operations guess it instead

**arose:** 5.3.verification, r002 (repo-rules-artifacts) blocker.3
**rework:** dirty · **status:** DEFERRED (dreamed) · **confidence:** 95%

## the fork, stated fairly

r002 blocker.3 demanded items 3 + 4 of the mtime dream, or a ground per item. an honest answer to
item 3 required a discriminator that tells *our* transcript from a co-located peer's — and one
`claude --help` read found it:

```
--session-id <uuid>   Use a specific session ID for the conversation (must be a valid UUID)
```

⇒ measured 2026-09-18: the transcript filename IS the assigned uuid, and it is created **at spawn**,
before any turn, **even when the run fails** (probed in a credential-less temp `CLAUDE_CONFIG_DIR`).

- **option A (shipped):** keep the discovery heuristic. `birthtime` narrows candidacy (landed
  2026-09-17), the `.exids/` claim serializes the election, the ambiguous-refuse quarantines a tie,
  and `exidsForeign` refuses an out-of-window link at read time.
- **option B (the find):** ASSIGN the exid at spawn and link it by the record. six operations —
  `getAllEligibleTranscriptCandidates` · `genAtomicSymlinkClaim` · `isTranscriptWithinSpawnWindow` ·
  `getAmbiguousExidsWithinSpawnWindow` · `exidsForeign` · `exidsAmbiguous` — exist only to guess
  what B knows, so B retires or demotes all of them.

## what was taken, and why

**option A holds this round; option B is dreamed with its measurement, its fix shape, and its two
unmeasured premises.** the deferral rests on the SAFE/CLEAN test, and it fails both halves:

1. **not safe** — transcript identity is the input to `get`, to `say`'s `released` verdict, and to
   `prune`. a wrong move gives every clone an empty history, and an empty history reads as a deaf
   clone — the exact failure mode this wish exists to report correctly.
2. **not clean** — it ripples into the spawn argv, the clone record shape, the stub brain
   (`rule.require.a-stub-refuses-what-its-subject-refuses`), and the test corpus of six operations
   whose every fixture encodes the discovery contract.
3. **out of scope** — `0.wish.md` is `clone say`'s verdict set. this is the *identity* of a clone's
   transcript, which that wish consumes and does not define.

⇒ and unlike F10, the deferral's own gate was CHECKED before it shipped: the `--help` read cost one
command and is recorded, so the next traveller inherits the find rather than the guess.

## the two premises option B still rests on

each is one `-p` run, and neither is measured — so they belong to B's PR, not to this stone:

- **a collision** — does `--session-id` on an extant id RESUME that session, refuse, or overwrite? a
  clone must never resume a stranger's conversation, so the answer decides whether the uuid needs a
  claim of its own.
- **a non-claude brain** — the flag is claude's; `getBrainTranscriptDir` already returns `null` for a
  brain with no known layout, so the fallback seam exists and is untested for this use.

## what this settles about the mtime dream's items

| item | disposition |
|---|---|
| 1 — read creation, never the correlate | ✅ **cured 2026-09-17**, clamped red at unit + integration |
| 2 — exclude the enroller's own session | **superseded by B** — B identifies ours positively, so an exclusion list is unnecessary |
| 3 — re-arm the refusal at `length === 1` | 🔴 **its stated cure is a regression** — with no discriminator a blanket refusal empties every clone's history. superseded by B |
| 4 — the `🎧` false-provenance glyph | ✅ **cured in this stone** by the `exidsForeign` read gate |

⇒ item 4's cure is at the TRANSCRIPT grain, which is the only grain where authorship data exists:
`direction` derives from `record.type` (`assistant` → `out`, `user` → `in`,
`asCloneMessage.ts:93-101`), so within one in-window transcript every assistant record IS that
session's own reply. the false `🎧` came entirely from a wrong file, and `getCloneOutput.ts:63-75`
now refuses a foreign one at read time and reports it as `exidsForeign`.

## confidence, and why high (95%)

the DIRECTION is measured rather than argued — the flag exists, and the filename is the id. the 5%
is on whether B can retire the heuristic outright or must keep it as a per-brain fallback, which the
non-claude premise decides.

## where

`genCloneHistoryLink.ts:60-96` (the election) · `isTranscriptWithinSpawnWindow.ts` (the window) ·
`getCloneOutput.ts:63-75` (the read-time refusal) · `getBrainTranscriptDir.ts:22-32` (the per-brain
seam B's fallback would use).

## the verdict, once ruled

open. the dream is `.dream/2026_09_18.a-clone-can-assign-its-own-transcript-id-rather-than-guess-it.dream.md`,
symlinked at `dreams/` in this route.
