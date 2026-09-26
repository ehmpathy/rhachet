# define.enrollment-identity-is-the-roleset-hash

> **an actor's identity IS `sha256({ brain, roles })`, truncated to 8 chars. every per-enrollment
> artifact in this repo is keyed on that one hash.**

`rhx enroll` is **identity-by-roleset**. it mints no id, asks for no name, and keeps no registry of
allocations. the identity is **derived** from what the enrollment asks for — so the same
`{ brain, roles }` always lands on the same actor, in any worktree, on any host, forever.

## .the hash

`genEnrollmentHash.ts` — `sha256(JSON.stringify({ brain, roles: [...roles].sort() })).slice(0, 8)`

two properties the sort and the digest buy, both stated in its own docblock:

- **role ORDER never forks the identity** — `[driver, mechanic]` and `[mechanic, driver]` are one actor
- **a change to the hash SHAPE would orphan every extant actor dir** — so it is a versioned-prefix
  migration if ever touched, never an in-place edit

⚠️ the hash is **one-way**. `brain` and `roles` cannot be recovered from it, which is exactly why
`actor.json` persists them beside it (`findsertActorOndisk.ts:22-24`).

## 🔴 .the two artifacts it keys — check BOTH before you invent a third

| artifact | path | owner |
|---|---|---|
| the actor's on-disk dir | `.agent/.actors/actor.via.hash=<hash>/` | `getActorOndiskDir.ts` |
| the brain-cli config | `.claude/settings.enroll.<hash>.local.json` | `genBrainCliConfigArtifact.ts` |

the dir holds `actor.json` (the identity manifest), the roles log, and the clones. the config file
holds the hook set filtered to the enrolled roles, handed to the cli via
`--setting-sources local --settings <path>` (`asBrainCliSpawnArgs.ts`).

⇒ **a new per-enrollment artifact belongs under one of these two keys.** it does not need a new
namespace, a new id, or a new collision scheme — those exist and are tested.

## 🟢 .the four properties you inherit for free

a reader who does not know this architecture will argue for each of these from scratch, or will
believe they are impossible. they are neither.

| property | how the architecture gives it |
|---|---|
| **per-enrollment isolation** | two rolesets → two hashes → two dirs. **no fixed path is contended** |
| **share-across-clones** | two clones of ONE roleset share the artifact, which is correct — they need the identical content |
| **content-determinism** | the path IS a content address of `{ brain, roles }`, so identical inputs give an identical artifact |
| **no git churn** | `findsertAgentEphemeralGitignore` gitignores `.agent/.actors/` — these dirs are **ephemeral by declaration** |

## 🔴 .concurrency is already solved — do not re-solve it

a bare enroll is create-always, so a cron retry or a parallel burst **races the same hash onto the
same path** on purpose. the extant guard is **temp-write + rename**, used in all three writers
(`genBrainCliConfigArtifact.ts:90-100`, `findsertActorOndisk.ts:50-59`, `setCloneIdentity`):

> *"rename is atomic on POSIX; two racers each write their own temp then rename, and the content is
> identical (same hash → same filtered settings), so last-writer-wins is safe"*

⇒ **identical content is what makes last-writer-wins safe**, and identical content is what the hash
guarantees. the race and its guard are one design, not two.

## ⚠️ .the one precondition every caller owes

`repoPath` must already be the **`getOneRepoPath`-canonical realpath**. both
`getActorsRootDir` and `getActorOndiskDir` say so in their `.note`, for one reason:

> **a symlink or worktree hop would otherwise fork one actor into two dirs.**

`findsertActorOndisk` canonicalizes at its own boundary; a direct caller of the dir transformers
must do it first.

| when… | then… |
|---|---|
| you need a **per-enrollment** file on disk | 🔴 it goes under `actor.via.hash=<hash>/`. do not invent a path |
| you think *"a repo-fixed file cannot serve many clones"* | 🔴 the strongest cue that you have not read this. it serves them by hash |
| you would add a **collision scheme** or an allocated id | both exist. the hash is the scheme and the id |
| you would add a **write lock** for concurrent enrolls | temp+rename already covers it. identical content is why |
| you join `.agent/.actors` as a literal | route through `getActorsRootDir` — it is single-owned on purpose |
| you pass a `repoPath` you did not canonicalize | 🔴 canonicalize first, or a worktree forks the actor |
| you would change what the hash digests | that reshapes every extant dir. versioned prefix, never in place |

## 🔴 .why this is a `say` brief

a reader who lacks this concept reasons to the opposite conclusion, with confidence. three claims
sound true and are false here:

| the claim | why it is false |
|---|---|
| *"one path cannot hold two corpora"* | two rolesets hash to two paths; one roleset needs one corpus |
| *"a file destination adds git noise"* | `.agent/.actors/` is gitignored — ephemeral by declaration |
| *"concurrent enrolls race on the path"* | temp-write + rename; identical content makes last-writer-wins safe |

⇒ the concept carries weight and is non-obvious, so it boots in full.

## .see also

- `define.actor-clone-hierarchy` · `define.actor-clone-partitions` — what sits under the actor
- `define.address-sigils` · `define.clone-reach-states` — how a clone is reached once enrolled
- `rule.require.search-before-you-claim-absence` — read the architecture before you claim a property absent
- `rule.always.reuse-pavement-before-improvise` (bhrain/learner) — its withdrawal half
