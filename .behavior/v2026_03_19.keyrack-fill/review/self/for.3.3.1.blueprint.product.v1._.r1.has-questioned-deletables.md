# self-review r1: has-questioned-deletables

## component-by-component deletion analysis

### examined: genMockKeyrackKeySpec.ts fixture

can this be removed?

the blueprint lists this as a new test fixture. but what the tests will mock:
- daoKeyrackRepoManifest.get() → returns full manifest
- daoKeyrackHostManifest.get() → returns host manifest

we don't need a separate "key spec" generator. what we need is a manifest generator.

**verdict: delete.** change to `genMockKeyrackRepoManifest.ts` instead. that's what tests actually mock.

**fix:** updated blueprint filediff tree:
```
└── .test/
    └── assets/
        └── genMockKeyrackRepoManifest.ts           [+] create: test fixture
```

### examined: FillKeyResult summary fields

the return type includes:
```ts
summary: { total: number; set: number; skipped: number; failed: number }
```

can `total` be removed? it equals `results.length`. redundant.

**verdict: delete total.** callers can compute from results.length if needed.

### examined: --key flag

can this be removed? without it, user must re-enter all keys with --refresh.

**verdict: holds.** --key enables targeted refresh without redundant prompts.

### examined: --refresh flag

can this be removed?

**verdict: holds.** without it, no way to update already-configured keys.

### examined: nested set output within treebucket

the vision shows:
```
   │  ├─ set the key
   │  │  ├─
   │  │  │
   │  │  │  🔐 keyrack set (org: ehmpathy, env: test)
   │  │  │     └─ ehmpathy.test.CLOUDFLARE_API_TOKEN
   │  │  │        ├─ mech: PERMANENT_VIA_REPLICA
   │  │  │        └─ vault: os.secure
   │  │  │
   │  │  └─
```

this requires: capture stdout from setKeyrackKey and re-indent it. complex.

alternative: simple inline status:
```
   │  ├─ set the key (vault: os.secure, mech: PERMANENT_VIA_REPLICA)
   │  └─ ✓ set → unlock → get
```

**verdict: simplify for v1.** the nested treebucket output is aspirational. start with simple inline status. can enhance later.

### examined: separate context generators

the blueprint shows:
```ts
const hostContext = await genKeyrackHostContext({ cwd, owner, prikeys });
await unlockKeyrackKeys({ ... }, await genContextKeyrackGrantUnlock({ owner, cwd, prikeys }));
await getKeyrackKeyGrant({ ... }, await genContextKeyrackGrantGet({ owner, cwd }));
```

three different context generators. can these be consolidated?

checked what each needs:
- genKeyrackHostContext: needs prikeys to decrypt host manifest
- genContextKeyrackGrantUnlock: needs prikeys to unlock grants
- genContextKeyrackGrantGet: no prikeys (reads unlocked grants)

they're different contexts for different operations.

**verdict: holds.** each context serves a distinct purpose.

### examined: inferMechFromVault call

```ts
const mech = keySpec?.mech ?? inferMechFromVault({ vault });
```

is this call needed? if we have vault, does mech inference add value?

**verdict: holds.** vault and mech are orthogonal. os.secure vault can have PERMANENT_VIA_REPLICA or EPHEMERAL_VIA_SESSION mechanisms. inference provides sensible defaults.

---

## changes to blueprint

1. rename fixture: genMockKeyrackKeySpec → genMockKeyrackRepoManifest
2. remove `total` from summary (redundant with results.length)
3. simplify output: inline status instead of nested treebucket for v1

---

## conclusion

found 3 deletables:
- fixture name was wrong scope (key spec vs repo manifest)
- summary.total was redundant
- nested output was over-engineered for v1

all other components hold — they serve distinct purposes and are minimal for the requirements.

