# seed S3 — the TUI-scrape is bounded by a version pin

## .said

verbatim, 2026-09-13:

> we have pinned the brain-cli to a specific version, so this will be stable. once its not, we'll
> eject the diffs into the BrainCliAdapter pattern we already begun

in reply to the vision's `.what is awkward` bullet:

> **we screen-scrape another product's TUI.** it works and ties us to a surface with no contract,
> bounded to one operation and one classification, so a redesign costs one repair.

## .settled

the screen-scrape's fragility is **bounded**, not open-ended:

- the brain-cli is **pinned to a specific version**, so the TUI's rendered shape is stable — the
  scrape reads a surface that does not move under a pinned dep
- when the pin lifts, the version diffs **eject into the adapter pattern already begun** — the same
  adapter shape this repo already uses (`BrainHooksAdapter`, `KeyrackHostVaultAdapter`), so a new
  brain-cli version is absorbed by an adapter rather than by a rewrite

⇒ so the awkward is a **bounded, one-repair** cost with a stated escape hatch, not an unbounded tie
to a surface with no contract. the vision's bullet overstated it.

## .landed

- `1.vision.yield.md` → `.what is awkward` → the TUI-scrape bullet, reframed: pinned = stable now;
  adapter = the escape hatch when the pin lifts
