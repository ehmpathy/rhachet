# spec.env-all-roundtrip-behavior

## .what

defines expected behavior for `env=all` credentials through the full set → unlock → get roundtrip.

## .definition: env=all semantics

**two distinct concepts:**

| manifest | `env.all` means | example |
|----------|-----------------|---------|
| **repo manifest** | key is REQUIRED for all envs | declares dependency |
| **host manifest** | key is HOSTED universally | stores credential under `org.all.KEY` |

these are independent. a repo manifest can require a key in `env.all`, but the host manifest can store it either way:

| hosting strategy | slug | accessible for |
|------------------|------|----------------|
| universal hosting | `org.all.KEY` | any env (via fallback) |
| per-env hosting | `org.test.KEY` | only env=test |

**both are valid ways to satisfy a repo manifest `env.all` requirement.**

### universal hosting (host manifest env=all)

when a key is hosted under `org.all.KEY`, it satisfies requests for any environment:

| stored as | grants for |
|-----------|------------|
| `org.all.KEY` | `org.test.KEY`, `org.prod.KEY`, `org.prep.KEY`, `org.all.KEY` |

this is the keyrack equivalent of a wildcard: one secret, any env.

### per-env hosting

when a key is hosted under `org.$env.KEY`, it satisfies only that specific environment:

| stored as | grants for |
|-----------|------------|
| `org.test.KEY` | only `org.test.KEY` |
| `org.prod.KEY` | only `org.prod.KEY` |

user chooses which strategy based on whether they want the same credential across envs or different credentials per env.

---

## criteria

### usecase.1 = single prompt when set key

```
given(user runs `keyrack set --key API_KEY --vault os.secure`)
  then(prompts once for secret)
  then(prompt uses key name, not slug)
    sothat(user sees familiar input: "enter secret for API_KEY:")
  then(secret flows through to vault adapter)
    sothat(adapter does not re-prompt)
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

note: only ONE prompt for the secret. the adapter must not re-prompt.

### usecase.2 = set infers env from manifest

```
given(repo manifest declares API_KEY only in env.all)
  when(user runs `keyrack set --key API_KEY --vault os.secure` without --env)
    then(infers env=all from manifest)
    then(sets key for env=all)
      sothat(key is available for any env via fallback)
```

**expected stdout for set (env inferred as all):**

```
$ rhx keyrack set --key API_KEY --vault os.secure

enter secret for API_KEY: ********

🔐 keyrack set (org: ehmpathy, env: all)
   └─ ehmpathy.all.API_KEY
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ vault: os.secure
```

note: env is inferred from manifest, not hardcoded to all. see `spec.set-behavior.md` for full rules.

note: unlock always requires `--env`. see `spec.unlock-behavior.md`.

### usecase.3 = unlock does fallback resolution for specific envs

fallback resolution happens at **unlock time**, not get time.

```
given(key is set with env=all: `org.all.API_KEY`)
  given(no key exists for env=test: `org.test.API_KEY`)
    when(user runs `keyrack unlock --key API_KEY --env test`)
      then(finds env=all key via fallback)
      then(unlocks env=all key into daemon)
      then(slug shows .all. segment)
        sothat(user knows which key was unlocked)
```

**expected stdout for unlock (fallback to env=all):**

```
$ rhx keyrack unlock --key API_KEY --env test

🔓 keyrack unlock
   └─ ehmpathy.all.API_KEY
      ├─ env: all
      ├─ org: ehmpathy
      ├─ vault: os.secure
      └─ expires in: 60m
```

note: user requested `--env test` but the slug shows `ehmpathy.all.API_KEY` — fallback resolved to env=all.

```
given(key is set with both env=all and env=test)
  when(user runs `keyrack unlock --key API_KEY --env test`)
    then(unlocks env=test key)
      sothat(specific keys take precedence over universal)
```

**expected stdout for unlock (specific env takes precedence):**

```
$ rhx keyrack unlock --key API_KEY --env test

🔓 keyrack unlock
   └─ ehmpathy.test.API_KEY
      ├─ env: test
      ├─ org: ehmpathy
      ├─ vault: os.secure
      └─ expires in: 60m
```

note: the slug shows `ehmpathy.test.API_KEY` — exact `env=test` key was used.

### usecase.4 = get checks daemon only (no fallback)

`get` checks the daemon for what was unlocked. it does not do fallback lookup.

```
given(key is set with env=all)
  given(user has run `keyrack unlock --key API_KEY --env test`)
    when(user runs `keyrack get --key API_KEY --env test`)
      then(returns what daemon has for that env)
      then(slug shows what was actually unlocked)
        sothat(user sees exactly what key is in use)
```

**expected stdout for get (after unlock found env=all via fallback):**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.all.API_KEY
      ├─ vault: os.secure
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ status: granted 🔑
```

note: get returns what was unlocked (env=all). it does not redo fallback lookup.

### usecase.5 = status output reflects env=all coverage

```
given(key is set with env=all)
  when(user runs `keyrack status --env test`)
    then(shows env=all key as present for test)
      sothat(user sees which keys are available)
    then(slug shows .all. segment)
      sothat(user knows key comes from universal env)
```

**expected stdout for status:**

```
$ rhx keyrack status --env test

🔐 keyrack status
   ├─ ehmpathy.test.CLOUDFLARE_TOKEN
   │  ├─ vault: os.secure
   │  └─ status: locked 🔒
   └─ ehmpathy.all.API_KEY
      ├─ vault: os.secure
      └─ status: locked 🔒
```

note: the `env=all` key appears because it satisfies `env=test` via fallback.

### usecase.6 = fill skips keys satisfied by env=all

fill uses unlock → get internally to check if a key is already set. since unlock does env=all fallback, fill recognizes `org.all.KEY` as sufficient for `org.test.KEY`.

```
given(key is set with env=all: `org.all.API_KEY`)
  given(repo manifest declares API_KEY in env.test)
    when(user runs `keyrack fill --env test`)
      then(fill internally unlocks key for env=test)
      then(unlock finds env=all key via fallback)
      then(fill internally gets key to verify)
      then(get succeeds with env=all key)
      then(fill skips with "already set (org.all.API_KEY), skip")
        sothat(user is not prompted for credentials already configured under env=all)
```

**expected stdout for fill (key satisfied by env=all):**

```
$ rhx keyrack fill --env test

🔐 keyrack fill (env: test, keys: 1, owners: 1)

🔑 key 1/1, API_KEY, for 1 owner
   └─ for owner default
      └─ ✓ already set (ehmpathy.all.API_KEY), skip
```

note: the skip message shows `ehmpathy.all.API_KEY` — user sees exactly which key satisfied the requirement. fill does not re-prompt because the env=all key is sufficient.

---

## fallback lookup order (unlock only)

when `unlock` looks for a key for `--env $env`:

1. look for exact match: `org.$env.KEY`
2. if not found, look for universal: `org.all.KEY`
3. if neither found, report absent

this applies to:
- `keyrack unlock --key KEY --env $env`

`get` does **not** do fallback. it only checks the daemon for what was unlocked.

---

## error cases

### key absent entirely

```
given(no key exists for env=test or env=all)
  when(user runs `keyrack get --key API_KEY --env test`)
    then(reports absent)
    then(hint suggests: "rhx keyrack set --key API_KEY --env test")
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.test.API_KEY
      ├─ status: absent 🫧
      └─ hint: rhx keyrack set --key API_KEY --env test
```

note: `hint:` line is dimmed in terminal output.

### key exists but locked

```
given(key exists for env=all but is locked)
  when(user runs `keyrack get --key API_KEY --env test`)
    then(reports locked)
    then(hint suggests: "rhx keyrack unlock --key API_KEY --env all")
      sothat(user knows exactly which env to unlock)
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.all.API_KEY
      ├─ status: locked 🔒
      └─ hint: rhx keyrack unlock --key API_KEY --env all
```

note: hint includes `--env all` because unlock always requires --env. `hint:` line is dimmed.

---

## see also

- `spec.key-set-behavior.md` — set infers env from manifest
- `spec.key-unlock-behavior.md` — unlock does fallback lookup, always requires --env
- `spec.key-get-behavior.md` — get checks daemon only, no fallback
- `rule.require.full-slug-key-input.md` — slug resolution behavior
