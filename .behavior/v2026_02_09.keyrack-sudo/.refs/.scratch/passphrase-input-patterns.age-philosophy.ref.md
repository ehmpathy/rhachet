# ref: age's philosophy on passphrase input

## .what

deep dive into why age (the modern encryption tool) deliberately makes passphrase-based encryption inconvenient, and what keyrack can learn from this.

---

## .age's design philosophy

age was created by Filippo Valsorda (Go security lead at Google) as a simple, modern alternative to GPG. a core design choice: **make passphrases hard to use**.

### the deliberate friction

age supports two encryption modes:
1. **key-based** (recipient's public key) — easy, recommended
2. **passphrase-based** (`-p` flag) — works, but deliberately inconvenient

the inconvenience is intentional:

> "age is designed to steer users towards key-based encryption. passphrase-based encryption is supported but not encouraged."
> — age documentation

### why discourage passphrases?

Filippo's rationale (from [discussion #275](https://github.com/FiloSottile/age/discussions/275)):

| concern | explanation |
|---------|-------------|
| **weak passphrases** | humans choose predictable passphrases; keys are random |
| **reuse** | passphrases get reused across systems; keys are unique |
| **brute force** | passphrases can be brute-forced; keys cannot |
| **key derivation cost** | scrypt/argon2 adds latency; keys are instant |
| **operational complexity** | passphrases require secure input; keys can be in files |

### the batchpass workaround

age doesn't provide a built-in `--passphrase` flag or `AGE_PASSPHRASE` env var. users who need automation must:

1. use stdin pipe: `echo "$PASS" | age -d -p file.age` (unsafe — `ps` visible)
2. use a plugin like `age-plugin-batchpass` that reads from env var
3. use key-based encryption instead (age's preferred answer)

the absence of a convenient passphrase input method is a **feature**, not a bug.

---

## .the tradeoff age made

### what age optimized for

| priority | how age achieves it |
|----------|---------------------|
| **security by default** | keys > passphrases; no unsafe defaults |
| **simplicity** | fewer options = fewer mistakes |
| **correctness** | hard to misuse; pit of success |

### what age sacrificed

| sacrifice | implication |
|-----------|-------------|
| **passphrase convenience** | automation with passphrases is awkward |
| **backwards compatibility** | users with passphrase-based workflows struggle |
| **universal adoption** | some usecases require passphrases (user-chosen secrets) |

---

## .keyrack's different context

keyrack has a different problem than age:

| aspect | age | keyrack |
|--------|-----|---------|
| **primary usecase** | encrypt files for recipients | unlock credentials for workflows |
| **who holds the secret** | recipient's key (file-based) | user's passphrase (memory-based) |
| **automation needs** | occasional | frequent (ci, scripts, terraform) |
| **credential lifetime** | until decrypted | session-scoped with TTL |

### why keyrack needs passphrases

keyrack's encrypted host manifest (`keyrack.host.yml.age`) protects credential metadata. the user must prove identity to decrypt it.

options:
1. **key file** — where do you store the key? another secret to manage
2. **hardware token** — not universally available
3. **passphrase** — user's memory; no file to protect

for keyrack's usecase, passphrase is the right choice. the question is: **how to accept it safely?**

---

## .what keyrack can learn from age

### lesson 1: don't provide `--passphrase` flag

age doesn't offer `--passphrase "secret"` because it leaks to:
- shell history (`~/.bash_history`)
- process list (`ps aux`)
- audit logs

keyrack should follow: **no passphrase in command arguments**.

### lesson 2: don't provide env var by default

age doesn't read `AGE_PASSPHRASE` because env vars leak to:
- `/proc/<pid>/environ` (readable by same user)
- child processes (inherited automatically)
- crash dumps and logs

keyrack should follow: **no passphrase from env var**.

### lesson 3: tty prompt is the gold standard

age prompts interactively when possible. tty input:
- never appears in process list
- never written to disk
- can disable echo

keyrack should follow: **tty prompt as primary method**.

### lesson 4: explicit opt-in for unsafe methods

age requires the user to figure out stdin pipe themselves. docker requires `--password-stdin` flag.

keyrack should follow: **require explicit flag for stdin pipe** (see `--passphrase-stdin` pattern in `passphrase-input-patterns.ref.md`).

---

## .keyrack's recommended approach

based on age's philosophy + docker's ergonomics:

```
priority order:
1. tty prompt (safest, default)
2. file redirect (safe, no `ps` exposure)
3. stdin pipe with --passphrase-stdin flag (user acknowledges risk)
```

### detection logic

```typescript
const getPassphraseInputMethod = (flags: { passphraseStdin?: boolean }): 'tty' | 'file' | 'pipe' => {
  // tty is always preferred
  if (process.stdin.isTTY) return 'tty';

  // check stdin type
  const stats = fs.fstatSync(0);

  // file redirect is safe (no argv exposure)
  if (stats.isFile()) return 'file';

  // pipe requires explicit opt-in
  if (stats.isFIFO()) {
    if (!flags.passphraseStdin) {
      throw new Error(
        'passphrase input via pipe requires --passphrase-stdin flag\n\n' +
        'why: commands like `echo "pass" | keyrack` may expose passphrase in `ps`\n\n' +
        'if your pipe source is safe (e.g., secret-tool, pass), add --passphrase-stdin:\n' +
        '  secret-tool lookup keyrack pass | keyrack unlock --passphrase-stdin'
      );
    }
    return 'pipe';
  }

  throw new Error('passphrase input from unknown source');
};
```

### why this differs from age

age's answer to "how do i automate passphrase input?" is "use keys instead."

keyrack can't give that answer because:
- the passphrase IS the authentication factor
- there's no key file to use instead
- the whole point is to protect the key file (host manifest)

so keyrack must provide a safe passphrase input path, while still:
- the safe path should be easy (tty prompt)
- the unsafe path should require acknowledgment (`--passphrase-stdin`)

---

## .summary

| principle | age's approach | keyrack's approach |
|-----------|---------------|-------------------|
| no `--passphrase` flag | ✓ | ✓ |
| no env var input | ✓ | ✓ |
| tty prompt preferred | ✓ | ✓ |
| file redirect allowed | ✓ (implicit) | ✓ (implicit) |
| stdin pipe | user figures it out | explicit `--passphrase-stdin` flag |
| key-based alternative | preferred | not applicable (passphrase IS the auth) |

age teaches us: **make the unsafe path inconvenient**. keyrack applies this via `--passphrase-stdin` for pipe input, while tty prompt remains frictionless.

---

## .sources

- [age documentation](https://github.com/FiloSottile/age)
- [age discussion #275](https://github.com/FiloSottile/age/discussions/275) — Filippo on passphrase design
- [age-plugin-batchpass](https://github.com/42LoCo42/age-plugin-batchpass) — community workaround
- [Filippo Valsorda's blog](https://words.filippo.io/) — age design rationale

