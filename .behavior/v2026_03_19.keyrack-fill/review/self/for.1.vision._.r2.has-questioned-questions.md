# self-review: has-questioned-questions

## questions triaged

### questions for wisher

#### Q1: should `--owner` default to `default`?

| triage | disposition |
|--------|-------------|
| can logic answer? | partly — single-owner is common case |
| can code answer? | no — this is a UX preference |
| need wisher? | yes — preference call |

**verdict: [wisher]** — UX preference, wisher decides

---

#### Q2: should there be `--owner @all` mode?

| triage | disposition |
|--------|-------------|
| can logic answer? | yes — requires prikey for each owner, complex for v1 |
| can code answer? | N/A |
| need wisher? | no — can answer via logic |

**verdict: [answered]** — no for v1, too complex. would require:
- discover all owners (how?)
- have prikey for each (unlikely)
- run fill for unknown set of owners (unpredictable)

defer to future if demand exists.

---

#### Q3: empty prikey list + failed decryption = blocker or skip?

| triage | disposition |
|--------|-------------|
| can logic answer? | yes — fail-fast is keyrack pattern |
| can code answer? | yes — keyrack throws BadRequestError on decryption failure |
| need wisher? | no |

**verdict: [answered]** — blocker (fail-fast). if we can't decrypt an owner's manifest, we can't fill that owner. consistent with keyrack's error behavior.

---

#### Q4: `--refresh` single key — all owners or only absent?

| triage | disposition |
|--------|-------------|
| can logic answer? | yes — if user says --refresh, they want refresh |
| can code answer? | N/A |
| need wisher? | no |

**verdict: [answered]** — prompt for all specified owners. if user says `--refresh --key FOO`, they want FOO refreshed everywhere. `--refresh` is the override; without it, skip configured keys.

---

### questions for research

#### Q5: current prikey discovery mechanism?

| triage | disposition |
|--------|-------------|
| can logic answer? | no |
| can code answer? | yes — found in daoKeyrackHostManifest |
| need research? | no — answered via extant code |

**verdict: [answered]** — discovered from code:

`getAllAvailableIdentities()` in `src/access/daos/daoKeyrackHostManifest/index.ts`:
1. checks ssh-agent first (most likely to have unlocked key)
2. then checks standard ssh paths (~/.ssh/id_ed25519, ~/.ssh/id_rsa, etc)
3. converts ssh keys to age identities via `sshPrikeyToAgeIdentity`

`--prikey` flag would add to this pool. the code already supports trial-decryption against multiple identities.

---

#### Q6: how does keyrack.yml extends work?

| triage | disposition |
|--------|-------------|
| can logic answer? | no |
| can code answer? | yes — found in daoKeyrackRepoManifest/hydrate |
| need research? | no — answered via extant code |

**verdict: [answered]** — discovered from code:

`hydrateKeyrackRepoManifest.ts`:
1. keys can be bare strings (`CLOUDFLARE_API_TOKEN`) or objects with grade (`{ CLOUDFLARE_API_TOKEN: 'encrypted' }`)
2. grades support: `encrypted`, `ephemeral`, `encrypted,ephemeral`
3. extends are loaded and merged (loadManifestExplicit → hydrateKeyrackRepoManifest)

the fill command can use `daoKeyrackRepoManifest.getAll()` to get flattened keys per env.

---

## summary

| question | original status | new status |
|----------|-----------------|------------|
| Q1: --owner default | [wisher] | [wisher] |
| Q2: --owner @all | [wisher] | [answered] — no for v1 |
| Q3: failed decryption | [wisher] | [answered] — blocker |
| Q4: --refresh scope | [wisher] | [answered] — all owners |
| Q5: prikey discovery | [research] | [answered] — via code |
| Q6: extends mechanism | [research] | [answered] — via code |

**left for wisher:** 1 question (--owner default)
**answered via logic/code:** 5 questions

---

## updates to vision needed

the vision's "questions for wisher" section should be updated to reflect triaged answers.
