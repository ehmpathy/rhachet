# ref: secure passphrase input options

## .what

methods to securely pass passphrases to CLI applications, ranked by security.

## .why

- command line args leak to shell history and `ps` output
- environment variables leak to child processes and `/proc/<pid>/environ`
- need secure alternatives that don't persist or propagate

## .options (ranked best to worst)

### 1. interactive tty prompt (recommended)

read passphrase directly from terminal with echo disabled.

```typescript
import * as readline from 'readline';

const promptPassphrase = async (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // disable echo
  process.stdout.write('passphrase: ');
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};
```

**pros**: never persisted, never visible in process list
**cons**: requires tty (not available in all CI/CD)

### 2. stdin pipe

read passphrase from stdin when piped.

```bash
echo "$PASSPHRASE" | keyrack unlock --env sudo --key X
# or
keyrack unlock --env sudo --key X < /path/to/passphrase-file
```

**pros**: not in shell history, not in process args
**cons**: echo command may still log; file must be secured

### 3. memory-backed file descriptor

pass via file descriptor to in-memory file (linux only).

```bash
# create memory-backed fd
exec 3<<< "$PASSPHRASE"
keyrack unlock --env sudo --key X --passphrase-fd 3
exec 3<&-
```

**pros**: never touches disk, fd closed after use
**cons**: linux-specific, complex

### 4. secret reference (1password, vault)

store a reference, fetch at runtime.

```bash
export KEYRACK_PASSPHRASE="op://vault/keyrack/passphrase"
op run -- keyrack unlock --env sudo --key X
```

**pros**: actual secret never in env, audit trail
**cons**: requires external tool, network dependency

### ~~5. environment variable~~ (removed)

env vars leak to `/proc/<pid>/environ` and child processes. stdin pipe covers the same use cases with better security.

## .recommendation for keyrack

1. **primary**: interactive tty prompt (works for humans)
2. **fallback**: stdin pipe (works for automation without tty)

never support:
- `--passphrase` flag — leaks to shell history
- `KEYRACK_PASSPHRASE` env var — leaks to `/proc/<pid>/environ` and child processes

stdin pipe covers all automation use cases that env var would cover, with better security.

## .sources

- [do not use secrets in environment variables](https://www.nodejs-security.com/blog/do-not-use-secrets-in-environment-variables-and-here-is-how-to-do-it-better)
- [how to handle secrets on the command line](https://smallstep.com/blog/command-line-secrets/)
- [1password cli secret references](https://developer.1password.com/docs/cli/secret-references/)
- [storing secrets in env vars considered harmful](https://blog.arcjet.com/storing-secrets-in-env-vars-considered-harmful/)
