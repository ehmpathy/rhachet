# F27 — the new transformer unit suites stay data-driven caselists

- **fork** — the 5.3 i001 mech-given-when-then lane (approved, nitpick.1) names 17 new unit suites
  that run a `TEST_CASES` table through one `test()` each, and asks they be reshaped into
  `given` → `when` → `then`. (a) reshape all 17 · (b) keep the caselists
- **taken** — (b).
  - every one of the 17 tests a pure transformer (`as*`, `is*`, `get*` compute) — one input, one
    output, no scene, no act beyond the call
  - `rule.prefer.data-driven` (mechanic) names exactly that case: *"prefer data-driven caselist tests
    when possible, especially unit tests of transformers"*. the two mechanic rules overlap here, and
    the narrower one (transformers) governs the shape
  - a `given`/`when` per row would carry no scene and no act — the row's `description` already says
    what a `then` title would say
  - the suites with a real scene (a temp repo, a fixture tree, a sequence of acts) in this PR are
    given/when/then already
- **rework** — clean — a mechanical reshape, file by file, with no assertion change
- **confidence** — 80%; a team may prefer one test shape repo-wide over the transformer carve-out
- **where** — the 17 suites the lane lists, e.g. `asArgvWithActorFormAlias.test.ts`,
  `asActorsDelta.test.ts`, `isActorDeclared.test.ts`
- **verdict** — unruled
