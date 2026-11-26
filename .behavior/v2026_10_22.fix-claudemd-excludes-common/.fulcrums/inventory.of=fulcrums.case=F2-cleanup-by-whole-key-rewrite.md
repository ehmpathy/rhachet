# F2 — cleanup by whole-key rewrite

- fork: rewrite `claudeMdExcludes` whole (extant) · filter only home-path literals rhachet wrote, keep others
- taken: whole rewrite. it is the extant contract, it makes cleanup and idempotence true by
  construction, and the brain-dir brief settles "one answer, rhachet's" for this file
- rework: clean — a filter transformer could be added in front of the write
- confidence low because: the wish says "an entry that rhachet itself wrote is removed", which reads
  as though hand entries might survive; today none survive either
- the drop is never silent: `rhx init --hooks` names each entry it dropped beneath the actor row
  (`claudeMdExcludes dropped <path>`), a hand-added entry included, so a human who wants one back
  sees which, and a role or a pr is where it belongs
- where: `src/domain.operations/enroll/genBrainCliConfigArtifact.ts`
- verdict: —
