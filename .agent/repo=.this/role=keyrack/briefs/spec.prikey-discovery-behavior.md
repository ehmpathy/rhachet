# spec.prikey-discovery-behavior

## .what

defines how keyrack discovers and uses prikeys for host manifest decryption.

## .key rule: always discover + merge supplements

prikey resolution always:
1. discovers identities from default locations
2. merges in any supplemental prikeys provided
3. trials all identities until one decrypts

**why:** uniform logic. no branch logic based on what was provided. discovery always runs.

---

## discovery algorithm

```
pool = []

# 1. discover from ssh-agent (most likely unlocked)
for key in ssh_agent_keys():
  path = key.comment  # agent stores path in comment
  if exists(path):
    identity = ssh_to_age(path)
    pool.add(identity)

# 2. discover from default locations
for path in [~/.ssh/id_ed25519, ~/.ssh/id_rsa, ~/.ssh/id_ecdsa]:
  if exists(path):
    identity = ssh_to_age(path)
    pool.add(identity)

# 3. merge supplemental prikeys
for path in input.prikeys:
  identity = ssh_to_age(path)
  pool.add(identity)

# 4. trial decryption
for identity in pool:
  try:
    plaintext = decrypt(ciphertext, identity)
    return { manifest, identity }
  catch:
    continue

# 5. all failed
throw error("no identity could decrypt manifest")
```

---

## criteria

### usecase.1 = discovery finds key in default location

```
given(SSH key exists at ~/.ssh/id_ed25519)
  given(host manifest encrypted to that key's recipient)
    when(keyrack get/unlock/fill is called without --prikey)
      then(discovery finds the key)
      then(decryption succeeds)
        sothat(user doesn't need to specify --prikey for common case)
```

### usecase.2 = supplemental prikey extends discovery

```
given(SSH key exists at ~/.ssh/id_ed25519)
  given(another SSH key exists at ~/.ssh/ehmpath)
  given(host manifest encrypted to ehmpath key's recipient)
    when(keyrack is called with --prikey ~/.ssh/ehmpath)
      then(discovery finds id_ed25519)
      then(supplement adds ehmpath)
      then(pool contains both)
      then(trial decryption tries id_ed25519 first, fails)
      then(trial decryption tries ehmpath, succeeds)
```

### usecase.3 = ssh-agent keys tried first

```
given(SSH key loaded in ssh-agent)
  given(same key exists at ~/.ssh/id_ed25519)
    when(keyrack is called)
      then(agent key is tried before file-based key)
        sothat(unlocked agent keys are preferred)
```

### usecase.4 = empty pool fails fast

```
given(no SSH keys exist in default locations)
  given(no supplemental prikeys provided)
    when(keyrack is called)
      then(fail-fast with clear error)
      then(hint suggests --prikey flag)
```

**expected error:**

```
UnexpectedCodePathError: no identity available for manifest decryption
  hint: ensure ssh key is available or use --prikey flag
```

---

## inputs

```
given(--prikey specified once)
  then(adds that path to pool after discovery)

given(--prikey specified multiple times)
  then(adds all paths to pool after discovery)
    sothat(user can try multiple keys)

given(--prikey not specified)
  then(pool contains only discovered identities)
```

---

## test pattern

### rule: tests use real SSH keys, not escape hatches

tests with `withTempHome` must:
1. generate an SSH keypair
2. write it to temp HOME's `~/.ssh/`
3. let discovery find it naturally

**why:** tests the real flow. no `_testIdentity` bypass.

### example test setup

```ts
const tempHome = withTempHome({ name: 'my-test' });

const sshKey = useBeforeAll(async () => {
  // generate ed25519 keypair
  const keyPath = join(tempHome.path, '.ssh', 'id_ed25519');
  mkdirSync(dirname(keyPath), { recursive: true });

  // generate key (no passphrase for tests)
  execSync(`ssh-keygen -t ed25519 -f ${keyPath} -N ""`);

  // convert to age recipient for manifest encryption
  const recipient = sshPubkeyToAgeRecipient({
    pubkeyPath: `${keyPath}.pub`
  });

  return { keyPath, recipient };
});

// now daoKeyrackHostManifest.get() will discover the key naturally
const manifest = useBeforeAll(async () => {
  return daoKeyrackHostManifest.set({
    findsert: new KeyrackHostManifest({
      recipients: [new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: sshKey.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      })],
      // ...
    }),
  });
});
```

### antipattern: _testIdentity escape hatch

```ts
// bad — bypasses discovery, doesn't test real flow
const result = await daoKeyrackHostManifest.get({
  owner: 'test',
  prikey: null,
  _testIdentity: keyPair.identity,  // escape hatch
});

// good — uses real discovery
const result = await daoKeyrackHostManifest.get({
  owner: 'test',
  prikeys: [],  // discovery finds key in temp HOME
});
```

---

## API

### current (to be refactored)

```ts
daoKeyrackHostManifest.get({
  owner: string | null;
  prikey: string | null;      // single prikey OR null for discovery
  _testIdentity?: string;     // escape hatch (to be removed)
})
```

### target

```ts
daoKeyrackHostManifest.get({
  owner: string | null;
  prikeys?: string[];         // supplemental prikeys (merged with discovery)
})
```

---

## see also

- `spec.key-unlock-behavior.md` — unlock uses prikey discovery
- `spec.env-all-roundtrip-behavior.md` — fill uses prikey discovery for multiple owners
