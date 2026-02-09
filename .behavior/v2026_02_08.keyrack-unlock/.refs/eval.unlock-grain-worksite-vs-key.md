# eval: unlock grain — per-worksite vs per-key

> should daemon require separate unlock per worksite, or store keys by slug and reuse across worksites that declare them?

---

## the question

the current daemon data model is per-worksite:

```
daemon.memory (current)
├─ worksites: Map<worksiteHash, WorksiteSession>
│  ├─ hash("/home/vlad/git/ehmpathy/api")
│  │  └─ keys: { AWS_SSO_PREP, XAI_API_KEY }
│  └─ hash("/home/vlad/git/ehmpathy/infra")
│     └─ keys: { AWS_SSO_PREP, TERRAFORM_TOKEN }
│
└─ unlock for api ≠ unlock for infra
   └─ both declare AWS_SSO_PREP → two separate sso auth prompts
```

the alternative is per-key:

```
daemon.memory (proposed)
├─ keys: Map<slug, UnlockedKey>
│  ├─ AWS_SSO_PREP: { secret, grade, expiresAt }
│  ├─ XAI_API_KEY: { secret, grade, expiresAt }
│  └─ TERRAFORM_TOKEN: { secret, grade, expiresAt }
│
└─ unlock for api → daemon has AWS_SSO_PREP + XAI_API_KEY
   └─ infra's `get` → keyrack.yml requires AWS_SSO_PREP + TERRAFORM_TOKEN
      ├─ AWS_SSO_PREP already unlocked → reuse (no re-auth)
      └─ TERRAFORM_TOKEN absent → partial failure, tell human to unlock
```

---

## the analysis

### per-worksite isolation is convened, not enforced

per-login-session scope is **enforced** by the kernel — daemon verifies /proc/$PID/sessionid, unforgeable.

per-worksite scope is **convened** by rhachet — malintent actors who have login-session access could call the daemon socket directly and request keys for any worksite hash.

```
per.worksite.boundary
├─ enforced? no — convened via rhachet convention
├─ malintent actor in same login session
│  ├─ can ls /run/user/$UID/ → find socket
│  ├─ can send GET { worksite: hash("any/gitroot") } to socket
│  ├─ daemon returns keys for that worksite if unlocked
│  └─ per-worksite adds zero barrier to malintent actors
│
└─ bonintent actor via rhachet
   ├─ rhachet reads keyrack.yml → only declared keys accessible
   └─ per-worksite adds isolation for honest mistakes only
```

per-worksite isolation protects only against bonintent mistakes (e.g., repo-infra accidentally reads repo-api's keys). but keyrack.yml already provides this protection — rhachet only requests keys declared in the worksite's spec.

### keyrack.yml IS the authorization filter

regardless of daemon grain, `get --for repo` always:
1. reads keyrack.yml for the caller's worksite
2. determines which key slugs are required
3. requests only those slugs from the daemon

```
authorization.model
├─ spec (keyrack.yml): declares which keys this worksite needs
├─ daemon: holds whatever keys are unlocked
├─ get: intersects spec ∩ daemon = result
│
├─ per-worksite daemon: redundant filter (spec already restricts)
└─ per-key daemon: spec is the sole filter (sufficient)
```

the daemon doesn't need to partition by worksite — the spec already constrains which keys each worksite can access.

### friction cost falls on bonintent actors

per-worksite unlock means:

```
friction.cost.per.worksite
├─ human unlocks in repo-api (sso auth, passphrase, etc)
│  └─ daemon stores: hash(api) → { AWS_SSO_PREP, XAI_API_KEY }
│
├─ human switches to repo-infra
│  ├─ infra also needs AWS_SSO_PREP
│  ├─ daemon has it — but under hash(api), not hash(infra)
│  └─ human must sso auth AGAIN for the same key
│
└─ result: same credential, same machine, same session → two auth prompts
   └─ friction falls on bonintent actors only
      └─ malintent actors bypass rhachet entirely
```

per-key unlock eliminates this friction:

```
friction.cost.per.key
├─ human unlocks in repo-api
│  └─ daemon stores: AWS_SSO_PREP, XAI_API_KEY (by slug)
│
├─ human switches to repo-infra
│  ├─ infra needs AWS_SSO_PREP + TERRAFORM_TOKEN
│  ├─ AWS_SSO_PREP already unlocked → reuse ✅
│  ├─ TERRAFORM_TOKEN absent → partial failure
│  └─ human only needs to auth for TERRAFORM_TOKEN
│
└─ result: one auth per key, not one auth per worksite × key
```

### partial unlock: what if some keys are unlocked but not all?

with per-key grain, `get --for repo` may find some keys unlocked and others absent:

```
partial.unlock
├─ keyrack.yml requires: [ AWS_SSO_PREP, XAI_API_KEY, TERRAFORM_TOKEN ]
├─ daemon has: [ AWS_SSO_PREP ]
├─ absent: [ XAI_API_KEY, TERRAFORM_TOKEN ]
│
├─ option A: fail fast (all-or-absent response)
│  ├─ return error: "2 keys absent: XAI_API_KEY, TERRAFORM_TOKEN"
│  ├─ tell human: `rhx keyrack unlock` to unlock absent keys
│  └─ pros: safe default — tool won't run with partial creds
│
├─ option B: partial grant (return what's available)
│  ├─ return: { AWS_SSO_PREP: granted, XAI_API_KEY: absent, TERRAFORM_TOKEN: absent }
│  ├─ let tool decide whether it can proceed
│  └─ pros: flexible — tool may only need a subset of keys for this task
│
└─ recommendation: option A (fail fast)
   ├─ consistent with existing `get` contract
   ├─ prevents partial-credential bugs
   └─ human unlock prompt clearly lists which keys are absent
```

---

## proposed daemon data model

```
daemon.memory (proposed)
├─ keys: Map<slug, UnlockedKey>
│
│  UnlockedKey
│  ├─ slug: string
│  ├─ key: KeyrackKey
│  ├─ unlockedAt: timestamp
│  └─ expiresAt: timestamp
│
├─ protocol commands
│  ├─ UNLOCK { keys[], duration } → store each key with TTL
│  ├─ GET { slugs[] } → return keys by slug (if TTL valid)
│  ├─ STATUS → list unlocked keys and TTL left
│  └─ RELOCK { slugs[]? } → purge keys (all or by slug)
│
└─ lookup: `get --for repo`
   ├─ read keyrack.yml for this worksite → required slugs
   ├─ for each slug: check daemon → present with valid TTL?
   ├─ all present → return keys
   └─ any absent → fail fast: "N keys absent: [slugs]"
```

```
flow.cross.worksite.reuse
├─ terminal A: `rhx keyrack unlock` in repo-api
│  ├─ daemon stores: AWS_SSO_PREP (8h), XAI_API_KEY (8h)
│  └─ no worksite hash tracked
│
├─ terminal B: `source rhx keyrack get --for repo` in repo-infra
│  ├─ keyrack.yml requires: AWS_SSO_PREP, TERRAFORM_TOKEN
│  ├─ daemon check: AWS_SSO_PREP → present (6h left) ✅
│  ├─ daemon check: TERRAFORM_TOKEN → absent ❌
│  └─ fail: "1 key absent: TERRAFORM_TOKEN. run `rhx keyrack unlock`"
│
├─ terminal B: `rhx keyrack unlock` in repo-infra
│  ├─ daemon already has: AWS_SSO_PREP → skip re-auth
│  ├─ daemon absent: TERRAFORM_TOKEN → auth + store
│  └─ daemon stores: TERRAFORM_TOKEN (8h)
│
├─ terminal B: `source rhx keyrack get --for repo` in repo-infra
│  ├─ AWS_SSO_PREP → present ✅
│  ├─ TERRAFORM_TOKEN → present ✅
│  └─ done: 2 keys granted via os.daemon
```

---

## comparison

| dimension | per-worksite grain | per-key grain |
|-----------|-------------------|---------------|
| data model | `Map<worksiteHash, WorksiteSession>` | `Map<slug, UnlockedKey>` |
| auth prompts | one per worksite × key | one per key (global) |
| cross-worksite reuse | no (same key, different hash) | yes (same key, reused by slug) |
| bonintent isolation | per-worksite partition | per-spec filter (keyrack.yml) |
| malintent resistance | same (convened boundary) | same (convened boundary) |
| TTL scope | per-worksite | per-key |
| partial unlock | n/a (worksite is all-or-absent) | supported (fail fast on absent) |
| complexity | moderate (worksite tracking) | simpler (flat key map) |

---

## recommendation

**per-key grain** with keyrack.yml as the authorization filter.

```
recommendation
├─ per-key grain: keys stored by slug in daemon, no worksite hash
├─ keyrack.yml: sole authorization filter (already exists, already works)
├─ friction: one auth per key, not one auth per worksite × key
├─ security: identical (per-worksite is convened, not enforced)
├─ implementation: simpler (flat Map<slug, Key> vs nested Map<hash, Session>)
│
├─ unlock: authenticates source vault, stores keys by slug, sets TTL
│  └─ if key already unlocked with valid TTL → skip re-auth
│
├─ get: reads keyrack.yml → required slugs → daemon → intersect
│  └─ all present → grant. any absent → fail fast with absent list.
│
└─ rationale
   ├─ per-worksite isolation is convened — adds near zero security value
   ├─ keyrack.yml already constrains which keys each worksite can access
   ├─ per-worksite auth friction is real — same key, multiple prompts
   └─ per-key grain reduces sso browser prompts and 1password master pass entries
```

---

## impact on vision doc

the vision doc already describes per-key grain in the user experience section (usecases 2b, 2c) and the command surface. the daemon architecture section should update:

1. **data model**: `Map<slug, UnlockedKey>` instead of `Map<worksiteHash, WorksiteSession>`
2. **protocol commands**: `UNLOCK { keys[], duration }` instead of `UNLOCK { worksite, keys[] }`
3. **TTL scope**: per-key instead of per-worksite
4. **lookup**: `get --for repo` reads keyrack.yml → required slugs → daemon → intersect

the scope section already describes per-spec as convened and per-login-session as enforced — this is consistent with per-key grain.

---

## sources

- `.behavior/v2026_02_08.keyrack-unlock/.refs/vault.os-daemon.md` — current daemon data model (per-worksite)
- `.behavior/v2026_02_08.keyrack-unlock/.refs/eval.per-terminal-chain-structural-advantage.md` — enforced vs convened boundaries
- `.behavior/v2026_02_08.keyrack-unlock/1.vision.md` — vision doc with per-key grain in user experience
