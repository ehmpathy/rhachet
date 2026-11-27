import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { asRecordOrNull } from './asRecordOrNull';
import { withAbsentAsNull } from './withAbsentAsNull';

/**
 * .what = the package root and version of one rhachet install, or null where none sits there
 * .note = one read, never a probe then a read; an absent manifest is null, a foreign one too
 */
const getOneRhachetPackageOrNull = (input: {
  dir: string;
}): { path: string; version: string } | null => {
  const content = withAbsentAsNull({
    read: () => readFileSync(join(input.dir, 'package.json'), 'utf8'),
  });
  if (content === null) return null;
  const manifest = asRecordOrNull({ value: JSON.parse(content) });
  if (manifest?.name !== 'rhachet') return null;
  return {
    path: realpathSync(input.dir),
    version:
      typeof manifest.version === 'string' ? manifest.version : 'unknown',
  };
};

/**
 * .what = the package root of the rhachet this process runs, found by a walk up from this file
 */
const getOneRhxActive = (): { path: string; version: string } => {
  // walk up from this file until a dir holds rhachet's own package.json
  // .note = deliberate mutation — `dir` steps one level up per pass of the walk
  let dir = __dirname;
  while (dirname(dir) !== dir) {
    const found = getOneRhachetPackageOrNull({ dir });
    if (found) return found;
    dir = dirname(dir);
  }
  return { path: realpathSync(__dirname), version: 'unknown' };
};

/**
 * .what = which rhachet runs this process, and which one the repo pins
 * .why = a global or foreign rhx can run against a tree that pins another (vision cause 6), and
 *   then loads deps the pin never would (case 5); a fault that names both points the human at
 *   the cause rather than at the symptom
 */
export const getOneRhxProvenance = (input: {
  repoPath: string;
}): {
  active: { path: string; version: string };
  pinned: { path: string; version: string } | null;
} => ({
  active: getOneRhxActive(),
  pinned: getOneRhachetPackageOrNull({
    dir: join(input.repoPath, 'node_modules', 'rhachet'),
  }),
});
