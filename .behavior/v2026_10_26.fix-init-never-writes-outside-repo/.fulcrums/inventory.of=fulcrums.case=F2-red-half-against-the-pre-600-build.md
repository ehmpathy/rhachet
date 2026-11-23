# F2 — the clamp's red half runs against the pre-#600 build

## .the fork
the wish: "a clamp test that is red without the fix and green with it". the fix for the reported path
shipped in #600 (v1.49.2). so:
- A: prove case=1 red by a run against v1.49.1 (`07a3ec0e`), green on main; give the new guard its
  own red/green via case=4 (remove the guard → the outside file changes)
- B: treat only the new guard as "the fix", and prove red/green on case=4 alone

## .taken
A. case=1 is the wish's named scene; its red must be shown somewhere, and only the old build can
show it.

## .rework
clean — the red-half run is a verification step, not code; B drops one step.

## .confidence
75%. the wisher may judge a run against an old build as theatre and want only case=4's red.

## .where
`1.vision.yield.md` .evaluation · `case=1` .the clamp's red half.

## .verdict
ruled A by the director ("the red half against v1.49.1 plus the guard's own red then green test
is the proof"). measured at 5.3, 2026-10-26, via `rhx test.against.release`:

- case=1's scene, with the fixture's test brain, stays green on 1.48.0 and 1.49.1 once its arrow is
  laid as an enroll leaves it: that brain writes `settings.of.repo.json`, so it never followed the
  arrow. only its read-only note is absent there
- the reported write needs the reporter's adapter. #661's repo pins rhachet 1.48.0 and
  `rhachet-brains-anthropic@0.4.3`, whose dao writes `settings.json` by name. acceptance case10
  (the real 0.4.3 adapter, a 0444 home) reproduces #661 on 1.48.0 to the line: `└─ 7dcf1989`, no
  count, exit 1, no error shown. case11 (a writable home) shows the old build write role hooks into
  the home file. both are red on 1.48.0 and on 1.49.1, and green on this branch
- so the clamp the wish names is case10, and its red half ran against the reporter's own pin
  as well as v1.49.1. the guard's own red then green clamps stand as before
