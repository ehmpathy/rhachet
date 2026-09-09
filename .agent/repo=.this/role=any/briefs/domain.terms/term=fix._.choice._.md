# domain.term: fix

term.chosen   = fix
term.kind     = noun
term.synonyms.forbidden:
- remedy
- suggestion
- advice
- guidance
- recommendation

term.synonyms.disputed:            # ⚠️ LIVE in contracts today — see `.reason`
- hint                             # error-metadata carrier AND the blocked-tree render label
- tip                              # cli render label (get/status branches)

term.siblings:                     # the OTHER beats of a helpful failure — peers, never synonyms
- why                              # beat 2, the cause. rendered `why:`; carried as `note` metadata
                                   # ⚠️ `note` is NOT a fourth synonym of `fix` — it carries a
                                   #    DIFFERENT beat. a remedy filed under `note` renders as
                                   #    `why:`, i.e. a command labelled as a rationale. proven by
                                   #    defect 2026-09-04 — see `.reason`

## .what

the concrete next move a human takes to recover — the third beat of a helpful failure,
after **what** went wrong and **why**.

## .refs

declared:
- src/domain.objects/keyrack/KeyrackGrantAttempt.ts   # `fix?: string`, on all three not-granted variants
- src/domain.operations/keyrack/cli/getAllKeyrackPeerEnvsForFix.ts
                                                      # ⚠️ the ADHERENCE precedent: this operation
                                                      #    was first named `…ForHint`, and renamed
                                                      #    to the canonical term. while a dispute
                                                      #    is OPEN, a NEW contract takes the
                                                      #    canonical word — so the sprawl stops
                                                      #    where it stands even before the extant
                                                      #    sites below are reconciled

the canon that names it:
- .agent/repo=ehmpathy/role=ergonomist/briefs/fundamentals/rule.require.errors-name-the-fix.md

the two live synonyms (⚠️ not reconciled — see `.reason`):
- src/domain.operations/keyrack/cli/emitKeyrackKeyBranch.ts        # `tip` on the render union
- src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput.ts   # `tip: attempt.fix ?? null`
- src/domain.operations/keyrack/assertKeyrackExportNamesDistinct.ts # `hints` on the input contract
- src/domain.operations/keyrack/getKeyrackBlockedReport.ts         # ⚠️ reads BOTH `hint` and `fix`,
                                                                   #    and renders beat 2 as `why:`
                                                                   #    beside beat 3 as `hint:`
                                                                   #    (2026-08-10 — see `.reason`)

the beat-2/beat-3 split, conformed 2026-09-04 (both twins of one guard, moved off `note`):
- src/contract/cli/invokeKeyrack.ts                                 # `:1921` sudo guard → `hint`
- src/domain.operations/keyrack/session/getAllKeyrackSlugsForUnlock.ts # `:58` its sdk twin → `hint`

the CONTENT test, settled 2026-09-05 — a fix names a **runnable command**, never an artifact to
hand-author. two sites carried one remedy ("this repo has no keyrack.yml; make one") and only one
of them passed:
- src/domain.operations/keyrack/asKeyrackFilterOrg.ts               # `:54` the precedent —
                                                                    #   `run: rhx keyrack init --org <your-org>`
- src/domain.operations/keyrack/getAllKeyrackGrantsByRepo.ts        # conformed to it. the prior
                                                                    #   text named a FILE and left
                                                                    #   its schema to guesswork,
                                                                    #   which describes the goal
                                                                    #   rather than a step to it

## .reason

see the ref-level cluster beside this choice:
- `term=fix._.choice.reason.md` — etymology, the three-way collision, the open dispute
