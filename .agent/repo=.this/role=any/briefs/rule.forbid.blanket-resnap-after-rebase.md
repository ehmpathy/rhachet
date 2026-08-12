# rule.forbid.blanket-resnap-after-rebase

## .what

when a rebase produces a wall of snapshot failures, **read every diff and name its cause before
you run `--resnap`**. a blanket resnap of an unclassified failure set is forbidden.

a resnap is a bulk overwrite of the only evidence you have. run it before you understand the
diffs and you destroy the record you would have needed to tell a stale snapshot from a real one.

## .why

a rebase mixes two kinds of failure that are **visually indistinguishable** in a jest diff:

| kind | what happened | correct action |
|------|---------------|----------------|
| **branch-stale** | main moved; your snapshot predates it | resnap |
| **regression** | main's change silently degraded your branch's behavior | fix the code |

`--resnap` "fixes" both. the second then ships as a green suite, and the branch's stated
guarantee is gone with no signal that it left.

this is not hypothetical. on `beav/feat-keyrack-unlock-scope` a rebase onto main produced **29
acceptance failures across 12 suites**. twenty-eight were staleness. exactly **one** was a real
regression: main's new per-key fault isolation in the unlock batch caught a `ConstraintError`
and re-rendered a stderr blocked-tree as a stdout `errored 💥` row. **the exit code stayed
correct (2)**, so no other check in the repo would have caught it. a blanket resnap would have
locked the degraded render in as the new truth.

## .the tell

> watch for a diff where content only **MOVED** — stream, glyph, position — rather than changed.

that is the shape a silent behavior regression takes. the words are the same, so the eye reads
"cosmetic"; the stream or the severity glyph is what actually shifted, and those carry the
contract. in the case above the message text was **byte-identical** on both sides — only the
stream (stderr → stdout) and the glyph (`✋ blocked` → `errored 💥`) had moved.

## .how

1. **classify every failure into a named class before you touch a snapshot.** a class you
   cannot name is a diff you have not understood.
2. **ask of each: did MY side change, or did THEIRS?** two commands answer it —
   `git diff origin/main -- <file>` (is the file mine?) and `git show origin/main:<file>`
   (what does theirs emit?).
3. **fix the code for a regression, and add an ASSERTION that names the invariant** — not just
   a refreshed snapshot. a snapshot pair reports the drift as one anonymous diff; an assertion
   reports *why* it is wrong, so the next traveler reads the reason instead of a re-derivation
   of it.
4. **resnap only once the classification is complete.**
5. **re-run WITHOUT `--resnap`** to verify independently
   (`rule.require.snapshot-verified-on-independent-run`).

## .the opposite defect — a SCOPED resnap that is too narrow

the rule above guards a resnap that is too **broad**. the twin defect is a resnap too **narrow**, and
it hides in a different place: a scoped `--resnap` refreshes the suites you named and leaves every
other consumer of the same render stale.

> **scope a resnap by the RENDER'S CONSUMERS — derived from a grep for the rendered text — never by
> the list a reviewer reported, and never by filename resemblance.**

a reviewer reports **what it found**. a resnap owes **what exists**. those are different sets, and
the gap between them is exactly the set that goes red on someone else's machine.

lived case (2026-08-10): a one-line fix to `keyrack del`'s header was resnapped against the two
suites a reviewer had named. the render is embedded in **four**:

```bash
rg "🔐 keyrack del" blackbox/ -l    # ← the authoritative scope, always
```

the two unnamed suites failed on the next full run. the tell that it was a stale snapshot rather
than a regression: `- Snapshot - 1 / + Received + 0`, and the **semantic** assertion beside it
(*"the CLI echoes that the SSM secret was destroyed"*) still passed.

⚠️ **no classification would have caught this** — the missed suites were never in the failure set to
classify. what caught it was step 5 below: the re-run **without** `--resnap`. that step is not a
formality; it is the only check that sees a snapshot the resnap never visited.

## .enforcement

- a `--resnap` over an unclassified failure set = **blocker**
- a scoped `--resnap` whose scope was not derived from a grep of the rendered text = **blocker**
- a snapshot change with no recorded rationale = **blocker** (the verification stone's
  rationalization table is where it goes)
- a regression fixed by a snapshot refresh alone, with no assertion that names the invariant =
  **blocker**

## .see also

- `rule.require.snapshot-verified-on-independent-run` — the re-run that proves the resnap held
- `rule.require.clamp-edge-cases` — a fix owes a clamp that BITES; the same discipline, applied
  to a defect rather than to a snapshot wall
- `rule.require.keyrack-emoji-palette` — the glyph contract a "cosmetic" diff can quietly break
