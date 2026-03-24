# spec.unlock-behavior

## .what

defines expected behavior for `keyrack unlock` command.

## .key rule: --env is always required

`unlock` always requires `--env` to be specified — no default, no inference.

**why:** limit blast radius. unlock makes a key accessible. explicit env prevents accidental exposure.

---

## criteria

### usecase.1 = unlock requires --env

```
given(user runs `keyrack unlock --key API_KEY` without --env)
  then(fail-fast with error)
    sothat(user must explicitly choose which env to unlock)
  then(hint suggests add --env)
```

**expected stdout:**

```
$ rhx keyrack unlock --key API_KEY

🔐 keyrack unlock
   └─ ✗ --env is required
      └─ hint: rhx keyrack unlock --key API_KEY --env test
```

note: `hint:` line is dimmed in terminal output.

### usecase.2 = unlock with explicit --env

```
given(key exists for env=test)
  when(user runs `keyrack unlock --key API_KEY --env test`)
    then(unlocks the env=test key)
    then(shows key details and expiration)
```

**expected stdout:**

```
$ rhx keyrack unlock --key API_KEY --env test

🔓 keyrack unlock
   └─ ehmpathy.test.API_KEY
      ├─ env: test
      ├─ org: ehmpathy
      ├─ vault: os.secure
      └─ expires in: 60m
```

### usecase.3 = unlock env=all key via fallback

```
given(key exists for env=all but not env=test)
  when(user runs `keyrack unlock --key API_KEY --env test`)
    then(unlocks the env=all key via fallback)
    then(slug shows .all. segment)
      sothat(user knows which key was unlocked)
```

**expected stdout:**

```
$ rhx keyrack unlock --key API_KEY --env test

🔓 keyrack unlock
   └─ ehmpathy.all.API_KEY
      ├─ env: all
      ├─ org: ehmpathy
      ├─ vault: os.secure
      └─ expires in: 60m
```

note: slug shows `ehmpathy.all.API_KEY` — user can see the key came from `env=all` fallback.

### usecase.4 = unlock env=all directly

```
given(key exists for env=all)
  when(user runs `keyrack unlock --key API_KEY --env all`)
    then(unlocks the env=all key)
    then(key is now accessible for any env via fallback)
```

**expected stdout:**

```
$ rhx keyrack unlock --key API_KEY --env all

🔓 keyrack unlock
   └─ ehmpathy.all.API_KEY
      ├─ env: all
      ├─ org: ehmpathy
      ├─ vault: os.secure
      └─ expires in: 60m
```

---

## fallback resolution order

when unlock a key for `--env $env`:

1. look for exact match: `org.$env.KEY`
2. if not found, look for universal: `org.all.KEY`
3. if neither found, report absent

---

## error cases

### key absent entirely

```
given(no key exists for env=test or env=all)
  when(user runs `keyrack unlock --key API_KEY --env test`)
    then(reports absent)
    then(hint suggests keyrack set)
```

**expected stdout:**

```
$ rhx keyrack unlock --key API_KEY --env test

🔐 keyrack unlock
   └─ ehmpathy.test.API_KEY
      ├─ status: absent 🫧
      └─ hint: rhx keyrack set --key API_KEY --env test
```

note: `hint:` line is dimmed in terminal output.

---

## see also

- `spec.key-set-behavior.md` — set infers env from manifest
- `spec.key-get-behavior.md` — get checks daemon only, no fallback
- `spec.env-all-roundtrip-behavior.md` — env=all fallback semantics
