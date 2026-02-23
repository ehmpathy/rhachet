import { execSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { encryptToRecipients } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { sshPubkeyToAgeRecipient } from '@src/infra/ssh/sshPubkeyToAgeRecipient';

/**
 * .what = path to test SSH key assets
 * .why = copied into temp repo .ssh/ so findDefaultSshKey() works when HOME is temp repo
 */
const TEST_SSH_KEY_DIR = resolve(__dirname, '../../../src/.test/assets/keyrack/ssh');

/**
 * .what = derive the age recipient from the test SSH pubkey
 * .why = manifests must be encrypted to the SSH key's age recipient
 *        so auto-discovery (via $HOME/.ssh/id_ed25519) can decrypt them
 */
const TEST_SSH_PUBKEY = readFileSync(
  join(TEST_SSH_KEY_DIR, 'test_key_ed25519.pub'),
  'utf8',
).trim();
export const TEST_SSH_AGE_RECIPIENT = sshPubkeyToAgeRecipient({
  pubkey: TEST_SSH_PUBKEY,
});

/**
 * .what = known os.secure credential values for test fixtures
 * .why = os.secure files use passphrase encryption in fixtures;
 *        we re-encrypt these to the test ssh recipient so identity-based decryption works
 */
const KNOWN_OS_SECURE_VALUES: Record<string, string> = {
  'testorg.test.SECURE_API_KEY': 'portable-secure-value-xyz789',
};

/**
 * .what = path to fixture assets
 * .why = assets are copied into temp repos for acceptance tests
 */
const ASSETS_DIR = resolve(__dirname, '../assets');

/**
 * .what = fixture slug for test repos
 * .why = references a directory in accept.blackbox/.test/assets/
 * .note = validated at runtime to fail fast if fixture dne
 */
export type TestRepoFixture = string;

/**
 * .what = creates an isolated test repo in os.tmpdir()
 * .why =
 *   - maximally portable and isolated test environments
 *   - OS handles cleanup (no manual teardown needed)
 *   - each test gets a fresh workspace
 */
export const genTestTempRepo = async (input: {
  /** fixture template to use */
  fixture: TestRepoFixture;
  /** optional unique suffix for the repo name */
  suffix?: string;
  /** run pnpm install after copy (for fixtures with package.json) */
  install?: boolean;
}): Promise<{
  /** absolute path to the test repo */
  path: string;
}> => {
  // gen unique temp directory path
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const suffix = input.suffix ? `-${input.suffix}` : '';
  const repoPath = join(tmpdir(), `rhachet-test-${uniqueId}${suffix}`);

  // fail fast if fixture dne
  const fixturePath = join(ASSETS_DIR, input.fixture);
  if (!existsSync(fixturePath))
    throw new Error(`fixture not found: ${input.fixture} (${fixturePath})`);

  // copy fixture assets into temp repo
  cpSync(fixturePath, repoPath, { recursive: true });

  // make shell skills executable
  setSkillsExecutable({ dir: repoPath });

  // setup .ssh directory with test key so findDefaultSshKey() works
  setupTestSshKey({ repoPath });

  // convert old manifest format to encrypted format if needed
  await convertLegacyManifest({ repoPath });

  // init git repo (required for rhachet)
  execSync('git init', { cwd: repoPath, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', {
    cwd: repoPath,
    stdio: 'ignore',
  });
  execSync('git config user.name "Test User"', {
    cwd: repoPath,
    stdio: 'ignore',
  });

  // install dependencies if requested and package.json exists
  // use bun install for bun-compatible node_modules structure
  if (input.install && existsSync(join(repoPath, 'package.json'))) {
    // parse package.json to get expected dependencies
    const pkgJson = JSON.parse(
      readFileSync(join(repoPath, 'package.json'), 'utf-8'),
    );
    const expectedDeps = Object.keys(pkgJson.dependencies ?? {});

    // retry install up to 3 times (transient registry issues)
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        execSync('bun install', {
          cwd: repoPath,
          stdio: 'inherit',
          timeout: 120000, // 2 minute timeout
        });

        // verify all expected dependencies are installed
        const nodeModulesPath = join(repoPath, 'node_modules');
        const depsAbsent = expectedDeps.filter(
          (dep) => !existsSync(join(nodeModulesPath, dep, 'package.json')),
        );
        if (depsAbsent.length > 0) {
          throw new Error(
            `bun install completed but packages are absent: ${depsAbsent.join(', ')}`,
          );
        }

        // install succeeded
        lastError = null;
        break;
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        lastError = error;
        if (attempt < 3) {
          // wait before retry
          execSync('sleep 2', { stdio: 'ignore' });
        }
      }
    }

    // fail if all retries exhausted
    if (lastError) {
      throw new Error(
        `bun install failed after 3 attempts: ${lastError.message}`,
      );
    }
  }

  return { path: repoPath };
};

/**
 * .what = convert legacy keyrack.manifest.json to encrypted keyrack.host.age
 * .why = fixtures use old format; new code expects encrypted age format
 */
const convertLegacyManifest = async (input: {
  repoPath: string;
}): Promise<void> => {
  const oldPath = join(input.repoPath, '.rhachet', 'keyrack.manifest.json');
  const newDir = join(input.repoPath, '.rhachet', 'keyrack');
  const newPath = join(newDir, 'keyrack.host.age');

  // skip if old manifest dne
  if (!existsSync(oldPath)) return;

  // read old manifest
  const oldContent = readFileSync(oldPath, 'utf8');
  const oldManifest = JSON.parse(oldContent);

  // convert to new format with recipients
  const now = new Date().toISOString();
  const newManifest = {
    uri: `file://~/.rhachet/keyrack/keyrack.host.age`,
    owner: null,
    recipients: [
      {
        mech: 'age',
        pubkey: TEST_SSH_AGE_RECIPIENT,
        label: 'test-key',
        addedAt: now,
      },
    ],
    hosts: {} as Record<string, unknown>,
  };

  // convert hosts to new schema with env and org fields
  for (const [slug, host] of Object.entries(oldManifest.hosts ?? {})) {
    const hostData = host as Record<string, unknown>;
    // parse slug to extract org and env (format: org.env.key)
    const parts = slug.split('.');
    const org = parts.length >= 3 ? parts[0] : 'unknown';
    const env = parts.length >= 3 ? parts[1] : 'all';

    newManifest.hosts[slug] = {
      ...hostData,
      env: (hostData.env as string) ?? env,
      org: (hostData.org as string) ?? org,
      vaultRecipient: null,
      maxDuration: null,
    };
  }

  // ensure directory exists
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true });
  }

  // encrypt to test recipient
  const plaintext = JSON.stringify(newManifest, null, 2);
  const recipient = new KeyrackKeyRecipient({
    mech: 'age',
    pubkey: TEST_SSH_AGE_RECIPIENT,
    label: 'test-key',
    addedAt: now,
  });
  const ciphertext = await encryptToRecipients({
    plaintext,
    recipients: [recipient],
  });

  // write encrypted manifest
  writeFileSync(newPath, ciphertext, 'utf8');
  chmodSync(newPath, 0o600);

  // remove old manifest
  unlinkSync(oldPath);

  // convert os.secure credential files to recipient-based encryption
  await convertOsSecureCredentials({ repoPath: input.repoPath, recipient });
};

/**
 * .what = re-encrypt os.secure credential files to test recipient
 * .why = fixture .age files use passphrase encryption (scrypt stanza) but tests use
 *        auto-discovered identity via $HOME/.ssh/id_ed25519 for decryption (X25519 stanza)
 */
const convertOsSecureCredentials = async (input: {
  repoPath: string;
  recipient: KeyrackKeyRecipient;
}): Promise<void> => {
  const { asHashSha256Sync } = await import('hash-fns');
  const secureDir = join(input.repoPath, '.rhachet', 'keyrack', 'vault', 'os.secure');

  // skip if os.secure directory dne
  if (!existsSync(secureDir)) return;

  // iterate over all .age files in the secure directory
  const files = readdirSync(secureDir);
  for (const file of files) {
    if (!file.endsWith('.age')) continue;

    const filePath = join(secureDir, file);
    const hash = file.replace('.age', '');

    // match hash to known slug and re-encrypt with test recipient
    for (const [slug, value] of Object.entries(KNOWN_OS_SECURE_VALUES)) {
      const slugHash = asHashSha256Sync(slug).slice(0, 16);
      if (slugHash === hash) {
        const ciphertext = await encryptToRecipients({
          plaintext: value,
          recipients: [input.recipient],
        });
        writeFileSync(filePath, ciphertext, 'utf8');
        chmodSync(filePath, 0o600);
        break;
      }
    }
  }
};

/**
 * .what = recursively makes all .sh files executable
 * .why = shell skills need execute permission after copy
 */
const setSkillsExecutable = (input: { dir: string }): void => {
  const entries = readdirSync(input.dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(input.dir, entry.name);

    if (entry.isDirectory()) {
      setSkillsExecutable({ dir: fullPath });
    }

    if (entry.isFile() && entry.name.endsWith('.sh')) {
      chmodSync(fullPath, '755');
    }
  }
};

/**
 * .what = copy test SSH key into temp repo .ssh/ directory
 * .why = findDefaultSshKey() looks in $HOME/.ssh/ — set HOME to temp repo for isolation
 */
const setupTestSshKey = (input: { repoPath: string }): void => {
  const sshDir = join(input.repoPath, '.ssh');
  if (!existsSync(sshDir)) mkdirSync(sshDir, { mode: 0o700 });

  // copy test SSH key pair
  const prikeyDst = join(sshDir, 'id_ed25519');
  const pubkeyDst = join(sshDir, 'id_ed25519.pub');
  const prikeySrc = join(TEST_SSH_KEY_DIR, 'test_key_ed25519');
  const pubkeySrc = join(TEST_SSH_KEY_DIR, 'test_key_ed25519.pub');

  cpSync(prikeySrc, prikeyDst);
  cpSync(pubkeySrc, pubkeyDst);

  // set correct permissions
  chmodSync(prikeyDst, 0o600);
  chmodSync(pubkeyDst, 0o644);
};
