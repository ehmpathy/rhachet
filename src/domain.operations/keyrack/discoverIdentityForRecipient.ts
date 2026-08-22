import { getAllAgeRecipientPairs } from '@src/domain.operations/keyrack/getAllAgeRecipientPairs';
import { getOneAgeRecipientOrNull } from '@src/domain.operations/keyrack/getOneAgeRecipientOrNull';
import {
  listSshAgentKeys,
  readSshPubkey,
  sshPrikeyToAgeIdentity,
} from '@src/infra/ssh';

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = discover identity that matches a manifest recipient
 * .why = eliminates need for identity file; reduces metadata leakage
 *
 * .note = checks ssh-agent first (most likely to have the unlocked key)
 * .note = then checks standard ssh paths (~/.ssh/id_ed25519, etc)
 * .note = returns null if no match found (caller should suggest --prikey)
 * .note = getOneAgeRecipientOrNull skips a per-key parse miss but rethrows a broken crypto load (e6);
 *         the identity derivations (sshPrikeyToAgeIdentity) on a matched key are NOT swallowed —
 *         a match with a broken crypto load must fail loud, not degrade to "no match"
 */
export const discoverIdentityForRecipient = async (input: {
  recipients: Array<{ mech: string; pubkey: string }>;
}): Promise<string | null> => {
  // convert ssh recipients to age format for comparison, keep the original alongside each
  const ageRecipients = await getAllAgeRecipientPairs({
    recipients: input.recipients,
  });

  // check ssh-agent first (most likely to have the unlocked key)
  const agentKeys = listSshAgentKeys();
  for (const agentKey of agentKeys) {
    const agentRecipient = await getOneAgeRecipientOrNull({
      pubkey: agentKey.pubkey,
    });
    if (!agentRecipient) continue;

    // check if this agent key matches any recipient
    const matched = ageRecipients.some(
      (r) => r.ageRecipient === agentRecipient,
    );
    if (!matched) continue;

    // found match in agent — derive identity from the comment (path), fail loud if crypto broken
    const keyPath = agentKey.comment;
    if (keyPath && existsSync(keyPath))
      return await sshPrikeyToAgeIdentity({ keyPath });

    // if comment is not a valid path, check standard paths that carry this pubkey
    const stdMatchPath = await getOneStdPathForRecipientOrNull({
      agentRecipient,
    });
    if (stdMatchPath)
      return await sshPrikeyToAgeIdentity({ keyPath: stdMatchPath });
  }

  // check standard ssh paths (fallback if not in agent)
  for (const stdPath of getStandardSshPaths()) {
    if (!existsSync(stdPath)) continue;
    if (!existsSync(`${stdPath}.pub`)) continue;

    const stdRecipient = await getOneStdRecipientOrNull({ keyPath: stdPath });
    if (!stdRecipient) continue;

    const matched = ageRecipients.some((r) => r.ageRecipient === stdRecipient);
    if (matched) return await sshPrikeyToAgeIdentity({ keyPath: stdPath });
  }

  // no match found
  return null;
};

/**
 * .what = find the standard ssh key path whose pubkey converts to the given age recipient, or null
 * .why = an agent key whose comment is not a usable path may still live at a standard path; this
 *        locates it by a compare of the age recipient. a per-key read/parse miss is skipped; a broken
 *        crypto load rethrows via getOneAgeRecipientOrNull (e6).
 */
const getOneStdPathForRecipientOrNull = async (input: {
  agentRecipient: string;
}): Promise<string | null> => {
  for (const stdPath of getStandardSshPaths()) {
    if (!existsSync(stdPath)) continue;
    const stdRecipient = await getOneStdRecipientOrNull({ keyPath: stdPath });
    if (stdRecipient === input.agentRecipient) return stdPath;
  }
  return null;
};

/**
 * .what = read a standard ssh key's pubkey and convert to an age recipient, or null on a read/parse miss
 * .why = the pubkey file may be absent or unreadable (skip, expected); a broken crypto load rethrows
 *        via getOneAgeRecipientOrNull (e6).
 */
const getOneStdRecipientOrNull = async (input: {
  keyPath: string;
}): Promise<string | null> => {
  let stdPubkey: string;
  try {
    stdPubkey = readSshPubkey({ keyPath: input.keyPath });
  } catch {
    // expected: the .pub file is absent/unreadable — skip this candidate
    return null;
  }
  return getOneAgeRecipientOrNull({ pubkey: stdPubkey });
};

/**
 * .what = get standard ssh key paths to check
 * .why = covers common key locations
 */
const getStandardSshPaths = (): string[] => {
  const home = process.env.HOME ?? homedir();
  return [
    join(home, '.ssh', 'id_ed25519'),
    join(home, '.ssh', 'id_rsa'),
    join(home, '.ssh', 'id_ecdsa'),
  ];
};
