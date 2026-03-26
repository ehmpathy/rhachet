import { spawnSync } from 'child_process';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

const getSlug = (k: KeyrackGrantAttempt): string =>
  k.status === 'granted' ? k.grant.slug : k.slug;

/**
 * .what = source keyrack keys into process.env
 * .why = enables test setup files to fetch credentials without manual `source` commands
 *
 * .note = sync because jest setup files run synchronously
 * .note = keyrack already prefers passthrough (checks env vars first)
 * .note = prints same stdout as `rhx keyrack get` and exits with code 2 on failure
 */
export const sourceAllKeysIntoEnv = (input: {
  /**
   * the environment to fetch keys for (e.g., 'test', 'prod')
   */
  env: string;

  /**
   * the keyrack owner (e.g., 'ehmpath')
   */
  owner: string;

  /**
   * when 'strict', failfast if any keys are not granted (default: 'strict')
   */
  mode?: 'strict' | 'lenient';
}): void => {
  const args = [
    'keyrack',
    'get',
    '--for',
    'repo',
    '--env',
    input.env,
    '--owner',
    input.owner,
  ];

  // call keyrack get --json to get structured data
  const jsonResult = spawnSync('./node_modules/.bin/rhx', [...args, '--json'], {
    encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
  });

  // if command failed to execute, get formatted output and exit
  if (jsonResult.error) {
    const formatted = spawnSync('./node_modules/.bin/rhx', args, {
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
    });
    process.stdout.write(formatted.stdout || '');
    process.stderr.write(formatted.stderr || jsonResult.error.message);
    process.exit(2);
  }

  // parse JSON response
  let keys: KeyrackGrantAttempt[];
  try {
    keys = JSON.parse(jsonResult.stdout);
  } catch {
    // JSON parse failed - get formatted output and forward it
    const formatted = spawnSync('./node_modules/.bin/rhx', args, {
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
    });
    process.stdout.write(formatted.stdout || jsonResult.stdout);
    process.stderr.write(formatted.stderr || jsonResult.stderr);
    process.exit(2);
  }

  // filter to keys for the requested env
  const keysForEnv = keys.filter((k) => getSlug(k).includes(`.${input.env}.`));

  // check if all keys are granted (strict mode enabled by default)
  const mode = input.mode ?? 'strict';
  const keysNotGranted = keysForEnv.filter((k) => k.status !== 'granted');
  if (mode === 'strict' && keysNotGranted.length > 0) {
    // get formatted output (same stdout as CLI) and forward it
    const formatted = spawnSync('./node_modules/.bin/rhx', args, {
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
    });
    const output = [
      formatted.stdout,
      formatted.stderr,
      '✋ some keys were not granted, yet are strictly required\n',
      '   └─ ask a human to set the keys, then try again\n',
    ].join('');
    process.stdout.write(output);
    process.stderr.write(output);
    process.exit(2);
  }

  // inject granted secrets into process.env
  for (const key of keysForEnv) {
    if (key.status !== 'granted') continue;
    // extract env var name from slug (e.g., "ehmpathy.test.OPENAI_API_KEY" → "OPENAI_API_KEY")
    const envVarName = key.grant.slug.split('.').pop();
    if (envVarName && !process.env[envVarName]) {
      process.env[envVarName] = key.grant.key.secret;
    }
  }
};
