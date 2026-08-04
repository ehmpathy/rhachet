import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import util from 'util';

import { keyrack } from 'rhachet/keyrack';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new Error('no package.json found in cwd. are you @gitroot?');

/**
 * .what = verify that the env has sufficient auth to run the tests if aws is used; otherwise, fail fast
 * .why =
 *   - prevent time wasted waiting on tests to fail due to lack of credentials
 *   - prevent time wasted debugging tests which are failing due to hard-to-read missed credential errors
 */
const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
const requiresAwsAuth =
  existsSync(declapractUsePath) &&
  readFileSync(declapractUsePath, 'utf8').includes('awsAccountId');
if (
  requiresAwsAuth &&
  !(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID)
)
  throw new Error(
    'no aws credentials present. please authenticate with aws to run acceptance tests',
  );

/**
 * .what = source api keys from keyrack into process.env; otherwise, fail fast
 * .why =
 *   - prevent time wasted on tests that fail due to absent api keys
 *   - prevent agents from quit when they have access to credentials
 *
 * .note = hardcoded to --owner ehmpath because we expect only ehmpaths to work in this repo
 * .note = keyrack already prefers passthrough (checks env vars first)
 * .note = mode 'lenient' — acceptance tests self-provision credentials per-subprocess (isolated
 *   HOME, fixtures, a local SSM stand-in), so this global source is a best-effort convenience, not
 *   a hard gate. a strict source would exit(2) the WHOLE suite whenever any env.test key (e.g. the
 *   SSO-backed AWS_PROFILE) is locked on an unattended host — even though no acceptance test reads
 *   it. lenient injects whatever is unlocked and skips the rest, so a test that truly needs a
 *   credential fails in that test with a legible error (never a blanket global halt). on CI the
 *   credentials are present, so behaviour is unchanged. mirrors the lenient source in useKeyrack.
 */
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });
