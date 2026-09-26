import { asAgeIdentityOrNull } from '@src/infra/ssh/asAgeIdentityOrNull';
import { getAllSshAgentKeys } from '@src/infra/ssh/getAllSshAgentKeys';
import { getAllSshKeyCandidatePaths } from '@src/infra/ssh/getAllSshKeyCandidatePaths';

import { existsSync } from 'node:fs';

/**
 * .what = discover identities from ssh-agent and filesystem
 * .why = builds pool of identities to try for manifest decryption or verification
 *
 * .note = filesystem candidates come from the shared getAllSshKeyCandidatePaths
 *         (owner path first, then standard names) — the SAME precedence init seals
 *         with and unlock's Variant A re-derives K with, so all three never drift
 * .note = ssh-agent keys (path from comment) are added to the pool too
 * .note = this is a COLLECT-ALL pool (every convertible identity, de-duped), not a
 *         single pick, so the order within the pool is immaterial — the manifest
 *         decrypts with whichever pooled identity matches its recipient
 * .note = each candidate converts via asAgeIdentityOrNull, which allowlists ONLY
 *         the expected "not in-process-convertible" BadRequestError and rethrows
 *         genuine faults — so a corrupt key or I/O error never masquerades as
 *         "skip this key" (rule.forbid.failhide)
 */
export const discoverIdentities = (input: {
  owner: string | null;
}): string[] => {
  // gather every candidate key path (immutable build):
  //  - filesystem keys in the shared owner → standard precedence
  //  - ssh-agent keys (path from comment)
  const candidatePaths = [
    ...getAllSshKeyCandidatePaths({ owner: input.owner }),
    ...getAllSshAgentKeys()
      .map((agentKey) => agentKey.comment)
      .filter((comment): comment is string => !!comment),
  ];

  // convert each extant candidate, collect the unique identities (immutable):
  // asAgeIdentityOrNull allowlists ONLY the expected "not convertible" case and
  // rethrows genuine faults, so a null is a benign skip (rule.forbid.failhide)
  const identitiesAll = candidatePaths
    .filter((keyPath) => existsSync(keyPath))
    .map((keyPath) => asAgeIdentityOrNull({ keyPath }))
    .filter((identity): identity is string => identity !== null);

  return [...new Set(identitiesAll)];
};
