import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  listSshAgentKeys,
  readSshPubkey,
  sshPrikeyToAgeIdentity,
  sshPubkeyToAgeRecipient,
} from '../../infra/ssh';

/**
 * .what = discover identity that matches a manifest recipient
 * .why = eliminates need for identity file; reduces metadata leakage
 *
 * .note = checks ssh-agent first (most likely to have the unlocked key)
 * .note = then checks standard ssh paths (~/.ssh/id_ed25519, etc)
 * .note = returns null if no match found (caller should suggest --prikey)
 */
export const discoverIdentityForRecipient = (input: {
  recipients: Array<{ mech: string; pubkey: string }>;
}): string | null => {
  // convert recipients to age format for comparison
  const ageRecipients = input.recipients
    .filter((r) => r.mech === 'ssh')
    .map((r) => {
      try {
        return {
          original: r,
          ageRecipient: sshPubkeyToAgeRecipient({ pubkey: r.pubkey }),
        };
      } catch {
        return null;
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // check ssh-agent first (most likely to have the unlocked key)
  const agentKeys = listSshAgentKeys();
  for (const agentKey of agentKeys) {
    try {
      const agentRecipient = sshPubkeyToAgeRecipient({
        pubkey: agentKey.pubkey,
      });

      // check if this agent key matches any recipient
      const matchedRecipient = ageRecipients.find(
        (r) => r.ageRecipient === agentRecipient,
      );

      if (matchedRecipient) {
        // found match in agent — derive identity from the comment (path)
        // agent keys often have path as comment (e.g., "/home/user/.ssh/id_ed25519")
        const keyPath = agentKey.comment;
        if (keyPath && existsSync(keyPath)) {
          return sshPrikeyToAgeIdentity({ keyPath });
        }

        // if comment is not a valid path, check standard paths that match this pubkey
        for (const stdPath of getStandardSshPaths()) {
          if (!existsSync(stdPath)) continue;
          try {
            const stdPubkey = readSshPubkey({ keyPath: stdPath });
            const stdRecipient = sshPubkeyToAgeRecipient({ pubkey: stdPubkey });
            if (stdRecipient === agentRecipient) {
              return sshPrikeyToAgeIdentity({ keyPath: stdPath });
            }
          } catch {
            // skip keys that fail to read
          }
        }
      }
    } catch {
      // skip keys that fail to convert
    }
  }

  // check standard ssh paths (fallback if not in agent)
  for (const stdPath of getStandardSshPaths()) {
    if (!existsSync(stdPath)) continue;
    if (!existsSync(`${stdPath}.pub`)) continue;

    try {
      const pubkey = readSshPubkey({ keyPath: stdPath });
      const stdRecipient = sshPubkeyToAgeRecipient({ pubkey });

      const matchedRecipient = ageRecipients.find(
        (r) => r.ageRecipient === stdRecipient,
      );

      if (matchedRecipient) {
        return sshPrikeyToAgeIdentity({ keyPath: stdPath });
      }
    } catch {
      // skip keys that fail to read or convert
    }
  }

  // no match found
  return null;
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
