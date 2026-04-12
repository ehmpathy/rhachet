# self-review: has-critical-paths-frictionless (r8)

## question

> are the critical paths frictionless in practice?

## analysis

### repros artifact

no repros artifact exists (see r5 review). critical paths derived from criteria instead.

### critical paths from criteria

| path | description |
|------|-------------|
| set via PERMANENT_VIA_REPLICA | prompt for secret, push to gh, update manifest |
| set via EPHEMERAL_VIA_GITHUB_APP | guided setup, push json blob to gh |
| del | remove from gh, update manifest |
| get | fail fast with clear error (write-only vault) |

### verification: can I run these manually?

**constraint:** cannot run actual commands because:
1. gh cli requires auth to a real github account
2. tests mock gh cli behavior
3. this is a domain operation, not a CLI acceptance test

**what I can verify:** code paths are frictionless by design.

### code review: friction points

#### set path

verified `vaultAdapterGithubSecrets.set`:
```ts
// 1. validate gh auth (fail fast)
// 2. call mech.acquireForSet for secret/source
// 3. call ghSecretSet to push
// 4. return { mech, exid }
```

**friction check:**
- auth validated upfront (no late failure)
- mech adapter handles prompted setup (not reinvented)
- gh cli invoked via spawn (secret piped to stdin, not visible in process list)

#### del path

verified `vaultAdapterGithubSecrets.del`:
```ts
// 1. validate gh auth (fail fast)
// 2. call ghSecretDelete
```

**friction check:**
- auth validated upfront
- idempotent delete (gh cli handles absent secret gracefully)

#### get path

verified `vaultAdapterGithubSecrets.get === null`:
```ts
// get is null (write-only vault)
// caller handles null get with clear error
```

**friction check:**
- fail fast at vault adapter interface level
- no late failure deep in call stack
- type system enforces caller handles null

### error messages

checked error paths in ghSecretSet and ghSecretDelete:

| scenario | error class | message |
|----------|-------------|---------|
| gh not authenticated | BadRequestError | "gh auth required" with hint |
| invalid repo format | BadRequestError | "repo must be in owner/repo format" |
| gh cli failure | UnexpectedCodePathError | "gh secret set failed" with stderr |

**friction check:**
- errors include hints for resolution
- stderr from gh cli is forwarded (not swallowed)
- error classes distinguish caller-fix vs server-fix

## why it holds

1. critical paths follow fail-fast pattern (auth checked upfront)
2. mech adapters handle prompted setup (reused, not reinvented)
3. secrets are piped via stdin (not visible in process list)
4. errors include hints and context
5. get === null enables fail-fast at interface level

## verdict

**holds** — code paths are designed for minimal friction; errors are clear with hints

