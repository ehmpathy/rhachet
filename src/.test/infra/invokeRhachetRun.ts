import { type SpawnSyncReturns } from 'node:child_process';

import { invokeRhachetCli } from './invokeRhachetCli';

/**
 * .what = invokes rhachet run --skill
 * .why = common pattern for skill execution tests
 */
export const invokeRhachetRun = (input: {
  skill: string;
  cwd: string;
  stdin?: string;
  repo?: string;
  role?: string;
}): SpawnSyncReturns<string> => {
  const args = ['run', '--skill', input.skill];
  if (input.repo) args.push('--repo', input.repo);
  if (input.role) args.push('--role', input.role);

  return invokeRhachetCli({
    args,
    cwd: input.cwd,
    stdin: input.stdin,
  });
};
