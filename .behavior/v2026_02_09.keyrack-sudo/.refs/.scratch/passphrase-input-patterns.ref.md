# ref: passphrase input patterns

## .what

industry patterns for secure passphrase input in CLI tools, and why `echo "pass" | program` is unsafe.

---

## .the problem

```bash
echo "mypassword" | keyrack unlock
```

the passphrase `mypassword` appears in `echo`'s command-line arguments, visible via `ps aux` to any user on the system.

---

## .what's visible in `ps`

| pattern | visible in `ps`? | why |
|---------|------------------|-----|
| `echo "pass" \| program` | ✗ **yes** | "pass" is in echo's argv |
| `printf "%s" "$VAR" \| program` | ✗ **yes** | shell expands $VAR before exec |
| `cat file \| program` | ✓ no | file contents not in argv |
| `secret-tool lookup x \| program` | ✓ no | output not in argv |
| `program < file` | ✓ no | redirect handled by kernel |
| `program <<< "$VAR"` | ✓ no | bash creates temp file |
| TTY prompt | ✓ no | typed interactively |

**key insight**: the problem is not stdin pipes — it's commands that put secrets in their arguments.

---

## .industry approaches

### docker: explicit `--password-stdin` flag

```bash
# blocked by default
echo "$PASS" | docker login -u user  # ✗ error

# requires explicit opt-in
echo "$PASS" | docker login -u user --password-stdin  # ✓ works
```

user must acknowledge they understand the risk.

**source**: [docker login docs](https://docs.docker.com/engine/reference/commandline/login/)

### gpg: pinentry + `--passphrase-fd`

- default: pinentry (separate program) prompts via GUI/TUI
- automation: `--passphrase-fd N` reads from file descriptor N
- never reads passphrase from command-line args

```bash
gpg --passphrase-fd 3 3< passphrase-file -d secret.gpg
```

**source**: [GnuPG ArchWiki](https://wiki.archlinux.org/title/GnuPG)

### sshpass: multiple explicit methods

```bash
sshpass -f /path/to/file ssh user@host  # from file
sshpass -d 3 ssh user@host 3< file      # from fd
sshpass -e ssh user@host                # from SSHPASS env var
# never: sshpass -p "password"          # deprecated, visible in ps
```

**source**: [sshpass manpage](https://manpages.ubuntu.com/manpages/jammy/man1/sshpass.1.html)

### age: discourage passphrases entirely

age deliberately makes passphrase input inconvenient to steer users toward key-based auth. see `passphrase-input-patterns.age-philosophy.ref.md` for deep dive.

**source**: [age discussion #275](https://github.com/FiloSottile/age/discussions/275)

---

## .recommendation for keyrack

match docker's pattern:

```bash
# default: require TTY or file redirect
keyrack unlock --env sudo --key X              # TTY prompt ✓
keyrack unlock --env sudo --key X < file       # file redirect ✓

# explicit opt-in for stdin pipe
secret-tool lookup keyrack pass | keyrack unlock --passphrase-stdin
```

### detection logic

```typescript
const getPassphraseInputMethod = (flags: { passphraseStdin?: boolean }): 'tty' | 'file' | 'pipe' => {
  if (process.stdin.isTTY) return 'tty';

  const stats = fs.fstatSync(0);
  if (stats.isFile()) return 'file';

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

### tradeoff

user can still do `echo "pass" | keyrack unlock --passphrase-stdin` unsafely, but:
1. explicit opt-in required
2. docs warn against `echo` pattern
3. safe patterns (secret-tool, pass, file redirect) still work
4. matches industry standard (docker)

---

## .sources

- [docker login docs](https://docs.docker.com/engine/reference/commandline/login/)
- [GnuPG ArchWiki](https://wiki.archlinux.org/title/GnuPG)
- [sshpass manpage](https://manpages.ubuntu.com/manpages/jammy/man1/sshpass.1.html)
- [age discussion #275](https://github.com/FiloSottile/age/discussions/275)
- [Baeldung: pass password without TTY](https://www.baeldung.com/linux/provide-pass-without-tty-override)

