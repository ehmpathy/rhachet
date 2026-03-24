# spec.set-behavior

## .what

defines expected behavior for `keyrack set` command.

## .key rule: --env inferred from manifest when unambiguous

`set` infers `--env` from the repo manifest when the key appears in exactly one env.

| scenario | behavior |
|----------|----------|
| key in one env only | infer that env |
| key in multiple envs | fail-fast, require --env |
| key not in manifest | fail-fast, require --env |

**why:** minimize required flags when intent is unambiguous. fail-fast when ambiguous.

---

## criteria

### usecase.1 = infer env when key in one env

```
given(repo manifest declares API_KEY only in env.all)
  when(user runs `keyrack set --key API_KEY --vault os.secure` without --env)
    then(infers env=all from manifest)
    then(sets key for env=all)
      sothat(user does not need to specify --env when unambiguous)
```

**expected stdout:**

```
$ rhx keyrack set --key API_KEY --vault os.secure

enter secret for API_KEY: ********

🔐 keyrack set (org: ehmpathy, env: all)
   └─ ehmpathy.all.API_KEY
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ vault: os.secure
```

### usecase.2 = infer env=test when key only in test

```
given(repo manifest declares DB_PASSWORD only in env.test)
  when(user runs `keyrack set --key DB_PASSWORD --vault os.secure` without --env)
    then(infers env=test from manifest)
    then(sets key for env=test)
```

**expected stdout:**

```
$ rhx keyrack set --key DB_PASSWORD --vault os.secure

enter secret for DB_PASSWORD: ********

🔐 keyrack set (org: ehmpathy, env: test)
   └─ ehmpathy.test.DB_PASSWORD
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ vault: os.secure
```

### usecase.3 = fail-fast when key in multiple envs

```
given(repo manifest declares AWS_PROFILE in env.test AND env.prod)
  when(user runs `keyrack set --key AWS_PROFILE --vault os.secure` without --env)
    then(fail-fast with error)
    then(lists which envs the key appears in)
    then(hint suggests --env)
      sothat(user knows how to disambiguate)
```

**expected stdout:**

```
$ rhx keyrack set --key AWS_PROFILE --vault os.secure

🔐 keyrack set
   └─ ✗ --env required: AWS_PROFILE found in multiple envs
      ├─ envs: test, prod
      └─ hint: rhx keyrack set --key AWS_PROFILE --vault os.secure --env test
```

note: `hint:` line is dimmed in terminal output.

### usecase.4 = fail-fast when key not in manifest

```
given(repo manifest does not declare UNKNOWN_KEY)
  when(user runs `keyrack set --key UNKNOWN_KEY --vault os.secure` without --env)
    then(fail-fast with error)
    then(hint suggests --env)
      sothat(user can set keys not in manifest via explicit --env)
```

**expected stdout:**

```
$ rhx keyrack set --key UNKNOWN_KEY --vault os.secure

🔐 keyrack set
   └─ ✗ --env required: UNKNOWN_KEY not found in manifest
      └─ hint: rhx keyrack set --key UNKNOWN_KEY --vault os.secure --env test
```

note: `hint:` line is dimmed in terminal output.

### usecase.5 = explicit --env always works

```
given(repo manifest declares API_KEY only in env.all)
  when(user runs `keyrack set --key API_KEY --vault os.secure --env test`)
    then(sets key for env=test)
      sothat(user can override inferred env)
      sothat(user can set keys for envs not in manifest)
```

**expected stdout:**

```
$ rhx keyrack set --key API_KEY --vault os.secure --env test

enter secret for API_KEY: ********

🔐 keyrack set (org: ehmpathy, env: test)
   └─ ehmpathy.test.API_KEY
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ vault: os.secure
```

### usecase.6 = single prompt for secret

```
given(user runs `keyrack set --key API_KEY --vault os.secure`)
  then(prompts once for secret)
  then(prompt uses key name, not slug)
    sothat(user sees familiar input: "enter secret for API_KEY:")
  then(secret flows through to vault adapter)
    sothat(adapter does not re-prompt)
```

note: only ONE prompt for the secret. the vault adapter must not re-prompt.

---

## see also

- `spec.key-unlock-behavior.md` — unlock always requires --env
- `spec.key-get-behavior.md` — get checks daemon only, no fallback
- `spec.env-all-roundtrip-behavior.md` — env=all fallback semantics
