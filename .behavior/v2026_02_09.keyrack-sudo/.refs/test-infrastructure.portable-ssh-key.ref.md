# ref: test infrastructure — portable ssh key

## .what

how to test recipient-key-based encryption consistently across all keyrack sudo tests.

---

## .the problem

keyrack sudo uses ssh keys as recipients for age encryption. tests need:

1. **deterministic encryption** — same key → same encrypted output → reproducible snapshots
2. **isolation** — tests shouldn't touch developer's real `~/.ssh` keys
3. **portability** — tests work on any machine, ci included
4. **realism** — test flow should match real usage (ssh-agent, key discovery)

---

## .options considered

### option A: temp HOME with test key

```
.test/assets/
  ssh/
    id_ed25519           # test private key
    id_ed25519.pub       # test public key

# in test setup:
const tempHome = await fs.mkdtemp('/tmp/keyrack-test-');
await fs.mkdir(path.join(tempHome, '.ssh'), { mode: 0o700 });
await fs.copyFile(ASSETS_KEY, path.join(tempHome, '.ssh/id_ed25519'));
process.env.HOME = tempHome;
```

**pros**:
- mimics real `~/.ssh` structure
- key discovery code path exercised
- fully isolated from real home

**cons**:
- temp dir setup/cleanup per test
- must remember to restore HOME after

### option B: environment variable override

```ts
// in keyrack key discovery:
const sshKeyPath = process.env.KEYRACK_TEST_SSH_KEY
  ?? findDefaultSshKey();
```

```
# in test:
process.env.KEYRACK_TEST_SSH_KEY = path.join(ASSETS, 'ssh/id_ed25519');
```

**pros**:
- simple, no symlinks
- explicit test override

**cons**:
- adds test-only code path to prod
- doesn't exercise real discovery

### option C: test ssh-agent mock

mock `SSH_AUTH_SOCK` to a custom socket that returns the test key.

**pros**:
- exercises full ssh-agent flow

**cons**:
- complex setup
- overkill for unit/integration tests

### option D: explicit `--pubkey` in tests (recommended)

tests always use explicit `--pubkey` flag that points to test asset:

```ts
const testKeyPath = path.join(ASSETS, 'ssh/id_ed25519');

// init with explicit key
await initKeyrack({ pubkey: testKeyPath }, context);

// or via CLI
await exec(`rhx keyrack init --pubkey ${testKeyPath}`);
```

**pros**:
- no symlinks, no env vars, no mocks
- exercises the `--pubkey` code path (which users will also use)
- test key lives in `.test/assets/` — obvious and portable
- works in ci without ssh-agent

**cons**:
- doesn't exercise default key discovery
- need one test specifically for default discovery (can use symlink there)

---

## .recommendation

**option D** for most tests + **option A** for one dedicated discovery test.

### test asset structure

```
.test/
  assets/
    keyrack/
      ssh/
        test_key_ed25519        # deterministic test private key
        test_key_ed25519.pub    # deterministic test public key
      manifest/
        empty.age               # empty manifest encrypted to test key
        with-keys.age           # manifest with sample keys
```

### key generation (one-time, committed)

```bash
# generate deterministic test key (no passphrase)
ssh-keygen -t ed25519 -f .test/assets/keyrack/ssh/test_key_ed25519 -N "" -C "keyrack-test-key"
```

**important**: this key is for tests only. it's committed to the repo and has no passphrase. never use it for real secrets.

### test helper

```ts
// .test/infra/withTestSshKey.ts

import path from 'path';

export const TEST_SSH_KEY_PATH = path.join(
  __dirname,
  '../assets/keyrack/ssh/test_key_ed25519'
);

export const TEST_SSH_PUBKEY_PATH = `${TEST_SSH_KEY_PATH}.pub`;

export const getTestSshPubkey = async (): Promise<string> => {
  return fs.readFile(TEST_SSH_PUBKEY_PATH, 'utf-8');
};
```

### usage in tests

```ts
import { TEST_SSH_KEY_PATH } from '../.test/infra/withTestSshKey';

given('[case1] init with test key', () => {
  when('[t0] rhx keyrack init --pubkey', () => {
    const result = useThen('init succeeds', async () =>
      initKeyrack({ pubkey: TEST_SSH_KEY_PATH }, context)
    );

    then('manifest created', () => {
      expect(result.manifestPath).toContain('keyrack.host.yml.age');
    });

    then.snap('output matches init success message');
  });
});
```

### default discovery test (temp HOME)

```ts
given('[case6] default ssh key discovery', () => {
  const tempHome = useBeforeAll(async () => {
    // create temp home with .ssh containing test key
    const home = await fs.mkdtemp(path.join(os.tmpdir(), 'keyrack-test-home-'));
    const sshDir = path.join(home, '.ssh');
    await fs.mkdir(sshDir, { mode: 0o700 });
    await fs.copyFile(TEST_SSH_KEY_PATH, path.join(sshDir, 'id_ed25519'));
    await fs.copyFile(TEST_SSH_PUBKEY_PATH, path.join(sshDir, 'id_ed25519.pub'));
    await fs.chmod(path.join(sshDir, 'id_ed25519'), 0o600);
    return home;
  });

  afterAll(async () => fs.rm(tempHome, { recursive: true, force: true }));

  when('[t0] rhx keyrack init (no --pubkey)', () => {
    then('discovers key in ~/.ssh', async () => {
      // override HOME so key discovery looks in temp home
      const envBefore = process.env.HOME;
      process.env.HOME = tempHome;
      try {
        const result = await initKeyrack({}, context);
        expect(result.recipient.pubkey).toContain('ssh-ed25519');
      } finally {
        process.env.HOME = envBefore;
      }
    });
  });
});
```

**critical**: never symlink into real `~/.ssh` — always override `HOME` to point to a temp directory.

---

## .snapshot determinism

with a committed test key, encrypted outputs are deterministic:

- same plaintext + same recipient → same ciphertext (age is deterministic with same key)
- snapshots can capture encrypted manifest structure
- snapshots can capture decrypted content after round-trip

**note**: age encryption includes random nonce, so raw ciphertext differs per encryption. snapshots should capture:
- decrypted content (deterministic)
- manifest structure after decrypt (deterministic)
- cli output messages (deterministic)

---

## .portability

tests must be portable — same behavior on any machine, ci or local.

### test helper: spawn isolated ssh-agent with test key

```ts
// .test/infra/withTestSshAgent.ts

import { spawn } from 'child_process';

export const withTestSshAgent = async <T>(
  fn: () => Promise<T>,
): Promise<T> => {
  // start fresh agent
  const agentOutput = execSync('ssh-agent -s').toString();
  const sockMatch = agentOutput.match(/SSH_AUTH_SOCK=([^;]+)/);
  const pidMatch = agentOutput.match(/SSH_AGENT_PID=(\d+)/);

  if (!sockMatch || !pidMatch) throw new Error('failed to start ssh-agent');

  const sock = sockMatch[1];
  const pid = parseInt(pidMatch[1], 10);

  // load test key into fresh agent
  execSync(`ssh-add ${TEST_SSH_KEY_PATH}`, {
    env: { ...process.env, SSH_AUTH_SOCK: sock },
  });

  // run test with isolated agent
  const envBefore = process.env.SSH_AUTH_SOCK;
  process.env.SSH_AUTH_SOCK = sock;
  try {
    return await fn();
  } finally {
    process.env.SSH_AUTH_SOCK = envBefore;
    process.kill(pid); // cleanup agent
  }
};
```

### usage in tests

```ts
given('[case] ssh-agent flow', () => {
  when('[t0] init via ssh-agent', () => {
    then('uses key from agent', async () => {
      await withTestSshAgent(async () => {
        const result = await initKeyrack({}, context);
        expect(result.recipient.pubkey).toContain('ssh-ed25519');
      });
    });
  });
});
```

this ensures:
- tests don't touch developer's real ssh-agent
- tests don't depend on machine's keys
- same test key used everywhere → deterministic
- portable across ci and local

---

## .security note

the test key is:
- committed to repo (intentional — it's a test fixture)
- has no passphrase (intentional — tests run unattended)
- never used for real secrets (enforced by convention)

add to `.test/assets/keyrack/ssh/README.md`:

```markdown
# test ssh key

this key is for automated tests only.

- DO NOT use this key for real secrets
- DO NOT add this key to your ssh-agent
- this key is intentionally committed with no passphrase

the matched public key is: ssh-ed25519 AAAA... keyrack-test-key
```

---

## .summary

| test type | approach |
|-----------|----------|
| most tests | explicit `--pubkey` that points to `.test/assets/keyrack/ssh/test_key_ed25519` |
| default discovery test | set `HOME` to temp dir with test key in `.ssh/` |
| ssh-agent tests | spawn isolated agent with test key via `withTestSshAgent()` |
| snapshots | capture decrypted content and cli output (not raw ciphertext) |

all tests are portable — same committed test key, same behavior everywhere.

