import { execSync } from 'node:child_process';

/**
 * .what = list ssh keys from ssh-agent with their pubkeys
 * .why = enables recipient-based identity discovery
 *
 * .note = uses `ssh-add -L` to enumerate agent keys
 * .note = returns empty array if ssh-agent not available or has no keys
 */
export const listSshAgentKeys = (): Array<{
  pubkey: string;
  comment: string;
}> => {
  try {
    const output = execSync('ssh-add -L', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // parse output: one key per line, format: "type base64 comment"
    const lines = output.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const [keyType, base64Data, ...commentParts] = parts;

      // reconstruct the pubkey (type + base64)
      const pubkey = `${keyType} ${base64Data}`;
      const comment = commentParts.join(' ') || '';

      return { pubkey, comment };
    });
  } catch {
    // ssh-agent not available or no keys loaded
    // returns empty array (no throw)
    return [];
  }
};
