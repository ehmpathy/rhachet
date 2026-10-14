# requirement: the default peer reviewer brain is `openrouter/deepseek/flash`

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a peer review lane that names no `--brain` reviews with `openrouter/deepseek/flash`
(`rhachet-brains-openrouter`), and returns a verdict.

## .why

the review lanes need a brain whose window holds a whole branch, at a cost that lets every lane run
on every guard pass.

## .clamp — upstream since 2026-10-13

- `rhachet-roles-bhrain@0.39.1` — `DEFAULT_REVIEW_BRAIN = 'openrouter/deepseek/flash'`, the one
  constant `rhx review` and `review.by` both read
- `rhachet-brains-openrouter@0.1.3` — every tier spec declares a 1M token window, which is what the
  models hold; the 128k it once shipped made every lane refuse its prompt
- both moved upstream from the local `pnpm` patches that first held them (landed 2026-10-02); the
  patches were dropped once the pinned versions shipped the same values

## .proof

| tier | test | status |
|---|---|---|
| observed | the `5.1.execution.from_vision` guard, run `i002.137e857b003719394a`: each lane names no `--brain`, prints `brain: openrouter/deepseek/flash`, and returns a verdict (e.g. `.behavior/v2026_09_26.fix-config-blend/.reviews/peer/5.1.execution.from_vision._.review.i002.137e857b003719394a.r008._.given.by_peer.behavior-intent-coverage.md`) | ✅ observed 2026-10-03 |
| integration | `src/.test/defaultPeerReviewerBrain.integration.test.ts` [case1][case2] — the installed `rhachet-roles-bhrain` defaults both `rhx review` and `review.by` to `openrouter/deepseek/flash`, and every `rhachet-brains-openrouter` tier declares a 1M window; a bump that reverts either goes red | ✅ green 2026-10-13 |
.note (2026-10-07, wisher) = rhachet selects this brain but never calls it, so the proof here is the
installed default above. the real-call contract test (the wire path, auth, the reply shape) belongs to
the package that makes the call, and `ehmpathy/rhachet-brains-openrouter` already owns one. a live
call added here at 5.3 was moved out the same day.

## .source

the wisher, 2026-10-02 (`v2026_09_26.fix-config-blend` seed 23).
