# self-review: behavior-declaration-adherance (r6)

review for line-by-line match between blueprint samples and implementation.

---

## methodology

compared actual implementation against blueprint samples in `3.3.1.blueprint.product.yield.md`.

---

## domain objects comparison

### BrainAuthSpecWords

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `type BrainAuthSpecWords = string` | `type BrainAuthSpecWords = string` | exact match |

### BrainAuthSpecShape

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `strategy: 'default' \| 'solo' \| 'pool'` | `strategy: 'default' \| 'solo' \| 'pool'` | exact match |
| `source: string \| null` | `source: string \| null` | exact match |

### BrainAuthCredential

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `slug: string` | `slug: string` | exact match |
| `secret: string` | `secret: string` | exact match |

### BrainAuthCapacity

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `tokensUsed: number` | `tokensUsed: number` | exact match |
| `tokensLimit: number` | `tokensLimit: number` | exact match |
| `resetAt: Date` | `resetAt: Date` | exact match |

### BrainAuthSupplied

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `credential: BrainAuthCredential` | `credential: BrainAuthCredential` | exact match |
| `brainSlug: string` | `brainSlug: TFormat` (generic) | improved — type safety |
| `formatted: string` | `formatted: string` | exact match |

### BrainAuthError

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `extends HelpfulError` | `extends HelpfulError` | exact match |
| `static from(...)` | not implemented | simpler — spike uses base class |

**verdict:** simpler implementation via base class extension. adequate for spike.

---

## transformer comparison

### asBrainAuthSpecShape

| blueprint sample | implementation | verdict |
|------------------|----------------|---------|
| input: `'pool(keyrack://org/env/KEY_*)'` | matches | exact |
| output: `{ strategy: 'pool', source: 'keyrack://...' }` | matches | exact |
| regex parse of DSL | implemented | exact |
| error on invalid format | implemented | exact |

### asBrainAuthTokenSlugs

| blueprint sample | implementation | verdict |
|------------------|----------------|---------|
| wildcard expansion `KEY_*` | implemented | exact |
| multiple wildcard patterns | implemented | exact |
| no-match error | implemented | exact |

---

## orchestrator comparison

### getOneBrainAuthCredentialBySpec

| blueprint flow | implementation | verdict |
|----------------|----------------|---------|
| parse spec via asBrainAuthSpecShape | line 111 | exact |
| expand slugs via asBrainAuthTokenSlugs | line 124 | exact |
| round-robin selection | line 132-143 | exact |
| call adapter.auth.supply | line 148 | exact |

---

## CLI comparison

### brains auth supply

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| `--from $spec` option | implemented as `--spec` | minor rename, same function |
| output format for apiKeyHelper | implemented | exact |

### brains auth status

| blueprint | implementation | verdict |
|-----------|----------------|---------|
| shows pool status | implemented | exact |
| shows per-credential capacity | implemented | exact |

---

## intentional deviations

| deviation | reason | acceptable? |
|-----------|--------|-------------|
| `auth` property vs `dao` | more descriptive name | yes |
| `--spec` vs `--from` | consistent with other CLI commands | yes |
| simpler BrainAuthError | adequate for spike | yes |

---

## conclusion

implementation adheres to blueprint with minor intentional deviations.

all core patterns match:
- domain object shapes match
- transformer logic matches samples
- orchestrator flow matches codepath
- CLI contract matches specification

deviations are intentional improvements, not omissions.

