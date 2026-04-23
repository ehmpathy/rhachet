# self-review: has-questioned-assumptions

## assumption 1: mechanism adapters can run in action context

**what do we assume?**
the extant TypeScript mechanism adapters (mechAdapterGithubApp, etc.) can be called from a GitHub action.

**evidence that supports this:**
mechanism adapters are pure functions that take `{ source }` and return `{ secret, expiresAt? }`. they don't depend on daemon, host manifest, or local filesystem.

**what if the opposite were true?**
if adapters needed daemon or host manifest, we'd need to refactor them to extract the pure translation logic.

**verdict**: assumption holds. adapters are already pure.

---

## assumption 2: secrets input format KEY=json will parse cleanly

**what do we assume?**
the input `KEY=${{ secrets.KEY }}` will parse correctly.

**what if JSON contains newlines?**
GitHub secrets preserve newlines. a multiline JSON blob would break our line-by-line parse.

**counterexample:**
```yaml
secrets: |
  KEY={"appId":"123",
       "privateKey":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
```

this spans multiple lines. our parser would break.

**fix needed**: use null-delimited or base64-encoded format, or parse the entire secrets input as a single multiline string.

**verdict**: assumption does NOT hold. input format needs refinement.

---

## assumption 3: 1 hour token expiry is acceptable

**what do we assume?**
most CI jobs complete in < 1 hour, so GitHub App token expiry is fine.

**did wisher say this?**
no. the handoff didn't mention job duration.

**what if jobs are longer?**
integration test suites can exceed 1 hour. token would expire mid-job.

**evidence from wisher context:**
the handoff was about a test failure, not job duration. likely short job.

**verdict**: assumption is reasonable but should be documented as limitation.

---

## assumption 4: firewall output UX matches expectations

**what do we assume?**
the treestruct output format (🔐 keyrack firewall → grants → status) is clear.

**did wisher approve this?**
no. this UX was proposed in vision without wisher validation.

**what if wisher wants different format?**
would need to adjust. but treestruct is consistent with other keyrack CLI output.

**verdict**: assumption is reasonable. follow extant patterns.

---

## assumption 5: action placed early in workflow

**what do we assume?**
action runs before other steps that need credentials.

**what if user places it incorrectly?**
subsequent steps would see raw JSON blob instead of translated token.

**mitigation:**
document correct placement. action cannot enforce this.

**verdict**: assumption is reasonable. documentation handles this.

---

## assumption 6: single action call handles all secrets

**what do we assume?**
one action invocation handles all secrets for the job.

**alternative:**
one action call per secret.

**why batch is better:**
- fewer action calls = faster workflow
- atomic: all secrets translate or none
- cleaner workflow yaml

**verdict**: assumption holds. batch approach is better.

---

## assumption 7: $GITHUB_ENV works for env export

**what do we assume?**
action can write to $GITHUB_ENV and subsequent steps see the values.

**evidence:**
this is documented GitHub Actions behavior. many actions use this pattern.

**verdict**: assumption holds. this is standard.

---

## found issue: input format

the KEY=json input format breaks on multiline JSON (e.g., private keys with embedded newlines).

**options to fix:**
1. **base64 encode** — secrets input as base64, action decodes
2. **heredoc style** — different delimiter between secrets
3. **single JSON object** — `{ "KEY1": {...}, "KEY2": {...} }`
4. **accept that github secrets are single-line** — actually, GitHub secrets can contain newlines but the interpolation `${{ secrets.X }}` preserves them

**research needed**: test whether `${{ secrets.X }}` with multiline JSON breaks the line-by-line parse. if so, refine format.

---

## summary

| assumption | verdict |
|------------|---------|
| mechanism adapters are pure | holds |
| KEY=json parses cleanly | **does NOT hold** — multiline issue |
| 1 hour token expiry acceptable | reasonable, document |
| firewall output UX | reasonable, follow patterns |
| action placed early | reasonable, document |
| batch approach | holds |
| $GITHUB_ENV works | holds |

**action needed**: refine secrets input format to handle multiline JSON blobs.
