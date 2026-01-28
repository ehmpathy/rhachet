import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasConfigExplicit } from './hasConfigExplicit';

describe('hasConfigExplicit', () => {
  given('[case1] a directory with rhachet.use.ts', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'with-config' });
      writeFileSync(join(tempDir, 'rhachet.use.ts'), '// config file');
      const context = new ContextCli({ cwd: tempDir, gitroot: tempDir });
      return { context };
    });

    when('[t0] hasConfigExplicit is called', () => {
      then('it returns true', () => {
        const result = hasConfigExplicit(scene.context);
        expect(result).toBe(true);
      });
    });
  });

  given('[case2] a directory without rhachet.use.ts', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'without-config' });
      const context = new ContextCli({ cwd: tempDir, gitroot: tempDir });
      return { context };
    });

    when('[t0] hasConfigExplicit is called', () => {
      then('it returns false', () => {
        const result = hasConfigExplicit(scene.context);
        expect(result).toBe(false);
      });
    });
  });
});
