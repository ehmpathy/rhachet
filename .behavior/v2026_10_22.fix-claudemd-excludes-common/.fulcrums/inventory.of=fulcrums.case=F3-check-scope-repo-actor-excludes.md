# F3 — where the machine-name check runs

- fork: a runtime refusal in the writer · a test over what the writer produces · both
- taken: a test. it runs the one writer for the repo actor from a file with two foreign homes,
  scans the written file under the real machine's home/user/host and every home shape, then
  re-writes under another HOME and asserts identical bytes; a second test scans this repo's own
  committed file and its tracked link targets. the wish asks that "a regression fails a test, not
  a review"
- why not a runtime refusal: `claude` is aliased to `rhx enroll claude`, so a refusal that ever
  misfired would block every launch on every box. the harm of a leak (a path in git) is far smaller
  than the harm of a dead `claude`
- rework: clean — the same transformer can be called from the writer later
- confidence low because: "a check that fails loud" could be read as a runtime check
- where: `src/.test/infra/getAllMachineNamesInText.ts` + its unit test;
  `genBrainCliConfigArtifact.integration.test.ts` `[case8]`;
  `src/.test/committedConfigNamesNoMachine.integration.test.ts`
- verdict: —
