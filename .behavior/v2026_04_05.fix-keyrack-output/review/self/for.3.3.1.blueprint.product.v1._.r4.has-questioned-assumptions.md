# self-review r4: has-questioned-assumptions

## assumptions found and questioned

### 1. shell escape strategy (single quotes + escape)

**assumption:** single quote wrapping with `'\''` escape works universally.

**question:** what about shells that don't support this pattern?

**analysis:**
- bash, zsh, ksh: fully support `'sec'\''ret'` escape pattern
- fish: uses different quoting but can eval bash export syntax
- posix sh: supports this pattern
- windows cmd: NOT supported, but CLI targets unix shells

**verdict:** holds. the escape pattern is portable across unix shells. windows users would use powershell or wsl, not cmd.

### 2. ANSI-C quoting for newlines

**assumption:** `$'line1\nline2'` works for newlines.

**question:** what shells support ANSI-C quoting?

**analysis:**
- bash 2.04+: yes
- zsh: yes
- ksh93: yes
- dash: no (but dash users unlikely to use eval)
- fish: no (but fish users eval bash differently)

**question:** should we use a different escape for maximum portability?

**alternatives:**
1. literal newline in quotes: `'line1
line2'` — portable but awkward
2. `$'...'` syntax — widely supported, readable
3. printf-based: `$(printf 'line1\nline2')` — portable but complex

**verdict:** holds. `$'...'` is widely supported. acceptance tests will verify.

### 3. key name extraction via slug.split('.').pop()

**assumption:** slug format is always `org.env.KEYNAME`.

**question:** what if KEYNAME contains dots?

**analysis:**
- keyrack slug format: `{org}.{env}.{keyname}`
- keyname: uppercase with underscores, no dots by convention
- examples: `STRIPE_SECRET_KEY`, `API_TOKEN`, `DB_PASSWORD`

**question:** is this enforced or just convention?

**evidence needed:** check keyrack domain objects for keyname validation.

**mitigation:** if keyname can have dots, use `slug.split('.').slice(2).join('.')` instead of `.pop()`.

**verdict:** needs verification. added as implementation note.

### 4. exit code semantics (0 success, 2 constraint)

**assumption:** exit 2 for "not granted" matches extant keyrack behavior.

**question:** does extant keyrack CLI use exit 2 for locked/absent/blocked?

**evidence:** check invokeKeyrack.ts for exit code usage.

**verdict:** needs verification. common unix convention is exit 1 for general error, exit 2 for misuse. our semantics use exit 2 for constraint errors. verify consistency.

### 5. SDK parity (strict/lenient modes)

**assumption:** SDK has sourceAllKeysIntoEnv with strict/lenient modes.

**question:** does this function exist and behave as documented?

**evidence needed:** check SDK implementation.

**verdict:** critical to verify before implementation. if SDK doesn't have these modes, either implement in SDK first or document as CLI extension.

### 6. reuse of keyrack get for source

**assumption:** source command can internally call keyrack get --for repo.

**question:** does this return KeyrackGrantAttempt[] with the right shape?

**analysis:**
- source needs: slug, grant.key.secret, status
- get --for repo returns: array of attempts with this shape

**verdict:** holds. the shape is already used by extant CLI output.

## issues found

| assumption | issue | fix |
|------------|-------|-----|
| key name extraction | might fail if keyname contains dots | use `.slice(2).join('.')` instead of `.pop()` |

## updated blueprint

codepath line 86 should use:
```
const keyName = attempt.grant.slug.split('.').slice(2).join('.');
```

instead of:
```
const keyName = attempt.grant.slug.split('.').pop()!;
```

### fix applied

updated 3.3.1.blueprint.product.v1.i1.md codepath tree line 86:

before:
```
│        │  └─ console.log(`export ${keyName}=${asShellEscapedSecret({ secret })}`)
```

after:
```
│        │  ├─ keyName = slug.split('.').slice(2).join('.')  # handles dots in keyname
│        │  └─ console.log(`export ${keyName}=${asShellEscapedSecret({ secret })}`)
```

the fix handles edge case where keyname could contain dots.

## why other assumptions hold

| assumption | why it holds |
|------------|--------------|
| shell escape | unix shells support the pattern; windows not in scope |
| ANSI-C quoting | widely supported; acceptance tests verify |
| exit codes | verify at implementation; common unix convention |
| SDK parity | verify at implementation; documented in SDK parity section |
| reuse of get | shape matches; already used by CLI |

## implementation notes added

1. verify keyrack keyname validation (dots allowed?)
2. verify extant exit code semantics in invokeKeyrack.ts
3. verify SDK sourceAllKeysIntoEnv exists with strict/lenient

