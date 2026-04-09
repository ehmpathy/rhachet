import { execSync } from 'node:child_process';

/**
 * .what = fail-fast if age cli is not installed
 * .why = --stanza ssh tests require age cli; cicd already installs it
 */
export const assertDepAgeIsInstalled = (): void => {
  try {
    execSync('which age', { stdio: 'ignore' });
  } catch {
    throw new Error(
      'age cli required; run `sudo apt install age`; --stanza ssh tests require it; cicd already installs',
    );
  }
};
