import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { BrainHook } from '@src/domain.objects/BrainHook';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';
import { setHookDispatchManifest } from './setHookDispatchManifest';
import { setHookDispatchManifestRepaired } from './setHookDispatchManifestRepaired';

/**
 * .what = a temp repo whose manifest holds one readable row
 */
const genScene = async (input: { slug: string }) => {
  const repoPath = genTempDir({ slug: input.slug });
  const manifestPath = join(repoPath, '.claude', 'hooks.dispatch.manifest');
  mkdirSync(join(repoPath, '.claude'), { recursive: true });
  const hook = new BrainHook({
    author: 'repo=test/role=tester',
    event: 'onTool',
    command: 'echo "bash guard ran"',
    timeout: 'PT5S',
    filter: { what: 'Bash' },
  });
  await setHookDispatchManifest({
    path: manifestPath,
    rules: [getOneHookDispatchRuleOfBrainHook({ hook, repoPath })],
  });
  return { repoPath, manifestPath };
};

describe('setHookDispatchManifestRepaired', () => {
  given('[case1] a readable manifest', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'dispatch-repair-readable' }),
    );

    when('[t0] the manifest is repaired', () => {
      const result = useBeforeAll(async () => {
        const textBefore = readFileSync(scene.manifestPath, 'utf-8');
        const { linesDropped } = await setHookDispatchManifestRepaired({
          manifestPath: scene.manifestPath,
        });
        return {
          linesDropped,
          textBefore,
          textAfter: readFileSync(scene.manifestPath, 'utf-8'),
        };
      });

      then('naught is dropped, and the manifest is byte-equal', () => {
        expect(result.linesDropped).toEqual(0);
        expect(result.textAfter).toEqual(result.textBefore);
      });
    });
  });

  given('[case2] a manifest with one readable row and one corrupt row', () => {
    const scene = useBeforeAll(async () => {
      const found = await genScene({ slug: 'dispatch-repair-corrupt' });
      const textReadable = readFileSync(found.manifestPath, 'utf-8');
      writeFileSync(found.manifestPath, `${textReadable}not a manifest\n`);
      return { ...found, textReadable };
    });

    when('[t0] the manifest is repaired', () => {
      const result = useBeforeAll(async () => {
        const { linesDropped } = await setHookDispatchManifestRepaired({
          manifestPath: scene.manifestPath,
        });
        return {
          linesDropped,
          textAfter: readFileSync(scene.manifestPath, 'utf-8'),
          manifest: await getOneHookDispatchManifest({
            path: scene.manifestPath,
          }),
        };
      });

      then('the corrupt row is counted as dropped', () => {
        expect(result.linesDropped).toEqual(1);
      });

      then('the readable row is kept, and the manifest reads again', () => {
        expect(result.manifest?.rules.map((rule) => rule.command)).toEqual([
          'echo "bash guard ran"',
        ]);
      });

      then('the manifest is rewritten as a sync writes it', () => {
        expect(result.textAfter).toEqual(scene.textReadable);
      });
    });
  });

  given('[case3] a manifest whose every line is corrupt', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'dispatch-repair-all-corrupt' });
      const manifestPath = join(repoPath, 'hooks.dispatch.manifest');
      writeFileSync(manifestPath, 'not a manifest\n');
      return { manifestPath };
    });

    when('[t0] the manifest is repaired', () => {
      const result = useBeforeAll(async () => {
        const { linesDropped } = await setHookDispatchManifestRepaired({
          manifestPath: scene.manifestPath,
        });
        return {
          linesDropped,
          manifest: await getOneHookDispatchManifest({
            path: scene.manifestPath,
          }),
        };
      });

      then(
        'the manifest stays, with zero rows, so its wires still land',
        () => {
          expect(result.linesDropped).toEqual(1);
          expect(result.manifest?.rules).toEqual([]);
        },
      );
    });
  });

  given('[case4] no manifest', () => {
    when('[t0] the manifest is repaired', () => {
      const result = useBeforeAll(async () =>
        setHookDispatchManifestRepaired({
          manifestPath: join(
            genTempDir({ slug: 'dispatch-repair-absent' }),
            'hooks.dispatch.manifest',
          ),
        }),
      );

      then('naught is dropped, and no manifest is written', () => {
        expect(result.linesDropped).toEqual(0);
      });
    });
  });
});
