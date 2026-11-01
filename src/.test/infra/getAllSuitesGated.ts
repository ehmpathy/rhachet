import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getAllTestFilePaths } from '@src/.test/infra/getAllTestFilePaths';
import { getCauseOfSuiteUngated } from '@src/.test/infra/getCauseOfSuiteUngated';

/**
 * .what = every test file under `cwd` that is wholly gated by `describeBrainLiveOnDemand`
 * .why = the clamp and the collection proof share one sense of "gated": the syntax-tree check
 *   the clamp enforces, never a second regex that could drift from it
 */
export const getAllSuitesGated = (input: { cwd: string }): string[] =>
  getAllTestFilePaths({ cwd: input.cwd }).filter(
    (path) =>
      getCauseOfSuiteUngated({ content: readFileSync(join(input.cwd, path), 'utf8') }) === null,
  );
