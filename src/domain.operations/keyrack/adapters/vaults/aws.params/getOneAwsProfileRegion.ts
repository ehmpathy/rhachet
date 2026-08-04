import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = read the active aws profile's configured region from ~/.aws/config
 * .why = region is not ambient via IMDS, but a human's aws profile almost always declares one
 *        in ~/.aws/config; a read of it lets `keyrack set` work from a normal profile without an
 *        explicit AWS_REGION, while the caller still fails loud when even the profile has none
 * .note = a lightweight ini read (no aws-sdk dependency) so region resolves even before the
 *         optional declastruct-aws peer is loaded; returns null when the file, section, or key
 *         is absent
 */
export const getOneAwsProfileRegion = (input?: {
  profile?: string | null;
  configPath?: string | null;
}): string | null => {
  // the active profile: explicit arg, else AWS_PROFILE, else the default profile
  const profile = input?.profile ?? process.env.AWS_PROFILE ?? 'default';

  // the config file: explicit arg, else AWS_CONFIG_FILE, else ~/.aws/config
  const configPath =
    input?.configPath ??
    process.env.AWS_CONFIG_FILE ??
    join(homedir(), '.aws', 'config');

  // an absent config file is the benign "no profile region" case → null. check existence up
  // front so no throw is caught here — a read error (permissions, etc.) then surfaces loud on
  // its own, never swallowed (rule.forbid.failhide)
  if (!existsSync(configPath)) return null;
  const content = readFileSync(configPath, 'utf8');

  // the section header: `[default]` for the default profile, `[profile <name>]` otherwise
  const header = profile === 'default' ? '[default]' : `[profile ${profile}]`;

  // walk lines: match the header, then read `region = ...` until the next section header
  let inSection = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();

    // a section header toggles whether we are inside the target profile
    if (line.startsWith('[') && line.endsWith(']')) {
      inSection = line === header;
      continue;
    }

    // inside the target section, the first `region = ...` wins
    if (!inSection) continue;
    const match = line.match(/^region\s*=\s*(.+)$/);
    if (match?.[1]) return match[1].trim();
  }

  // section absent, or present with no region key
  return null;
};
