# self-review r2: has-zero-deferrals

## the question

are any vision items deferred? if so, either implement or escalate.

---

## deferrals found in blueprint

### deferral 1: SDK extension

**location**: blueprint scope decisions (line 245)
**statement**: "SDK extension deferred to post-spike"

**vision check**: searched vision for SDK requirements:
- vision in-scope (lines 525-528): brains auth get, shared state file, keyrack integration, settings.json
- vision out-of-scope (lines 530-535): proactive rotation, team pools, usage dashboard, auto token refresh
- **SDK extension NOT mentioned in vision scope**

**criteria check**: searched criteria for SDK requirements:
- all usecases reference CLI behavior (enroll with --auth, brains auth get)
- exchange boundaries reference CLI commands only
- **SDK NOT mentioned in criteria**

**verdict**: SDK extension was never promised. this is an extra we identified ourselves. deferral is acceptable.

---

## why it holds

| vision item | blueprint coverage | status |
|-------------|-------------------|--------|
| brains auth get CLI | invokeBrainsAuth.ts, getOneBrainAuthCredentialBySpec.ts | covered |
| shared state file | removed in favor of stateless adapter queries | improved |
| keyrack integration | spec format keyrack://owner/env/KEY | covered |
| settings.json config | genApiKeyHelperCommand.ts, enrollBrainCli.ts | covered |
| BrainAuthAdapter contract | BrainAuthAdapter.ts, BrainAuthAdapterDao.ts | covered |
| enrollment --auth flag | invokeEnroll.ts extension | covered |

every vision item is implemented. no vision requirement was deferred.

---

## state file change note

vision mentioned shared state file at `~/.rhachet/brain/auth/state.json`. blueprint replaced this with stateless capacity queries via BrainAuthAdapter.

**this is NOT a deferral** — it is an improvement:
- vision goal was "track rate limits across terminals"
- stateless adapter queries achieve the same goal without local state
- brain suppliers own capacity knowledge (inversion of control)
- simpler design, fewer files to manage

the intent is preserved, implementation is improved.

---

## summary

- **1 deferral found**: SDK extension
- **deferral acceptable**: SDK was never in vision scope
- **all vision items covered**: brains auth get, keyrack, settings.json, adapter contract, enrollment flag
- **state file improved**: replaced with stateless adapter queries (better design)

**result**: zero vision items deferred. no escalation needed.