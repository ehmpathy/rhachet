# F002 — the clamp removed its own leak-on-purpose dirs, beyond the granted "count" bound

## .the fork

behavior-intent-coverage, repo-rules: `rule.forbid.reads-outside-the-repo`'s one exception grants
the clamp "a count of entries, never their contents". the clamp's `delDirsOfSlug` also enumerated
names and removed dirs there, after two cases that leak on purpose (the hooks-removed control, the
`TEST_FNS_KEEP` hold).

the two options first weighed:

1. widen the exception to name the removal — a grant only the human holds
2. drop the delete, and let ~12 dirs per clamp run fall to the 24h age gate — within bound, but a
   full run then leaves residue, against the wish's own acceptance

## .taken — a third option, inside the granted bound

the clamp removes no dir itself; each leak goes to test-fns' own run-stamped reclaim:

- **the control** runs no setup, so its workers inherit the clamp run's `TEST_FNS_RUN` and stamp
  their dirs with it. the clamp run's own teardown reclaims them. a new `then` asserts all 6 carry
  that stamp, so a change that breaks the inherit fails loud
- **the hold** reports its run id; the clamp releases it to `test-fns/autoprune.teardown.jest`
  under that id, which reclaims the dirs AND the `held` marker (the old delete left the marker)

## .rework

clean — one test file and the rule row, which reverts to exactly what was granted.

## .confidence

95%. measured 2026-11-22: full clamp 22/22; the next run reported no arrears for the prior one, so
both reclaims landed.

## .verdict

settled by the driver, by reason: option 3 keeps the grant as given and leaves zero residue. no
human call owed.
