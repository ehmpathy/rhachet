# correction — the mechanism is found, and it is NOT what this issue inferred

the title still holds: `--paths-wout` was inert. the **cause named in the original report was
wrong**, and it was wrong in exactly the way the report itself warned about. the record is set
straight here so nobody repairs the wrong file.

## what the original report inferred

> `paths:` reports `(none)` and `files: null` even though seven `--paths-wout` flags were supplied.
> so the exclusions may never reach the diff-sourced target set.
>
> ⚠️ that is an **inference from one outcome**, and it should be treated as a lead rather than a
> cause.

that lead was false. the exclusions **do** reach a diff-sourced target set.

## the disproof

`dist/domain.operations/review/stepReview.js:309-311` applies the negative globs to the joined
target list, whatever its source:

```js
const targetFiles = targetFilesJoined
    .filter((file) => !negativePathGlobs.some((glob) => isPathMatchedByGlob({ path: file, glob })))
    .sort();
```

there is no diff/paths branch above it. provenance is irrelevant to the exclusion step.

## the actual cause — `parseReviewArgs` drops repeated flags

`dist/contract/cli/review.js:113-146`. the parser has explicit repeat-collect branches for
`--refs` (`:121`) and `--optional` (`:129`). every other flag falls to the generic tail:

```js
else if (value && !value.startsWith('--')) {
    options[key] = value;   // ← last write wins
    i++;
}
```

so seven `--paths-wout` flags collapse to **one** — the seventh. `stepReview.js:271-275` already
accepts `string | string[]`, so the array is consumed correctly the moment the parser retains
every flag. the defect is entirely in the parser.

## the proof, from the failed run's own artifact

`input.scope.debug.json` from the run this issue reported records what actually arrived:

```json
"args": {
  "diffs": "since-main",
  "pathsWith": "**/*.{ts,sh,md,snap}",
  "pathsWout": ".behavior/**/.reviews/**",
  "join": "intersect"
}
```

a bare string, not an array — and its value is precisely the **last** of the seven flags supplied.
six were dropped before `stepReview` ever ran. that field is the direct evidence; the
`paths: (none)` line was a false lead.

## the fix

give `paths-with` and `paths-wout` the same repeat-collect branch `refs` already has:

```js
else if (key === 'paths-with' || key === 'paths-wout') {
    if (!options[key]) options[key] = [];
    if (value && !value.startsWith('--')) {
        options[key].push(value);
        i++;
    }
}
```

`--paths-with` needs it for the same reason — `stepReview.js:261-265` accepts an array there too,
and a caller who supplies two positive globs today silently loses the first. one lane in the
reporter repo does exactly that:

```
--paths-with '**/*.test.ts' --paths-with '**/*.snap'
```

⇒ that lane has been silently graded against `**/*.snap` alone.

## measured, applied locally against `node_modules`

same lane, same repo, same branch — before and after the parser fix:

| | before | after |
|---|---|---|
| tokens | 898.1k | **736.0k** |
| context | 89.8% | **73.6%** |
| target files | 218 | **148** |
| `.agent/` in targets | 140.0k | **absent** |
| `.dream/` in targets | 15.8k | **absent** |
| `.behavior/` in targets | 162.7k | **135.9k** (yields retained) |

the lane had overflowed the 75% failfast for three consecutive iterations. it now completes and
returns a verdict (0 blockers, 3 nitpicks, 104s). so this one parser branch is what unblocked it.

## the clamp this wants

a parser unit test, not a review round-trip — the defect is one function deep and needs no brain:

```
given seven --paths-wout flags
then parseReviewArgs().pathsWout has length 7
```

it goes red under the extant parser and green under the fix. the same shape for `--paths-with`.

## why this was expensive to find

the failure was **silent and successful**. the review ran, graded the un-excluded trees, argued
its findings well, and reported no error. the only surface that betrayed it was a token count that
did not drop. an exclusion that is accepted, echoed back in the scope header, and then dropped is
worse than one that is rejected — the header printed all seven globs
(`stepReview.js:579` reads `negativePathGlobs`, which by then held one), so even the diagnostic
lied.

⇒ guard item 3 in the original report still stands. item 2 should be re-read: the `paths: (none)`
claim was not verified against this source and should be dropped from the ask unless someone
reproduces it.
