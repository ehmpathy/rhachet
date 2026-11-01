import { getAllLivePaths } from '@src/.test/infra/getAllLivePaths';

/**
 * .what = every test file under `cwd` that jest runs, sorted
 * .why = the live-brain clamp and the collection proof read the same set, so one universe names
 *   it: the tests are the `*.test.ts` files of `getAllLivePaths`, and the modules are the rest
 */
export const getAllTestFilePaths = (input: { cwd: string }): string[] =>
  getAllLivePaths({ cwd: input.cwd }).filter((path) => path.endsWith('.test.ts'));
