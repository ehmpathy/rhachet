# rule.require.cli-tolerates-non-repo-cwd

## .what

the rhx CLI must run from a cwd that is NOT inside a git repo — CLI-wide, not only for keyrack.
the CLI-wide bootstrap tolerates a non-repo cwd by design.

## .why

- global rhx support is a deliberate long-term direction (owner-confirmed, 2026-08-03)
- a credential helper — and other uses — invoke the whole CLI bootstrap from arbitrary clones or
  non-repo dirs, BEFORE any subcommand runs. a repo-required bootstrap crashes there, so a
  subcommand-only fix does not help — the crash precedes the subcommand
- `@all` (machine-wide) keyrack keys must be readable with zero repo context (the bootstrap-root
  case: the credential that clones the first repo cannot itself need a cloned repo)

## .how

- the shared helper `src/infra/git/getGitRepoRootOrNull.ts` wraps `getGitRepoRoot` and yields
  `null` for the benign no-repo case (never a throw); it lives in `src/infra/` (cross-layer)
- the CLI-wide bootstrap `genContextCli` (`src/domain.objects/ContextCli.ts`) uses it and falls
  back to `cwd` when the gitroot is `null`
- the keyrack read paths (`getKeyrackKeyGrants`, `invokeKeyrack` get/unlock) also use the
  null-tolerant helper, so the gitroot flows as `string | null` and a null repo manifest is handled

## .the direction

when you touch the CLI bootstrap or add a command:

- do NOT reintroduce a hard `getGitRepoRoot` that throws outside a repo in the bootstrap path
- do NOT narrow the tolerance to keyrack-only — the owner approved the broad blast radius (every
  rhx command tolerates a non-repo cwd) as the intended direction
- a command that genuinely needs a repo may still assert one in its OWN handler (set/del/source/
  status do), but the shared bootstrap stays repo-optional

## .enforcement

- a repo-required throw added to the CLI-wide bootstrap (`genContextCli`) = blocker
- a narrow of the non-repo-cwd tolerance back to keyrack-only = blocker
