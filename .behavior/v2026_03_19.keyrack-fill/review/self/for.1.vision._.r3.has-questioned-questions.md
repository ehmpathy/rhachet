# self-review r3: has-questioned-questions

## verification: vision questions section updated

the vision's "questions for wisher" and "questions answered via triage" sections have been updated to reflect the triaged answers.

### before triage

vision had 6 open questions spread across "questions for wisher" and "questions for research" sections.

### after triage

vision now has:

**questions for wisher (1):**
1. should `--owner` default to `default` if not specified?

**questions answered via triage (5):**

| question | answer |
|----------|--------|
| `--owner @all` mode? | no for v1 — too complex (requires prikey for each owner) |
| failed owner decryption = blocker? | yes — fail-fast pattern, consistent with keyrack |
| `--refresh` scope? | all specified owners — if user says --refresh, they want refresh |
| prikey discovery mechanism? | ssh-agent first, then ~/.ssh/id_ed25519 etc, converts to age identity |
| how extends works? | keys merged from extends, supports bare strings or objects with grade |

---

## why the triage holds

### Q1: `--owner @all` mode — answered via logic

**logic:** `@all` would require:
- discover all owners (how? no mechanism exists)
- have prikey for each (unlikely — user doesn't have everyone's prikey)
- run fill for unknown set of owners (unpredictable)

this is correctly deferred to v1. the answer follows from the constraints.

### Q2: failed owner decryption = blocker — answered via code

**code evidence:** `daoKeyrackHostManifest` throws `BadRequestError` when no prikey can decrypt the manifest. this is the extant pattern.

**logic:** if we can't decrypt an owner's manifest, we can't know which vault to use. partial success would leave the user confused.

fail-fast is correct.

### Q3: `--refresh` scope — answered via logic

**logic:** `--refresh` is an explicit override. user invokes it to re-fill. if they say `--refresh`, they want all specified owners refreshed.

to scope `--refresh` to "only absent" would be a surprise — that's the default behavior without `--refresh`.

### Q4: prikey discovery mechanism — answered via code

**code evidence:** `getAllAvailableIdentities()` in `daoKeyrackHostManifest`:
1. checks ssh-agent first (most likely to have unlocked key)
2. then checks standard ssh paths (~/.ssh/id_ed25519, ~/.ssh/id_rsa, etc)
3. converts ssh keys to age identities via `sshPrikeyToAgeIdentity`

this mechanism already exists. `--prikey` flag extends this pool.

### Q5: how extends works — answered via code

**code evidence:** `hydrateKeyrackRepoManifest.ts`:
- loads manifests from extends paths
- merges keys into flattened structure
- keys can be bare strings (`CLOUDFLARE_API_TOKEN`) or objects with grade (`{ CLOUDFLARE_API_TOKEN: 'encrypted' }`)

fill command can use `daoKeyrackRepoManifest.getAll()` to get flattened keys per env.

---

## question left for wisher

**Q1: should `--owner` default to `default` if not specified?**

this cannot be answered via logic or code because:
- single-owner is common case → suggests default
- multi-owner is explicit → suggests require specification
- both are valid UX choices

this is a preference call. wisher decides.

---

## r3 conclusions

the vision's questions section accurately reflects:
- 1 question for wisher (correctly identified as preference call)
- 5 questions answered via triage (each with evidence from logic or code)

the triage holds because each answered question has:
- clear evidence (code reference or logical constraint)
- no ambiguity left
- consistent application of extant patterns (fail-fast, keyrack conventions)

