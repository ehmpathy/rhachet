import { asFixtureScripts } from './asFixtureScripts';
import { getOneFixturePackageJson } from './getOneFixturePackageJson';

/**
 * .what = reads the fixture's `prepare:rhachet` entry, or null when absent
 * .why = the acceptance cases assert the replay after an incremental removal
 *        (inventory.of=requirements.case=1)
 */
export const getOneFixturePrepareRhachet = (input: {
  dir: string;
}): string | null => {
  const pkg = getOneFixturePackageJson({ dir: input.dir });
  return asFixtureScripts({ pkg })['prepare:rhachet'] ?? null;
};
