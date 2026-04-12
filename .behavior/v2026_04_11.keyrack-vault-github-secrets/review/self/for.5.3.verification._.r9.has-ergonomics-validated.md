# self-review: has-ergonomics-validated (r9)

## question

> does the actual input/output match what felt right at repros?

## analysis

### repros artifact check

no repros artifact exists for this feature (confirmed in r5). the behavior route skipped from research (3.1) to blueprint (3.3).

ergonomics compared against wish (0.wish.md) instead.

### wish ergonomics

the wish specified:

| requirement | description |
|-------------|-------------|
| vault name | `github.secrets` |
| get behavior | failfast (write-only) |
| status awareness | "exists if set" (status = locked) |
| mechanism support | EPHEMERAL_VIA_GITHUB_TOKEN (now EPHEMERAL_VIA_GITHUB_APP) |
| set path | `--vault github.secrets` |

### implementation ergonomics

verified `vaultAdapterGithubSecrets.ts`:

| requirement | implementation | match? |
|-------------|----------------|--------|
| vault name | `github.secrets` | yes |
| get behavior | `get: null` → callers handle null | yes |
| status awareness | callers check grant.vault → status = locked | yes |
| mechanism support | `EPHEMERAL_VIA_GITHUB_APP`, `PERMANENT_VIA_REPLICA` | yes |
| set path | vault adapter registered, usable via `--vault github.secrets` | yes |

### output ergonomics

verified console output for EPHEMERAL_VIA_GITHUB_APP mech:

```
🔐 keyrack set $slug via EPHEMERAL_VIA_GITHUB_APP
   │
   └─ ✓ pushed to github.secrets (no roundtrip — write-only vault)
```

this matches expected turtle vibes treestruct output:
- clear indication of vault and mech used
- explicit "no roundtrip" notice for write-only semantics
- braille blank for visual space (survives PTY capture)

### mech guided setup

verified `mech.acquireForSet` called before `ghSecretSet`:
- mech adapter owns the guided setup prompts
- vault adapter does not reinvent prompts
- follows pattern established in other vault adapters

### input ergonomics

verified `set` signature:

```ts
set: async (
  input: {
    slug: string;
    mech?: KeyrackGrantMechanism | null;
    exid?: string | null;
    expiresAt?: string | null;
  },
  context?: ContextKeyrack,
)
```

matches standard vault adapter input shape — no surprises.

### output ergonomics

verified `set` return:

```ts
return { mech, exid: repo };
```

- `mech` = resolved mechanism used
- `exid` = github repo (owner/repo format)

exid stored for del operation — enables idempotent delete.

### gh cli invocation ergonomics

verified actual gh CLI args via test assertions:

**set path:**
```
gh secret set API_KEY --repo ehmpathy/rhachet
input: test-secret-value (via stdin)
```

**del path:**
```
gh secret delete API_KEY --repo ehmpathy/rhachet
```

ergonomics confirmed:
- secret piped via stdin (not visible in process args or ps output)
- repo specified via `--repo` flag
- secret name extracted from slug (drops org.env prefix)

### nested key name ergonomics

verified slug `ehmpathy.test.SOME.NESTED.KEY` extracts secret name `SOME.NESTED.KEY`:

```
gh secret set SOME.NESTED.KEY --repo ehmpathy/rhachet
```

handles dots in key names correctly — only first two segments (org.env) stripped.

### wish requirement: mock gh api correctly

from wish:
> ensure to mock the gh api correctly when you write tests against these

verified in test file:
- `jest.mock('node:child_process')` for gh CLI
- `mockExecSync` for `gh auth status`
- `mockSpawnSync` for `gh secret set/delete`
- mech adapters mocked for guided setup

mocks correctly simulate gh CLI behavior per wish requirement.

## why it holds

1. vault name matches wish (`github.secrets`)
2. get behavior matches wish (`get: null` for write-only)
3. mechanism support matches wish (EPHEMERAL_VIA_GITHUB_APP)
4. output includes clear "no roundtrip" notice
5. mech guided setup reused (not reinvented)
6. input/output shapes match standard vault adapter patterns

## verdict

**holds (n/a)** — no repros artifact; ergonomics match wish and standard patterns

