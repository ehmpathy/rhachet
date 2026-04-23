# self-review r3: has-questioned-questions

## issue found: firewall incorrectly blocks ghs_* tokens

**the question I missed**: "firewall validation should run at translate time vs at usage time"

**the problem discovered**:

1. action translates JSON blob → ghs_* token
2. action exports `GITHUB_TOKEN=ghs_abc123` to $GITHUB_ENV
3. keyrack.get reads from os.envvar with PERMANENT_VIA_REPLICA mechanism
4. REPLICA firewall runs validate() on the cached value
5. mechAdapterReplica blocks ghs_* pattern!

```typescript
// from mechAdapterReplica.ts line 21-22
// github server-to-server tokens (long-lived)  <-- INCORRECT COMMENT
/^ghs_[a-zA-Z0-9]{36}$/,  // <-- blocks ghs_*!
```

the translated token gets blocked by the very firewall we want to enable!

**root cause analysis**:

the comment says "github server-to-server tokens (long-lived)" but this is **factually incorrect**. the `ghs_*` prefix is used exclusively for GitHub App **installation access tokens**, which are:

- **inherently short-lived** (max 1 hour by GitHub API design)
- **cannot be made long-lived** (GitHub enforces the expiry)
- **the output of EPHEMERAL_VIA_GITHUB_APP mechanism**

the confusion was between:
- `ghs_*` = GitHub App installation tokens (SHORT-LIVED, 1 hour max)
- `gho_*` = GitHub OAuth tokens (these ARE long-lived)

**the fix** [answered via logic]:

remove `ghs_*` from LONG_LIVED_PATTERNS in `mechAdapterReplica.ts`:

```typescript
// BEFORE (incorrect)
const LONG_LIVED_PATTERNS = [
  /^ghp_[a-zA-Z0-9]{36}$/,  // github classic pat - long-lived ✓
  /^gho_[a-zA-Z0-9]{36}$/,  // github oauth token - long-lived ✓
  /^ghu_[a-zA-Z0-9]{36}$/,  // github user-to-server - long-lived ✓
  /^ghs_[a-zA-Z0-9]{36}$/,  // WRONG: these are SHORT-lived
  /^ghr_[a-zA-Z0-9]{36}$/,  // github refresh token - long-lived ✓
  /^AKIA[A-Z0-9]{16}$/,     // aws access key - long-lived ✓
];

// AFTER (correct)
const LONG_LIVED_PATTERNS = [
  /^ghp_[a-zA-Z0-9]{36}$/,  // github classic pat - long-lived ✓
  /^gho_[a-zA-Z0-9]{36}$/,  // github oauth token - long-lived ✓
  /^ghu_[a-zA-Z0-9]{36}$/,  // github user-to-server - long-lived ✓
  // ghs_* REMOVED: installation tokens are short-lived (1 hour)
  /^ghr_[a-zA-Z0-9]{36}$/,  // github refresh token - long-lived ✓
  /^AKIA[A-Z0-9]{16}$/,     // aws access key - long-lived ✓
];
```

**why this is safe**:

1. GitHub App installation tokens (`ghs_*`) are **always** short-lived by GitHub's API design
2. you cannot request a longer expiry — GitHub enforces 1 hour max
3. the firewall's purpose is to block credentials that could cause long-term damage if leaked
4. a 1-hour token has limited blast radius — it expires before significant damage can occur
5. this aligns with our goal: allow EPHEMERAL mechanisms, block PERMANENT ones

**lesson for next time**: when the firewall pattern conflicts with the mechanism output, verify the token's actual lifetime — do not trust the comment blindly.

---

## vision update needed

the vision currently lists this as [research], but it's now [answered]:

change from:
> 2. **ghs_* token classification** [research]: ...

to:
> 2. **ghs_* token classification** [answered]: `ghs_*` tokens are GitHub App installation access tokens, which are inherently short-lived (1 hour max, enforced by GitHub). the firewall should NOT block them. fix: remove `ghs_*` from LONG_LIVED_PATTERNS in mechAdapterReplica.ts.

---

## confirmation: all questions now triaged correctly

### [wisher] questions — why they require wisher input

1. **backwards compatibility** [wisher]: correct triage.
   - the question: should we support secrets without `mech` field?
   - why wisher: this is a policy decision about migration burden. only the wisher knows the acceptable tradeoff between strict enforcement (simpler code) vs backwards compat (more adoption friction). code cannot answer this — it's a product decision.

2. **action name** [wisher]: correct triage.
   - the question: `rhachet/keyrack` or `ehmpathy/keyrack` or something else?
   - why wisher: this is a brand decision. involves org strategy, namespace ownership, public perception. code cannot answer this — it's an organizational decision.

### [answered] questions — why the answers hold

3. **error behavior** [answered]: fail-fast on first error. holds because:
   - security operations should never partially succeed
   - if one credential fails, exposing others while debugging is risky
   - fail-fast is the industry standard for auth/credential flows
   - the vision correctly applies this principle

4. **OIDC integration** [answered]: leave to aws-actions/configure-aws-credentials. holds because:
   - OIDC is a fundamentally different mechanism (no stored credential, uses GitHub's OIDC token)
   - aws-actions/configure-aws-credentials is mature, maintained, widely adopted
   - our scope is self-descriptive blob translation, not OIDC token exchange
   - adding OIDC would bloat scope without clear benefit

5. **composite vs node action** [answered]: node action. holds because:
   - mechanism adapters are TypeScript — node action can import them directly
   - composite actions use shell, would require transpile or separate binary
   - docker actions are slower to start
   - node is the standard for GitHub Actions that need complex logic

6. **multi-secret input format** [answered]: use `env` context. holds because:
   - the `secrets:` input format breaks on multiline JSON (private keys have newlines)
   - `env:` context is handled correctly by GitHub Actions runtime
   - this is idiomatic for GitHub Actions users
   - the fix was validated in r2 review

7. **ghs_* token classification** [answered]: remove from LONG_LIVED_PATTERNS. holds because:
   - `ghs_*` tokens are GitHub App installation tokens, max 1 hour lifetime
   - GitHub's API enforces this — you cannot request longer
   - the original firewall comment was factually incorrect
   - this was the critical finding of r3 — fixes the vision's viability

### [research] questions — why they require external research

8. **github action limits** [research]: correct triage.
   - the question: any limits on env var size or count?
   - why research: need to check GitHub Actions documentation for hard limits
   - why not answerable now: this is GitHub's implementation detail, not derivable from logic
   - impact if limits exist: large private keys or many secrets could hit limits

---

## summary

| question | triage | why it holds |
|----------|--------|--------------|
| backwards compatibility | [wisher] | policy decision on migration burden |
| action name | [wisher] | brand/org decision |
| error behavior | [answered] | security standard: fail-fast |
| OIDC integration | [answered] | out of scope, extant solutions exist |
| composite vs node | [answered] | TypeScript reuse, standard practice |
| multi-secret format | [answered] | env context handles multiline |
| ghs_* classification | [answered] | **fixed**: tokens are short-lived |
| github action limits | [research] | GitHub's implementation detail |

all questions triaged. one critical issue found and resolved (ghs_* blocking). vision updated to reflect the fix.
