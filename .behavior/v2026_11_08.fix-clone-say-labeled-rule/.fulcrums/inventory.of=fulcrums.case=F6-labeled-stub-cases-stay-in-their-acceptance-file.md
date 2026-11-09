# F6 — the labeled-box stub cases stay in their acceptance file

## .the fork

four 5.3 peer lanes (`repo-rules`, `ergo-contract-snapshots`, `mech-external-contracts`,
`mech-test-scope-purity`) note that `[case17]`–`[case17f]` drive a stub brain-cli inside a
`*.acceptance.test.ts`. `rule.forbid.faked-or-quarantined-acceptance` names a stub-driven
acceptance file an integration test with the wrong label.

- **A** — keep the six cases in `clone.say.delivered.acceptance.test.ts`, beside its extant
  stub-driven siblings, with the stub declared inline (`.mock / .why / .real`) and the real-brain
  cell owned by F5 (ehmpathy/rhachet#738)
- **B** — move the six cases to a new `blackbox/cli/clone.say.labeled.integration.test.ts`
- **C** — reclassify every stub-driven case in the clone cli suites to the integration grain

## .taken, and why at the time

A. every case in `clone.say.delivered.acceptance.test.ts` on `origin/main` drives the same stub
(`setupRichStubBrainPath`), and so do its peer files (`clone.say.withheld`, `clone.acceptance`).
the six new cases follow the file they sit in. **B** splits one contract surface across two grains
on the basis of when a case was written, not what it proves; a reader would find the labeled box
in an integration file and the plain box in an acceptance file, for the same `say`. **C** is the
real cure for the label mismatch and a repo-wide move of the clone cli suites — far past a nano fix
whose done-list is a clamp plus a pr green on ci. the stub is now declared inline in the rule's
form, so the substitution is visible where it is used.

## .rework

clean — a later reclassification moves whole `given` blocks between files and renames snapshot
keys. no prod code leans on the file a test lives in.

## .risk

low — the label alone is wrong; every case still runs in the default gate on every pr, against the
real `rhx` binary, socket and pty. the seam the stub hides (does a real claude draw this shape?) is
F5's, and it fails closed: an unparsed shape withholds the say.

## .confidence — 70%, and why it is not higher

the repo's own rules say a stub-driven case is not acceptance, and four lanes agree. the wisher may
prefer **B** now for the new cases, or a dedicated pr for **C**.

## .where

- `blackbox/cli/clone.say.delivered.acceptance.test.ts` (`[case17]`–`[case17f]`, the inline `.mock` note)
- `.agent/repo=.this/role=any/briefs/rule.forbid.faked-or-quarantined-acceptance.md`
