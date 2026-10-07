import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = writes the files given under one dir, each keyed by its dir-relative path
 * .why = a role dir, a route dir, and a boot fixture are each a small tree of named files.
 *        one writer keeps every fixture tree built the same way, so a suite declares only
 *        WHAT the tree holds (`rule.require.shared-test-fixtures`)
 */
export const genSampleFileTree = (input: {
  dir: string;
  files: Record<string, string>;
}): string => {
  mkdirSync(input.dir, { recursive: true });
  Object.entries(input.files).forEach(([pathRel, content]) => {
    const pathAbs = join(input.dir, pathRel);
    mkdirSync(dirname(pathAbs), { recursive: true });
    writeFileSync(pathAbs, content);
  });
  return input.dir;
};
