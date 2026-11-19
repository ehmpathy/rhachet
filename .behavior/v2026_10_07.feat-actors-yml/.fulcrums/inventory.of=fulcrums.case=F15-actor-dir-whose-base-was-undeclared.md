# F15 — an actor dir whose base slug is no longer in actors.yml

- **fork** — a `slug=<x>` or `slug=<x>._.delta=<h>` dir stays on disk after `<x>` is removed from `.agent/actors.yml`. at `init`: (a) leave it as it was, in silence · (b) leave it as it was, and name it in the drift report with its fix (`rhx clone prune`, or re-declare `<x>`) · (c) delete it
- **taken** — (b). (c) is out: the dir holds live clones, and only `prune` may reap (`define.invariant.clone-prune-safety`). (a) left a change silent, which the drift report exists to prevent. a peer reviewer (repo-rules, blocker.4) graded the silence a deferral of small, clean work in a file this change already opens, so (b) was built
- **rework** — clean — one row in `asActorsDriftReportLines` (`actor dirs → kept, slug undeclared`), fed by `asActorExidsUndeclared` over `getAllActorExidsOndisk`
- **confidence** — 85% that (b) is what the wisher picks
- **where** — `src/domain.operations/actor/manifest/getActorsManifestLinkPlan.ts`, `asActorsDriftReportLines.ts`; proof `blackbox/cli/init.actors-yml.acceptance.test.ts` [case7], `getActorsDrift.test.ts` [case4]
- **the parse beneath it** — on main, `asActorOndiskExidFromDirName` read `actor.via.slug=<x>` as
  `null` ("enroll never mints it"). `actors.yml` now mints such dirs, so the parser reads them. it
  has four consumers. none filters by the declared set except the drift report, on purpose:

  | consumer | an undeclared `slug=<x>` dir | why a declared-set filter would be wrong |
  |---|---|---|
  | `getAllActorExidsOndisk` → `getActorsManifestLinkPlan` | named as drift, via `asActorExidsUndeclared` | — (this is the filter) |
  | `getAllActorsOndisk` (`actor list`, `clone list`, prune) | listed | the drift row's own fix is `rhx clone prune`; prune can reap only what it lists |
  | `getOneCloneByRef` | its clones stay addressable | a live clone keeps its address after its base leaves the manifest |
  | `setRepoBrainDirSymlink` `isActorBrainDirOfRepo` | a `.claude` link into it reads as rhachet's | under `ambient: '@<slug>'` the repo's `.claude` links into `slug=<slug>` by design |

  raised by peer r012 (5.3 i005, i006) as a reversal of a locked negative; disputed both rounds,
  and held here for the wisher to rule
- **verdict** — unruled; (b) built, rework to (a) is one row
