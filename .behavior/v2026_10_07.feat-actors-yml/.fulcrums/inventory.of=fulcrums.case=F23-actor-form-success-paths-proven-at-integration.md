# F23 — the actor form's success paths are proven at the integration grain, not snapped at acceptance

- **fork** — enroll-impl-behavior-intent (i004) asks for acceptance snaps of every success path
  (`clone @solo`, `+architect`, `--brain`, `--as @:sentry`, `enroll @spare`, a bare enroll), an
  end-to-end tether through a `'@pkg/slug'` base, and a bad manifest met at enroll. (a) add them
  at acceptance, each a real brain-cli spawn · (b) prove the derivation at integration, snap the
  refusals, and leave the spawn to the extant enroll acceptance suites
- **taken** — (b). each success path differs from main's enroll only in what it derives — brain,
  roles, exid — and `enroll.actors-yml.integration.test.ts` asserts that derivation per form, with
  the refusals snapped. the spawn after it is main's spawn, already held by `enroll.acceptance`.
  a real spawn per form costs a brain session each (`rule.allow.acceptance-spawns-real-brain-cli`
  permits, never requires), and the tether's expansion is a pure function held at unit grain
  (`getActorExpanded.test.ts`, `getOneActorExpandedOfRepo.integration.test.ts`). the bad-manifest
  case is refused at init now — a typo role and an unknown key both stop `init` before any write —
  so a repo with a broken manifest does not reach enroll through `pnpm install`
- **rework** — clean — new acceptance cases, no change to code
- **confidence** — 70%; the wisher may want the success stdout on review, and that is a real ask
- **where** — raised by enroll-impl-behavior-intent nitpick.2, .3, .4 (i004)
- **verdict** — ruled 2026-11-14 by the director: take the guess. the success paths stay proven at integration, the refusals snapped
