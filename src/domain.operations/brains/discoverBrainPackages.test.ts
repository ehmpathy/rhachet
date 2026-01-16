import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { discoverBrainPackages } from './discoverBrainPackages';

describe('discoverBrainPackages', () => {
  given('[case1] package.json with brain packages', () => {
    const scene = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `test-brains-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
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
      const result = await discoverBrainPackages({ from: dir });
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
      const dir = path.join(os.tmpdir(), `test-no-brains-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {
            lodash: '^4.0.0',
          },
        }),
      );
      const result = await discoverBrainPackages({ from: dir });
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
      const dir = path.join(os.tmpdir(), `test-no-pkg-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      const result = await discoverBrainPackages({ from: dir });
      return { dir, result };
    });

    when('[t0] discoverBrainPackages is called', () => {
      then('returns empty array', () => {
        expect(scene.result).toEqual([]);
      });
    });
  });
});
