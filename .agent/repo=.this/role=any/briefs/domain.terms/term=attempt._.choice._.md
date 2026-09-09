# domain.term: attempt

term.chosen   = attempt
term.kind     = noun
term.synonyms.forbidden:
- result
- outcome
- response
- resolution

## .what
the envelope a keyrack read returns for ONE slug — it carries either the grant or the reason
there is none, so every outcome is the same shape and none can be dropped.

## .refs
- src/domain.objects/keyrack/KeyrackGrantAttempt.ts   # the domain object
- src/domain.operations/keyrack/asResolvedAttempt.ts
- src/domain.operations/keyrack/asKeyrackAttemptSlug.ts
- src/domain.operations/keyrack/cli/getAllKeyrackAttemptsForOrg.ts
- src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants.ts

## .reason
see the ref-level cluster beside this choice:
- `term=attempt._.choice.reason.md` — etymology, disputes, evidence
