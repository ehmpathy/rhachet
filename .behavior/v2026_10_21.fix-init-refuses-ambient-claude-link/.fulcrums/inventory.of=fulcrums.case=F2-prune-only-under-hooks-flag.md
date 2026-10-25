# F2 — a part-way failure prunes hooks only under `--hooks`

- **fork:** (a) prune only when `--hooks` was passed, or (b) prune on every `rhx init --roles …` failure
- **taken:** (a). a run without `--hooks` never writes hooks today; to prune there would make a failure
  do what a success does not
- **rework:** clean — one condition
- **confidence:** 80%. the measured run (`prepare:rhachet`) passes `--hooks`, so either way cures it
- **where:** `1.vision.yield.md` → [c3] edgecases, open question 2
- **verdict:** —
