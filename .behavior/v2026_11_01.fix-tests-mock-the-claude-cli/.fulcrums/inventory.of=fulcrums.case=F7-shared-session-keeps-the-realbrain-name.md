# F7 — the shared session reuses the name `clone.realbrain.acceptance.test.ts`

## .the fork

the six realbrain suites fold into one. a new name (`clone.smoketest.acceptance.test.ts`) would read
plainer. but `jest.acceptance.shards.jsonc:11-15` gives the pattern `realbrain.acceptance.test.ts` its
own serial shard, which ci reads (`.github/workflows/.test.yml:155, 170`) so a real brain never races
~23 other suites on a 2-vcpu runner.

| option | cost |
|---|---|
| A. keep `clone.realbrain.acceptance.test.ts` | the shard config is untouched |
| B. a new name | the shard pattern must change too, or the real brain lands in a dynamic shard and reads wedged under load |

## .taken

A. the extant name already says "real brain", and the shard is a proven placement.

## .rework

clean — a rename plus one pattern line.

## .confidence

90%.

## .where

`3.3.1.blueprint.product.yield.md` — filediff tree.

## .verdict

best-guessed.
