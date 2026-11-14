# S9 — the `ambient:` key names the repo actor, always, by name

## .said

> no, we just need to clearly demark that the `ambient: ` actor for the repo = x

> and require an ambient actor be defined always

> by name

> not repo:

> but ambient:

> or repo:
> ambient: '@builder'

> that works too

> actually

> a

## .settled

the repo actor is named by one top-level key, `ambient: '@<slug>'` — not `repo:`, and not nested under a `repo:` block. the key is required in every manifest and names its actor by name: there is no sole-actor fallback, so a file without `ambient:` is invalid in every reader, and the error names the key.

## .landed

- yield *shape*, *repo actor*, edgecases, the after example
- dimensions D3 (`declared` · `undeclared` invalid · `declared, but names no actor` invalid)
- inventory rows 8, 10, 11, 12, 17; case=4 `[t3]`; case=8 `[t4]`
- F12
