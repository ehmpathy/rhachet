# zoomin: ssh key discovery

## .question

do we need a package to discover ssh keys? can't we just shell spawn to ask the user?

## .answer

**no package needed.** ssh keys live in predictable locations. we can discover them with pure filesystem access.

---

## .where ssh keys live

```
~/.ssh/
  id_ed25519      # ed25519 private key (modern default)
  id_ed25519.pub  # ed25519 public key
  id_rsa          # rsa private key (legacy)
  id_rsa.pub      # rsa public key
  id_ecdsa        # ecdsa private key
  id_ecdsa.pub    # ecdsa public key
  id_dsa          # dsa private key (deprecated)
  id_dsa.pub      # dsa public key
```

### discovery order (recommended)

1. `~/.ssh/id_ed25519` — modern, fast, secure
2. `~/.ssh/id_rsa` — legacy but common
3. `~/.ssh/id_ecdsa` — less common

---

## .implementation: pure node.js

```typescript
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SSH_KEY_CANDIDATES = [
  'id_ed25519',
  'id_rsa',
  'id_ecdsa',
];

/**
 * .what = find first available ssh key
 * .why = discover user's ssh key without external dependencies
 */
export const findDefaultSshKey = (): { path: string; type: string } | null => {
  const sshDir = join(homedir(), '.ssh');

  for (const keyName of SSH_KEY_CANDIDATES) {
    const keyPath = join(sshDir, keyName);
    const pubPath = `${keyPath}.pub`;

    // check both private and public exist
    if (existsSync(keyPath) && existsSync(pubPath)) {
      return { path: keyPath, type: keyName.replace('id_', '') };
    }
  }

  return null;
};

/**
 * .what = read ssh public key from file
 * .why = get pubkey for use as age recipient
 */
export const readSshPubkey = (keyPath: string): string => {
  const pubPath = keyPath.endsWith('.pub') ? keyPath : `${keyPath}.pub`;
  return readFileSync(pubPath, 'utf8').trim();
};
```

---

## .shell spawn approach

we could also shell out:

```typescript
import { execSync } from 'child_process';

// list keys in ssh-agent
const agentKeys = execSync('ssh-add -L').toString();

// or ask user to pick
const userChoice = execSync('ssh-add -l').toString();
```

### pros of shell spawn
- can query ssh-agent for loaded keys
- user sees familiar ssh-add output

### cons of shell spawn
- requires ssh-add in PATH
- may fail on windows
- harder to parse output
- unnecessary for simple discovery

---

## .do we need ssh-agent at all?

**for keyrack: no.**

| use case | ssh-agent needed? |
|----------|-------------------|
| discover which keys exist | no — just check ~/.ssh/ |
| read public key | no — just read .pub file |
| read private key (no passphrase) | no — just read file |
| read private key (with passphrase) | optional — can prompt ourselves |
| use key without file access | yes — agent holds key in memory |

keyrack only needs to:
1. find the ssh key (filesystem check)
2. read the pubkey (for recipient)
3. optionally read private key (for conversion to age identity)

none of this requires ssh-agent.

---

## .passphrase-protected keys

if the ssh key has a passphrase:

### option A: prompt ourselves

```typescript
import { createInterface } from 'readline';

const promptPassphrase = async (): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // note: this won't hide input; need raw mode for that
    rl.question('ssh key passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};
```

### option B: use ssh-keygen to decrypt

```typescript
import { execSync } from 'child_process';

// ssh-keygen can convert passphrase-protected key
// -p changes passphrase, -P old -N new
// -y prints public key (prompts for passphrase)
const pubkey = execSync('ssh-keygen -y -f ~/.ssh/id_ed25519', {
  stdio: ['inherit', 'pipe', 'inherit'], // inherit stdin for passphrase
}).toString();
```

### option C: skip passphrase keys

just generate a new age keypair if the ssh key has a passphrase. simpler.

---

## .recommendation for keyrack

**no external package needed.**

```typescript
// 1. discover ssh key (pure fs)
const sshKey = findDefaultSshKey();
if (!sshKey) {
  // generate age keypair instead
  const { identity, recipient } = await generateAgeKeyPair();
  return { identity, recipient, source: 'generated' };
}

// 2. read pubkey (pure fs)
const pubkey = readSshPubkey(sshKey.path);

// 3. for now, generate age keypair for decryption
//    but add ssh pubkey as additional recipient
const { identity, recipient } = await generateAgeKeyPair();

return {
  identity,
  recipients: [recipient, pubkey], // age key + ssh pubkey
  source: 'hybrid',
};
```

this gives us:
- **no new dependencies**
- **user's ssh pubkey as backup recipient**
- **age identity for reliable decryption**
- **age CLI users can decrypt with their ssh key**

---

## .packages that exist (if we wanted them)

| package | what it does |
|---------|-------------|
| `sops-age` | ssh key → age conversion + discovery |
| `ssh-keygen` | generate/manage ssh keys (shell wrapper) |
| `sshpk` | parse ssh key formats |
| `node-forge` | crypto primitives with key parser |

but for simple discovery: **just use fs + homedir()**. no package needed.
