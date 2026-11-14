# F25 — a role focus (`role::subject`) in `actors.yml` is refused, with a named hint

- **fork** — two i005 reviewers find that `init --roles mechanic::flow` has no manifest form:
  `--roles` is refused beside a manifest, and a `ehmpathy/mechanic::flow` entry in `actors.yml`
  failed as "no installed role package carries" it (enroll-impl-behavior-intent blocker.4,
  enroll-impl-arch-defects nitpick.9). (a) support a focus in a role entry, recorded as the
  ambient focus · (b) refuse `::` in `asActorDeclared` with a hint that names the per-clone path
- **taken** — (b).
  - neither the wish nor the vision mentions foci, so support is a scope call for the wisher
  - the defect both reviewers name is the false text, and (b) cures it: the refusal names the
    entry, says the manifest does not support a focus yet, and points to
    `rhx enroll <brain> --roles <role::subject>`, which still focuses a clone
  - (b) is a strict subset of (a): a later change that supports a focus removes one refusal
- **rework** — clean — a focus parse in `asActorDeclared` (via `asRoleFocusParts`), and a write
  of the ambient actor's focus record in the declared sweep
- **confidence** — 70%; a repo that relies on an ambient focus today cannot adopt `actors.yml`
  until (a) lands, and the wisher may rule that a blocker to adoption
- **where** — `asActorDeclared.ts`; proven by `asActorsManifest.test.ts` and
  `init.actors-yml.acceptance.test.ts` case8 `[t12]`
- **verdict** — unruled; **needs the wisher** to rule whether foci join `actors.yml`
