import { genLogMethods } from 'sdk-logs';

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const log = genLogMethods();

/**
 * .what = list the filenames cached in ~/.aws/sso/cache (not contents)
 * .why = sso token files are named sha1(session_name).json; the set of
 *        filenames reveals whether a token landed under the real profile's
 *        session vs the temp guided-setup session — key to diagnose the
 *        cli-vs-sdk divergence
 *
 * .note = filenames only; never logs token contents (secrets)
 */
const getAwsSsoCacheFileNames = (): string[] => {
  const cacheDir = join(homedir(), '.aws', 'sso', 'cache');
  if (!existsSync(cacheDir)) return [];
  return readdirSync(cacheDir);
};

/**
 * .what = emit which proof gate returned not-live
 * .why = pinpoints which gate returns invalid, so cli-vs-sdk divergence can be
 *        diagnosed without guesswork
 *
 * .note = level depends on caller context: info where invalid is a failure (set),
 *         debug where an expired session is an expected re-login trigger
 */
export const emitSsoGateInvalid = (input: {
  gate: 'fromSSO' | 'export-credentials' | 'sts';
  profileName: string;
  error: unknown;
  level: 'info' | 'debug';
}): void => {
  // .note = the label names the proof, not one caller: the vault's set, its get, and the
  //         daemon's renew all reach these gates
  log[input.level]('🐈 keyrack.awsSso.sessionProof: gate invalid', {
    gate: input.gate,
    valid: false,
    profileName: input.profileName,
    ssoCacheFiles: getAwsSsoCacheFileNames(),
    error:
      input.error instanceof Error
        ? { name: input.error.name, message: input.error.message }
        : input.error,
  });
};
