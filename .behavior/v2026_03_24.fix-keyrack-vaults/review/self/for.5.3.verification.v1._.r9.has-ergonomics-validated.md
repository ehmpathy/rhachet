# self-review r9: has-ergonomics-validated

## deeper pass: verified actual cli input/output ergonomics

r8 compared vision outputs to snapshot outputs. this pass verifies actual cli invocation ergonomics from acceptance tests.

---

## os.daemon: actual cli invocation

from `keyrack.vault.osDaemon.acceptance.test.ts`:

```typescript
invokeRhachetCliBinary({
  args: [
    'keyrack',
    'set',
    '--key', 'DAEMON_KEY',
    '--env', 'test',
    '--vault', 'os.daemon',
    '--json',
  ],
  stdin: 'ephemeral-daemon-secret\n',
})
```

### input ergonomics match?

| input | vision | actual | match? |
|-------|--------|--------|--------|
| command | `rhx keyrack set` | `keyrack set` | yes |
| --key | `--key API_KEY` | `--key DAEMON_KEY` | yes |
| --vault | `--vault os.daemon` | `--vault os.daemon` | yes |
| --env | `--env prod` | `--env test` | yes |
| secret | prompt via stdin | `stdin: '...\n'` | yes |

holds — input format matches vision.

### output ergonomics match?

from actual test assertions:

```typescript
expect(parsed.slug).toEqual('testorg.test.DAEMON_KEY');
expect(parsed.vault).toEqual('os.daemon');
expect(parsed.mech).toEqual('EPHEMERAL_VIA_SESSION');
```

| output | vision | actual | match? |
|--------|--------|--------|--------|
| slug | `ehmpathy.prod.API_KEY` | `testorg.test.DAEMON_KEY` | yes (format match) |
| vault | `os.daemon` | `os.daemon` | yes |
| mech | `EPHEMERAL_VIA_SESSION` | `EPHEMERAL_VIA_SESSION` | yes |

holds — output format matches vision.

---

## 1password: actual cli invocation

from `keyrack.vault.1password.acceptance.test.ts`:

```typescript
// set validates exid format
invokeRhachetCliBinary({
  args: [
    'keyrack', 'set',
    '--key', 'INVALID_KEY',
    '--env', 'test',
    '--vault', '1password',
  ],
  stdin: 'not-an-op-uri\n',
})
```

### input ergonomics match?

| input | vision | actual | match? |
|-------|--------|--------|--------|
| command | `rhx keyrack set` | `keyrack set` | yes |
| --key | `--key API_KEY` | `--key INVALID_KEY` | yes |
| --vault | `--vault 1password` | `--vault 1password` | yes |
| exid prompt | "enter 1password uri" | stdin for exid | yes |

holds — input format matches vision.

---

## op cli absent: actual cli invocation

from test case6:

```typescript
// simulate op cli not installed via PATH manipulation
invokeRhachetCliBinary({
  args: [
    'keyrack', 'set',
    '--key', 'SOME_KEY',
    '--env', 'test',
    '--vault', '1password',
  ],
  env: { ...env, PATH: '/nonexistent' }, // force op cli not found
})
```

### output ergonomics match?

| output | vision | actual | match? |
|--------|--------|--------|--------|
| exit code | 2 | `expect(result.status).toEqual(2)` | yes |
| error | "op cli not found" | `expect(output).toMatch(/op/i)` | yes |
| instructions | install guidance | `expect(output).toContain('install')` | yes |

holds — error ergonomics match vision.

---

## no drift found

all three critical paths have ergonomics that match vision:

1. **os.daemon set**
   - input: `--key X --vault os.daemon --env Y` + stdin secret
   - output: json with slug, vault, mech=EPHEMERAL_VIA_SESSION

2. **1password set**
   - input: `--key X --vault 1password --env Y` + stdin exid
   - output: validates exid format, stores pointer

3. **op cli absent**
   - input: `--vault 1password` when op not in PATH
   - output: exit 2, mentions op cli, includes install guidance

---

## conclusion

verified actual cli invocation patterns from acceptance tests. all input/output ergonomics match vision.stone design.

holds.
