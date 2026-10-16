# F8 — status and list apply no allowlist gate; they are host sweeps

## .the fork

case=5 says a nonmember `--org` on a `sweep` is refused, never an empty rack. keyrack has two kinds of sweep:

- **repo sweeps** — `unlock`, `get --for repo`, `source`. they enumerate the keys the repo MANIFEST declares
- **host sweeps** — `status`, `list`. they enumerate the slugs the HOST holds, and never read the declared keys

does the allowlist gate apply to both, or to the repo sweeps alone?

## .taken — repo sweeps alone

- the allowlist says which orgs a REPO may read. a repo sweep reads under the repo's name, so it is gated
- a host sweep shows what this box holds, which may include keys of orgs this repo never names. `status --org someorg` from inside a repo is a legit ask; when it is empty, it is an honest answer that names its cause (`define.invariant.empty-render-names-its-cause`)
- that behavior is pinned by `keyrack.machine-wide-skips-manifest` [case2][t2b], which asserts exit 0 for an off-manifest org. a gate there broke 5 of its asserts, and refusal would remove a read a human relies on
- a member narrow on a host sweep needs no re-slug either: the host slugs already carry the member org (allowlist [t8])

## .rework — clean

to gate the host sweeps too is one call to `assertKeyrackFilterOrgOnAllowlist` in `getOneKeyrackFilterOrg`, plus a flip of [case2][t2b]'s exit-code asserts. no caller hardens against the current shape.

## .confidence — 75%, and why it is low

case=5's cell names `sweep` without a split by kind, so a reader of the vision alone could expect status and list to refuse. the call rests on the extant pinned invariant, not on a word from the wisher.

## .where

- `src/domain.operations/keyrack/cli/getOneKeyrackFilterOrg.ts` (unchanged from main)
- `src/domain.operations/keyrack/asKeyrackRepoManifestForOrgFilter.ts` (the repo-sweep gate)

## .verdict

open — for the fulcrum council.
