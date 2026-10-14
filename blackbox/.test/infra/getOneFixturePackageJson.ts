import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the fixture repo's package.json, parsed
 * .why = the fixture operations that read or rewrite `scripts` share one reader
 */
export const getOneFixturePackageJson = (input: {
  dir: string;
}): Record<string, unknown> =>
  JSON.parse(readFileSync(join(input.dir, 'package.json'), 'utf-8'));
