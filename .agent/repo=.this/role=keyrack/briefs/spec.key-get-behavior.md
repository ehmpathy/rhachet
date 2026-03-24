# spec.key-get-behavior

## .what

defines expected behavior for `keyrack get` command.

## .key rule: get checks daemon only

`get` checks the daemon for what has been unlocked. it does **not** do fallback lookup.

| scenario | behavior |
|----------|----------|
| key unlocked in daemon | return granted with secret |
| key not unlocked but exists | return locked status |
| key does not exist | return absent status |

**why:** get is a simple lookup from the daemon. host manifest decryption is never involved in the hot path. the keyrack is unlocked for work once; then actors that need keys grab and go without need to unlock again or access the vaults again. this keeps `get` fast and simple — fallback logic belongs in `unlock`, which populates the daemon.

---

## criteria

### usecase.1 = get returns unlocked key from daemon

```
given(user has unlocked API_KEY for env=test)
  when(user runs `keyrack get --key API_KEY --env test`)
    then(returns granted status)
    then(includes secret value)
    then(slug shows what was unlocked)
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.test.API_KEY
      ├─ vault: os.secure
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ status: granted 🔑
```

### usecase.2 = get returns env=all key when that was unlocked

```
given(only env=all key exists)
  given(user ran `keyrack unlock --key API_KEY --env test`)
  given(unlock found env=all via fallback)
    when(user runs `keyrack get --key API_KEY --env test`)
      then(returns what daemon has)
      then(slug shows env=all)
        sothat(user sees exactly which key was unlocked)
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.all.API_KEY
      ├─ vault: os.secure
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ status: granted 🔑
```

note: slug shows `ehmpathy.all.API_KEY` because that's what `unlock` found and put in daemon.

### usecase.3 = get returns locked when key exists but not unlocked

```
given(key exists for env=test)
  given(key has not been unlocked)
    when(user runs `keyrack get --key API_KEY --env test`)
      then(returns locked status)
      then(hint suggests unlock command)
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.test.API_KEY
      ├─ status: locked 🔒
      └─ hint: rhx keyrack unlock --key API_KEY --env test
```

note: `hint:` line is dimmed in terminal output.

### usecase.4 = get returns absent when key does not exist

```
given(no key exists for env=test or env=all)
  when(user runs `keyrack get --key API_KEY --env test`)
    then(returns absent status)
    then(hint suggests set command)
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

### usecase.5 = get requires --env

```
given(user runs `keyrack get --key API_KEY` without --env)
  then(fail-fast with error)
  then(hint suggests --env)
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY

🔐 keyrack get
   └─ ✗ --env is required
      └─ hint: rhx keyrack get --key API_KEY --env test
```

note: `hint:` line is dimmed in terminal output.

---

## get does NOT do fallback

this is critical: `get` does not look for env=all when env=test is absent.

```
given(only env=all key exists, NOT env=test)
  given(key has NOT been unlocked)
    when(user runs `keyrack get --key API_KEY --env test`)
      then(returns absent for env=test)
      then(does NOT automatically find env=all)
        sothat(fallback logic stays in unlock)
```

**expected stdout:**

```
$ rhx keyrack get --key API_KEY --env test

🔐 keyrack
   └─ ehmpathy.test.API_KEY
      ├─ status: absent 🫧
      └─ hint: rhx keyrack set --key API_KEY --env test
```

to get the env=all key, user must first `unlock --env test` (which does fallback).

---

## see also

- `spec.key-unlock-behavior.md` — unlock does fallback lookup
- `spec.key-set-behavior.md` — set infers env from manifest
- `spec.env-all-roundtrip-behavior.md` — env=all fallback semantics
