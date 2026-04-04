# self-review r2: has-questioned-assumptions (deeper)

## deeper review: what did r1 miss?

r1 covered the obvious technical assumptions. now let me look harder.

## assumption 6: we must read ALL stdin at once

**what we assume**: the fix reads all stdin into memory before return

**what if opposite?** could stream-process instead

**counterexample**: what if stdin is 10GB? we'd run out of memory

**but**: the extant code also reads into memory (readline buffers). this is a CLI tool, not a stream processor. secrets are typically <1MB.

**could simpler work?** yes — could add a size limit and fail-fast. but that's scope creep.

**verdict**: holds for scope — large secrets are edge case per criteria (usecase.5 says ">100KB" not ">1GB")

## assumption 7: UTF-8 is correct charset

**what we assume**: `setEncoding('utf8')` is correct

**what if opposite?** binary secrets would be mangled

**evidence**: json is utf-8 by spec. RSA keys are ascii (subset of utf-8). github app credentials are json.

**counterexample**: base64 blobs are ascii too. utf-8 covers these.

**verdict**: holds — utf-8 covers all realistic secret formats

## assumption 8: process.stdin is a readable stream

**what we assume**: async iteration works on process.stdin

**what if opposite?** some edge runtime might not support it

**evidence**: node.js process.stdin is always a Readable stream. this is core API.

**exception**: could fail on very old node versions

**check**: package.json line 48: `"node": ">=22.0.0"`

async iterators on readable streams work since node 10. node 22 is well above.

**verdict**: holds — node 22+ guarantees async iterator support

## summary of r2

| assumption | verified? | how |
|------------|-----------|-----|
| read all stdin at once | yes | scope limits to reasonable sizes |
| UTF-8 charset | yes | json and RSA keys are utf-8 compatible |
| async iteration on stdin | yes | node 22+ required; feature works since node 10 |

no hidden assumptions invalidate the blueprint. ready to proceed.
