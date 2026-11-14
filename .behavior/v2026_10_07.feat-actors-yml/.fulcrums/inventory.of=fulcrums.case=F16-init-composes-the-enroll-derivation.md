# F16 — init composes enroll's actor derivation, rather than a copy of it

- **fork** — `init/boots/setDeclaredActorsOndisk` must render a declared actor's dir the way `rhx clone @x` would. (a) call the enroll-domain transformer `asActorFormEnrollment` (which composes `computeBrainCliEnrollment`) · (b) lift the derivation into a neutral domain both `init` and `enroll` import · (c) a second derivation inside `init/boots`
- **taken** — (a). one derivation path is the invariant: an actor dir that `init` writes must equal the dir `rhx clone @x +role` would write, and two code paths are two chances to drift (`rule.forbid.per-clone-config`'s sync invariant). `init/boots` already composes enroll's rederive ops on main — `setDeltaActorsOndisk`, `setActorSettingsDerived`, `asDeltaActorOutcomes` — so (a) adds no new direction of dependency. (b) is the tidier shape, but it moves `computeBrainCliEnrollment` and its peers out of `enroll/`, a refactor across files this change does not otherwise touch. (c) is the drift the invariant forbids
- **rework** — clean — (b) is a file move plus import edits, with no behavior change
- **confidence** — 80% that (a) holds for this change; (b) is a fair later move
- **where** — `src/domain.operations/init/boots/setDeclaredActorsOndisk.ts` → `src/domain.operations/enroll/asActorFormEnrollment.ts`; raised by arch-smell-scopeleaks blocker.5
- **verdict** — unruled; best guess taken
