# inventory.of=fulcrums

axis = case (occurrence, declared as it arises)

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | the one with-simple-mutex owner stays withRepoMutex.ts, which now hosts withDiskMutex | clean | settled | 90% |
| F2 | the post-login refresh reads no cache, deletes it, and overwrites it | clean | best-guessed | 85% |
| F3 | cache rests on disk owner-only, 15 min margin, dropped on the vault relock | clean | best-guessed | 85% |
| F4 | no failure marker for waiters behind a failed or hung export | clean | best-guessed | 75% |
| F5 | the refresh deletes the entry before it queues; an in-flight pre-login read export is the residue | clean | best-guessed | 80% |
| F6 | a wait on a peer's export is announced once per wait, on stderr | clean | best-guessed | 85% |
| F7 | the op is named `genAwsProfileExport`, not the vision's `getOneAwsProfileExport` | clean | best-guessed | 85% |
| F8 | the husky practice's hooks are fixed upstream, never patched in this tree | clean | best-guessed | 90% |
| F9 | `setFileAtomic` keeps node's default file mode; the secret caller passes `0o600` | clean | best-guessed | 88% |
| F10 | the per-unlock `aws sts get-caller-identity` gets a hang guard and a safe quote, not a cache | clean | partly done | 80% |
| F11 | each export surface is proven at the grain that can reach it: the cli where the mock reaches, the integration grain for the hang and lease bounds | clean | settled | 85% |
| F12 | the export runs via `exec` with a single-quoted profile, not `execFile` | clean | best-guessed | 80% |
| F13 | the export op's shape is held at nano: one file, its mech's home, its own notice, a per-call dir ensure | clean | best-guessed | 80% |
| F14 | the unlock's errored row shows an export malfunction's hint after its retry, by opt-in | clean | done | 85% |
| F15 | `rhx keyrack relock` drops the export cache, and stays unwired to the vault relock | clean | partly done | 80% |
| F16 | the cache holds the exported creds, as the wish names, not a stamp | clean | best-guessed | 70% |
| F17 | an aws.config grant follows the creds' real expiry, in either form the cli prints | clean | best-guessed | 75% |
| F18 | the unlock's errored row stays one `tip` leaf | clean | best-guessed | 75% |
| F19 | the extant unit files keep their module mocks; new cases follow the file's shape | clean | best-guessed | 75% |
| F20 | `getError` over the sync cache drop stays unawaited | clean | best-guessed | 95% |
| F21 | the findsert daemon spawn's two error branches stay unclamped at their fixed bounds | clean | best-guessed | 80% |
| F22 | the snapped row texts of this pr hold as written | clean | best-guessed | 75% |
| F23 | the non-sso refusal names os.direct as the second cure | clean | best-guessed | 85% |
| F23 | the non-sso refusal names os.direct as the second cure | clean | best-guessed | 85% |
