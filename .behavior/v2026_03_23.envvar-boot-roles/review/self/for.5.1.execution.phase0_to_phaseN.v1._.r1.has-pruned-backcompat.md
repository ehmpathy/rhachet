# self-review: has-pruned-backcompat

## summary

reviewed all implementation files for backwards compatibility concerns that were not explicitly requested.

**verdict: no backwards compatibility shims found.**

## artifacts reviewed

- `src/contract/cli/invokeEnroll.ts`
- `src/domain.operations/enroll/parseBrainCliEnrollmentSpec.ts`
- `src/domain.operations/enroll/computeBrainCliEnrollment.ts`
- `src/domain.operations/enroll/genBrainCliConfigArtifact.ts`
- `src/domain.operations/enroll/enrollBrainCli.ts`

## findings

### 1. brain alias map (non-issue)

**location**: `enrollBrainCli.ts:54-56`
```ts
const brainCommands: Record<string, string> = {
  claude: 'claude',
  'claude-code': 'claude',
};
```

**assessment**: this is NOT backwards compatibility — it supports two valid names for the same brain. the wish document uses both "claude" and "claude-code" interchangeably. this is intentional aliased support, not legacy support.

### 2. stale error message (minor issue, not backcompat)

**location**: `parseBrainCliEnrollmentSpec.ts:23`
```ts
throw new BadRequestError('--roles is empty, omit flag to use defaults', {...});
```

**assessment**: the message says "omit flag to use defaults" but `--roles` is required per spec. however:
- this is NOT backwards compat code
- this path cannot be reached via CLI (`.requiredOption()` enforces the flag)
- this is unreachable dead code for the CLI usecase
- only reachable if the parser is invoked directly with empty string

**action**: not a backwards compat concern. the error message is technically inaccurate but the code path is unreachable in practice. no fix needed for this review.

### 3. no other backcompat concerns found

- no legacy fallbacks
- no deprecated parameter support
- no migration logic
- no "just in case" compatibility shims
- no special treatment for old config formats

## conclusion

the implementation is clean and focused on the current spec. no backwards compatibility code was introduced that was not explicitly requested.
