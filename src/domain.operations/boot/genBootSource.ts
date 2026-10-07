import { resolve } from 'node:path';
import type { BootSource } from './BootSource';

/**
 * .what = a BootSource from the fields an arm decides, with the layout-fixed fields derived
 * .why = three arms build a BootSource. the readme and the skills dir sit at one fixed place
 *        under `rootDir` in every arm, so they are derived here once rather than restated
 *        thrice — and an arm cannot drift on the one layout fact they all share.
 *
 * .note = every field an arm genuinely DECIDES stays an input: the spec path, the brief
 *   universe, the label, the invocation, the coordinates, and whether the spec was declared.
 */
export const genBootSource = (input: {
  rootDir: string;
  pathToSpec: string;
  dirBriefs: string | null;
  label: { base: string; prefix: string };
  invocation: string;
  coordinates: string;
  specIsDeclared: boolean;
}): BootSource => ({
  rootDir: input.rootDir,
  pathToSpec: input.pathToSpec,
  pathToReadme: resolve(input.rootDir, 'readme.md'),
  dirBriefs: input.dirBriefs,
  dirSkills: resolve(input.rootDir, 'skills'),
  label: input.label,
  invocation: input.invocation,
  coordinates: input.coordinates,
  specIsDeclared: input.specIsDeclared,
});
