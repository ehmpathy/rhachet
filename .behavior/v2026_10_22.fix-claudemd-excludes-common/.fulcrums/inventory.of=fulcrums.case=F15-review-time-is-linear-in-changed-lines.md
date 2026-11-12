# F15 — review time is linear in changed lines, calibrated to the director's 63 min

- **fork:** a uniform rate per changed line · a weighted rate (code > snapshot > route record > route machinery) · a per-file guess at the reader's pace
- **taken:** uniform, calibrated to the one measure on record: 63 min for 5608 lines, about 1.12 min per 100 lines. a 2× weight on non-snapshot src/blackbox lines is the margin check. every layer is under 30 min under both
- **rework:** clean. a new rate re-runs the arithmetic in `split-plan.md`. the cut points are domain seams, so they do not move with the rate
- **confidence:** 75%. low because one aggregate figure cannot show how one reviewer's pace varies by file kind. L5 and L6 (about 18 min each) carry the least margin, if route prose reads slower than the model assumes
- **where:** `split-plan.md` § the review-time model
- **verdict:** —
