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
