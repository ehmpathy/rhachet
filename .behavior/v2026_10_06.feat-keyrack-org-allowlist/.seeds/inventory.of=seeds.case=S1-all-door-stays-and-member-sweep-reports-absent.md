# S1 — the `@all` door stays; a member sweep reports absent keys as absent

## .said

> yep, @all remains important ; yep, report as absent just like normal

## .settled

- `--org @all` stays a legal door. it is how a caller reaches a key that belongs to no org, and the allowlist does not retire it.
- a sweep under a member org (`unlock --env camp --org aether`) treats a declared key that the rack does not hold under that member exactly as any sweep treats an absent key: it reports it absent. no special verdict, no fallback to the default org.

## .landed

- `1.vision.yield.md` — the two [wisher] questions
- `1.vision.experience.case=4.member-sweep.md`
