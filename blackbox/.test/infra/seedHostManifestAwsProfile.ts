import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { encryptToRecipients } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';

import { TEST_SSH_AGE_RECIPIENT } from './genTestTempRepo';

/**
 * .what = seed a `{org}.{env}.AWS_PROFILE` peer entry into an owner-scoped host manifest
 * .why = the org-scope hardcut authenticates a specific-org aws.params write as that org's
 *        declared AWS_PROFILE — the exid of the peer `{org}.{env}.AWS_PROFILE` host-manifest
 *        entry (see getOneKeyrackAwsParamOrgProfile). the manifest is owner-scoped
 *        (keyrack.host.{owner}.age), so a fixture converted at owner=null is invisible to a
 *        `--owner {owner}` set. this writes the peer entry into the SAME owner manifest the set
 *        reads, so a specific-org github-app / replica persist resolves its identity instead of
 *        a fail-loud. mirrors convertLegacyManifest's age-recipient encryption exactly, so the
 *        CLI decrypts it via the auto-discovered test ssh identity
 *
 * .note = the aws.config vault + EPHEMERAL_VIA_AWS_SSO mech match how a real org declares its
 *         profile; only the exid (the profile name) is read by the identity resolver
 * .note = writes the manifest fresh — call BEFORE any `keyrack set` for this owner so the set
 *         findsert-appends its own key into this manifest
 */
export const seedHostManifestAwsProfile = async (input: {
  repoPath: string;
  owner: string;
  org: string;
  env: string;
  profile: string;
}): Promise<void> => {
  const now = new Date().toISOString();
  const slug = `${input.org}.${input.env}.AWS_PROFILE`;

  const manifest = {
    uri: `file://~/.rhachet/keyrack/keyrack.host.${input.owner}.age`,
    owner: input.owner,
    recipients: [
      {
        mech: 'age',
        pubkey: TEST_SSH_AGE_RECIPIENT,
        label: 'test-key',
        addedAt: now,
      },
    ],
    hosts: {
      [slug]: {
        slug,
        vault: 'aws.config',
        mech: 'EPHEMERAL_VIA_AWS_SSO',
        exid: input.profile,
        env: input.env,
        org: input.org,
        meta: null,
        maxDuration: null,
        createdAt: now,
        updatedAt: now,
      },
    },
  };

  const recipient = new KeyrackKeyRecipient({
    mech: 'age',
    pubkey: TEST_SSH_AGE_RECIPIENT,
    label: 'test-key',
    addedAt: now,
  });
  const ciphertext = await encryptToRecipients({
    plaintext: JSON.stringify(manifest, null, 2),
    recipients: [recipient],
  });

  const dir = join(input.repoPath, '.rhachet', 'keyrack');
  mkdirSync(dir, { recursive: true });

  const manifestPath = join(dir, `keyrack.host.${input.owner}.age`);
  writeFileSync(manifestPath, ciphertext, 'utf8');
  chmodSync(manifestPath, 0o600);

  // unencrypted index (aws.config is a refed vault, so it belongs in the locked/absent index)
  const indexPath = join(dir, `keyrack.host.${input.owner}.index.json`);
  writeFileSync(indexPath, JSON.stringify([slug], null, 2), 'utf8');
  chmodSync(indexPath, 0o600);
};
