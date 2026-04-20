# self-review r2: has-questioned-questions

## triage of open questions

### questions moved to [wisher]

1. **backwards compatibility**: should we support secrets without `mech` field?
   - **why wisher**: policy decision. only wisher knows acceptable migration burden.

2. **action name**: `rhachet/keyrack` or `ehmpathy/keyrack`?
   - **why wisher**: brand decision. only wisher knows org preference.

### questions answered via logic [answered]

1. **error behavior**: fail-fast or collect all errors?
   - **answer**: fail-fast
   - **logic**: security operations should fail early. if one secret is blocked, stop immediately. partial success in credential translation is dangerous.

2. **OIDC integration**: handle OIDC or leave to aws-actions?
   - **answer**: leave to aws-actions/configure-aws-credentials
   - **logic**: OIDC is a distinct mechanism with well-supported extant actions. our scope is self-descriptive blob translation. OIDC doesn't use blobs — it uses GitHub's OIDC token directly.

3. **composite vs node action**:
   - **answer**: node action
   - **logic**: node action enables direct reuse of extant TypeScript mechanism adapters. no transpile needed at action runtime. faster startup than docker.

4. **multi-secret input format**:
   - **answer**: use `env` context
   - **logic**: resolved in r1. handles multiline JSON correctly.

### questions for [research]

1. **github action limits**: env var size or count limits?
   - **why research**: need to check GitHub docs. affects whether large secrets (like private keys) work.

## summary

| question | triage | rationale |
|----------|--------|-----------|
| backwards compatibility | [wisher] | policy decision |
| action name | [wisher] | brand decision |
| error behavior | [answered] | fail-fast is safer |
| OIDC integration | [answered] | out of scope, use extant actions |
| composite vs node | [answered] | node for TypeScript reuse |
| multi-secret format | [answered] | env context handles multiline |
| github action limits | [research] | check GitHub docs |

## vision updated

added triage markers to each question in "open questions & assumptions" section.
