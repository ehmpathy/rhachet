import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { encryptToRecipients } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';

import { getTestSshAgeRecipient } from './genTestTempRepo';

// the vaults keyrack refs (an external source of truth); only their slugs belong in the index
const VAULTS_REFED = ['aws.config', 'aws.params', '1password'];

/**
 * .what = key each seed entry by its slug, stamped with the manifest's metadata fields
 * .why = the host manifest's `hosts` field is a record of slug → host
 */
const asHostManifestHostsBySlug = <TEntry extends { slug: string }>(input: {
  entries: TEntry[];
  now: string;
}): Record<string, Record<string, unknown>> =>
  Object.fromEntries(
    input.entries.map((entry) => [
      entry.slug,
      { ...entry, maxDuration: null, createdAt: input.now, updatedAt: input.now },
    ]),
  );

/**
 * .what = the slugs of the seed entries whose vault is refed
 * .why = only a refed-vault slug belongs in the plaintext index; an owned-vault slug never does
 */
const getAllSlugsOfRefedVaults = (input: {
  entries: { slug: string; vault: string }[];
}): string[] =>
  input.entries
    .filter((entry) => VAULTS_REFED.includes(entry.vault))
    .map((entry) => entry.slug);

/**
 * .what = seed host-manifest entries into an owner-scoped host manifest, written fresh
 * .why = a test that needs a box in a given shape (e.g., a key mapped to a refed vault whose
 *        backend the box cannot reach) seeds that shape directly, with no guided set and no
 *        credential. mirrors convertLegacyManifest's age-recipient encryption exactly, so the
 *        CLI decrypts it via the auto-discovered test ssh identity
 *
 * .note = writes the manifest fresh — call BEFORE any `keyrack set` for this owner, so a set
 *         findsert-appends its own key into this manifest
 * .note = a refed-vault slug (aws.config, aws.params, 1password) lands in the unencrypted index
 *         too; an owned-vault slug stays in the encrypted manifest alone
 * .note = the age encryption must stay byte-for-byte what `convertLegacyManifest` writes; a
 *         drift shows only as a decrypt failure
 */
export const seedHostManifestEntries = async (input: {
  repoPath: string;
  owner: string;
  entries: {
    slug: string;
    vault: string;
    mech: string;
    exid: string | null;
    env: string;
    org: string;
    meta: Record<string, unknown> | null;
  }[];
}): Promise<void> => {
  const now = new Date().toISOString();
  const pubkey = await getTestSshAgeRecipient();

  // compose the manifest, one host per entry
  const manifest = {
    uri: `file://~/.rhachet/keyrack/keyrack.host.${input.owner}.age`,
    owner: input.owner,
    recipients: [{ mech: 'age', pubkey, label: 'test-key', addedAt: now }],
    hosts: asHostManifestHostsBySlug({ entries: input.entries, now }),
  };

  // encrypt to the test ssh recipient
  const recipient = new KeyrackKeyRecipient({
    mech: 'age',
    pubkey,
    label: 'test-key',
    addedAt: now,
  });
  const ciphertext = await encryptToRecipients({
    plaintext: JSON.stringify(manifest, null, 2),
    recipients: [recipient],
  });

  // write the manifest + its index
  const dir = join(input.repoPath, '.rhachet', 'keyrack');
  mkdirSync(dir, { recursive: true });
  const manifestPath = join(dir, `keyrack.host.${input.owner}.age`);
  writeFileSync(manifestPath, ciphertext, 'utf8');
  chmodSync(manifestPath, 0o600);
  // only refed-vault slugs land in the plaintext index; an owned-vault (e.g. os.secure) slug never
  // belongs in an unencrypted file
  const indexPath = join(dir, `keyrack.host.${input.owner}.index.json`);
  const slugsRefed = getAllSlugsOfRefedVaults({ entries: input.entries });
  writeFileSync(indexPath, JSON.stringify(slugsRefed, null, 2), 'utf8');
  chmodSync(indexPath, 0o600);
};
