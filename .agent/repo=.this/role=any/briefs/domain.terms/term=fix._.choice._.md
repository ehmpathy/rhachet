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

## .what

the concrete next move a human takes to recover — the third beat of a helpful failure,
after **what** went wrong and **why**.

## .refs

declared:
- src/domain.objects/keyrack/KeyrackGrantAttempt.ts   # `fix?: string`, on all three not-granted variants

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

## .reason

see the ref-level cluster beside this choice:
- `term=fix._.choice.reason.md` — etymology, the three-way collision, the open dispute
