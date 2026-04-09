# review: has-consistent-conventions

## question

for each changed file, ask:
- does it follow name conventions?
- does it follow code style conventions?
- does it follow comment conventions?

## review

### name conventions

#### files

| pattern | examples | compliant |
|---------|----------|-----------|
| mechAdapter*.ts | mechAdapterReplica.ts, mechAdapterGithubApp.ts | ✓ |
| vaultAdapter*.ts | vaultAdapterOsSecure.ts, vaultAdapterAwsConfig.ts | ✓ |
| infer*.ts | inferKeyrackMechForSet.ts | ✓ |

#### functions

| pattern | examples | compliant |
|---------|----------|-----------|
| verb prefix | acquireForSet, deliverForGet, validate | ✓ |
| no gerunds | acquireForSet not acquireFor* with -ing | ✓ |
| [noun][adj] order | n/a in this changeset | ✓ |

#### constants

| pattern | examples | compliant |
|---------|----------|-----------|
| UPPER_SNAKE | LONG_LIVED_PATTERNS | ✓ |

### code style

#### arrow functions

all procedures use arrow syntax:

```ts
export const mechAdapterReplica: KeyrackGrantMechanismAdapter = { ... };
export const inferKeyrackMechForSet = async (input: ...) => { ... };
```

compliant: ✓

#### input-context pattern

all operations follow (input, context?) pattern:

| operation | signature |
|-----------|-----------|
| acquireForSet | `(input: { keySlug }) => Promise<...>` |
| deliverForGet | `(input: { source }) => Promise<...>` |
| vault.set | `(input: { slug, mech?, ... }) => Promise<...>` |
| vault.get | `(input: { slug, mech?, ... }) => Promise<...>` |

compliant: ✓

#### fail-fast

all error cases use UnexpectedCodePathError with context:

```ts
throw new UnexpectedCodePathError('aws.config does not support mech: ${mech}', {
  mech,
  supported: vaultAdapterAwsConfig.mechs.supported,
  hint: 'aws.config is for aws sso only; try --vault os.secure for other mechs',
});
```

compliant: ✓

### comment conventions

#### .what / .why headers

verified in all new/changed files:

```ts
/**
 * .what = mechanism adapter for replica credentials
 * .why = passthrough with validation to block long-lived tokens
 */
```

compliant: ✓

### conclusion

all conventions followed:
- names: file names, function names, constants
- code style: arrow functions, input-context pattern, fail-fast
- comments: .what/.why headers present
