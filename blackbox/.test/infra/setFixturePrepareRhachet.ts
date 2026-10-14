import { randomBytes } from 'node:crypto';
import { renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asFixturePackageJsonWithPrepare } from './asFixturePackageJsonWithPrepare';
import { getOneFixturePackageJson } from './getOneFixturePackageJson';

/**
 * .what = sets the fixture's `prepare:rhachet` entry (and the `prepare` hop to it), and keeps
 *   every other entry the fixture's `scripts` holds
 * .why = the `prepare:rhachet` replay must follow an incremental removal
 *        (inventory.of=requirements.case=1); the acceptance cases seed one to check it
 */
export const setFixturePrepareRhachet = (input: {
  dir: string;
  command: string;
}): void => {
  const pkg = getOneFixturePackageJson({ dir: input.dir });
  const pkgNext = asFixturePackageJsonWithPrepare({ pkg, command: input.command });
  setFixturePackageJson({ dir: input.dir, pkg: pkgNext });
};

/**
 * .what = writes the fixture's package.json, two-space indented, whole or not at all
 * .why = a temp write then a rename, so a peer reader never sees half a file
 * .note = the temp name carries the pid and a random suffix, so two writes in one process
 *   never share a temp file
 */
const setFixturePackageJson = (input: {
  dir: string;
  pkg: Record<string, unknown>;
}): void => {
  const pkgPath = join(input.dir, 'package.json');
  const tempPath = `${pkgPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tempPath, JSON.stringify(input.pkg, null, 2));
  renameSync(tempPath, pkgPath);
};
