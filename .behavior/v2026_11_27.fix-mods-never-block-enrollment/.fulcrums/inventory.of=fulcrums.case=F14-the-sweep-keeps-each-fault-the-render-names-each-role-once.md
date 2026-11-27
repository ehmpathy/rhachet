# F14 — the stop sweep keeps each fault; the render readout names each role once

- **fork**:
  - (a) share one first-per-role dedupe between the render readout and the stop sweep
  - (b) keep the dedupe in the render readout alone
- **taken**: (b).
  - The render readout names a role once, because the role boots as published once. One render may name a role twice, when two linked roles of one slug share a mod.
  - The sweep walks each mod slug once, and each mod yields at most one fault. A refusal ends that mod's walk; otherwise its one `assertRoleModAppliable` call throws at most once.
  - The sweep repeats a role in one case only: two orphan views of one role slug, from two repos, each with a corrupt record. Those are two records, and each needs its own cure. A dedupe there would hide one of them.
- **rework**: clean. A shared transformer is one new file and two call sites.
- **confidence**: 85%
- **where**: `src/domain.operations/mods/asRoleModViewsChangedReadout.ts` (`asFaultsFirstPerRole`), `src/domain.operations/mods/getAllRoleModFaultsOfRepo.ts`
- **raised by**: i004 r011 nitpick.4 (enroll-impl-arch-defects)
