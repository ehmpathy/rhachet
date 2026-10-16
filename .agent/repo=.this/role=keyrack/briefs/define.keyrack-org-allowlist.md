# define.keyrack-org-allowlist

## .what

a manifest's `org:` is an **allowlist**: one org, or a list of orgs this repo may address.

```yaml
# .agent/keyrack.yml
org:
  - ahbode      # 🔴 the FIRST is the DEFAULT — what @this and a bare read name
  - bhanya      # allowlisted — reachable via --org bhanya
```

a scalar `org: ahbode` is valid, and is a one-member allowlist. every manifest that predates the list reads as before.

⚠️ **one exception: a scalar `org: '@all'` is the grove scope, not a member.** it declares keys of no org (`define.root-org-inheritance.md`), and stays valid as before. a list may not hold it — `org: ['@all']` and any list that names `@all` or `@this` are refused at parse, since neither sigil names an org.

## 🔴 .the first entry is the default — by place, never by label

| you pass | keyrack addresses |
|---|---|
| no `--org`, or `--org @this` | `org[0]` — the default |
| `--org bhanya` (a member) | `bhanya` |
| `--org whodis` (not a member) | 🔴 refused, exit 2: `--org 'whodis' is not on this manifest's org allowlist` |
| `--org @all` | the machine-wide keys, as before |

⚠️ **a reorder of the list repoints every bare read.** to move `bhanya` above `ahbode` is to change what `@this` means for every call that omits `--org`. treat the first line with the same care as a swap of a scalar `org:`.

## .how to file a member's key

```sh
rhx keyrack set --key AWS_PROFILE --env camp --org bhanya   # files bhanya.camp.AWS_PROFILE
rhx keyrack del --key AWS_PROFILE --env camp --org bhanya   # removes only that row
```

the default org's row (`ahbode.camp.AWS_PROFILE`) is untouched, and the `org:` list stays as written.

## .what a member read does

- **one declared key set serves every member.** `env.*` lists key NAMES once. a `--org bhanya` read or sweep re-slugs those names under `bhanya` (`bhanya.camp.AWS_PROFILE`).
- **a member sweep reports an unheld key as absent**, the same as any sweep. a key only one member holds still sits in the shared list.
- **`extends:` does not union orgs.** an extended manifest contributes its keys, never its `org:` list. the allowlist is this manifest's own.
- **a repo sweep is gated; a host sweep is not.** `unlock`, `source`, and `get --for repo` re-slug the manifest's keys under a member, so they refuse a non-member `--org`. `status` and `list` filter the slugs this host already holds, so `--org` there is a plain filter over any org, and no allowlist applies.
- **a slug and a `--org` that name two different members conflict.** `get`, `set`, and `del` all refuse `--org bhanya` on `ahbode.camp.KEY` with the same message: drop `--org`, or match it to the slug.

## .why a list, not a second manifest

a repo whose fleet spans orgs (a grove of `ahbode` and `bhanya` boxes) had one `org:` line, so `@this` could address one org and `--org bhanya` refused with no legal door. the list makes the second org a declared member: still refused for a typo, permitted for a member.

## .see also

- `define.keyrack-org-scope.grove-vs-tree.md` — what an org scope reaches
- `define.root-org-inheritance.md` — the `@all` root
- `src/domain.operations/keyrack/asKeyrackOrgMismatchRefusal.ts` — the one refusal every non-member hits
