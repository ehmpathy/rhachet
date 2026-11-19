# F5 — the collapse happens in rhachet, before the brain adapter

## .the fork
- (a) rhachet hands the adapter one hook per (event, non-tool matcher) — the dispatcher, its matcher
  the union of the rules' matchers — and writes the per-actor manifest itself
- (b) the brain adapter (`rhachet-brains-anthropic`) learns to collapse rules into a dispatcher

## .taken
(a).

## .why
- the writer in use is the published `rhachet-brains-anthropic@0.4.3`
  (`getBrainHooksAdapterByConfigImplicit.ts:23-120` imports it by package name); (b) needs a release
  of that package and a bump here, before the 15:00Z bar
- (a) is brain-agnostic: the opencode adapter gets the dispatcher for free
- the union matcher reuses claude's own grammar: `Write|Edit` ∪ `Bash` = `Write|Edit|Bash`; any `*`
  makes it `*`. the dispatcher then filters per rule by the same grammar

## .rework
clean — the manifest and the dispatcher hold either way; only who emits the one hook moves.

## .confidence — 87%
a clone's settings keep only the inner hooks whose `author` it enrolls (`getSettingsForRoles.ts:13-45`).
the dispatcher hook needs an author that filter keeps, and the per-role cut must act on the manifest
instead. the shape is settled in the blueprint.

## .where
`1.vision.yield.md` § the solution

## .verdict
open.
