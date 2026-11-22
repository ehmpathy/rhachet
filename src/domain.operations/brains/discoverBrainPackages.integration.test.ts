import * as fs from 'fs/promises';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { discoverBrainPackages } from './discoverBrainPackages';

describe('discoverBrainPackages', () => {
  given('[case1] package.json with brain packages', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDirPhysical({ slug: 'test-brains' });
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {
            'rhachet-brains-anthropic': '^1.0.0',
            'other-package': '^2.0.0',
          },
          devDependencies: {
            'rhachet-brains-opencode': '^1.0.0',
            jest: '^29.0.0',
          },
        }),
      );
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await discoverBrainPackages(context);
      return { dir, result };
    });

    when('[t0] discoverBrainPackages is called', () => {
      then('returns brain packages from both deps and devDeps', () => {
        expect(scene.result).toContain('rhachet-brains-anthropic');
        expect(scene.result).toContain('rhachet-brains-opencode');
      });

      then('does not include non-brain packages', () => {
        expect(scene.result).not.toContain('other-package');
        expect(scene.result).not.toContain('jest');
      });

      then('returns exactly 2 packages', () => {
        expect(scene.result).toHaveLength(2);
      });
    });
  });

  given('[case2] package.json with no brain packages', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDirPhysical({ slug: 'test-no-brains' });
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {
            lodash: '^4.0.0',
          },
        }),
      );
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await discoverBrainPackages(context);
      return { dir, result };
    });

    when('[t0] discoverBrainPackages is called', () => {
      then('returns empty array', () => {
        expect(scene.result).toEqual([]);
      });
    });
  });

  given('[case3] no package.json file', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDirPhysical({ slug: 'test-no-pkg' });
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const result = await discoverBrainPackages(context);
      return { dir, result };
    });

    when('[t0] discoverBrainPackages is called', () => {
      then('returns empty array', () => {
        expect(scene.result).toEqual([]);
      });
    });
  });

  given('[case4] package.json present but malformed', () => {
    // .why = a corrupt manifest (a stray comma, a merge-conflict marker) is a real defect in
    //        the caller's own repo, NOT one-bad-brain-among-many. discovery parses the SINGLE
    //        root manifest — there is no set to isolate a bad member from. so it must failfast +
    //        failloud (rule.forbid.failhide): a ConstraintError that names the fix, rather than
    //        degrade the corrupt manifest to the same [] as a healthy no-brains repo — which
    //        would silently drop every brain (the exact bug class #429 kills).
    const scene = useBeforeAll(async () => {
      const dir = genTempDirPhysical({ slug: 'test-malformed-pkg' });
      // a corrupt manifest — unclosed braces, the shape of a real merge-conflict breakage
      await fs.writeFile(
        path.join(dir, 'package.json'),
        '{ "dependencies": { "rhachet-brains-anthropic": "^1.0.0"',
      );

      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const error = await getError(discoverBrainPackages(context));
      return { dir, error };
    });

    when('[t0] discoverBrainPackages is called', () => {
      then('throws a ConstraintError (failfast, not a swallowed [])', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
      });

      then('the error names the manifest and the fix (failloud)', () => {
        expect(scene.error.message).toContain('package.json is not valid json');
        expect(scene.error.message).toContain('package.json');
      });
    });
  });
});
