import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { BrainHook } from '@src/domain.objects/BrainHook';

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';
import { setHookDispatchManifest } from './setHookDispatchManifest';
import { setHookDispatchManifestRederived } from './setHookDispatchManifestRederived';

const SKILL_REL = '.agent/repo=test/role=tester/skills/guard.sh';

/**
 * .what = a temp repo with one bash skill, and a manifest whose one row was derived from it
 */
const genScene = async (input: { slug: string }) => {
  const repoPath = genTempDir({ slug: input.slug });
  mkdirSync(join(repoPath, '.agent/repo=test/role=tester/skills'), {
    recursive: true,
  });
  writeFileSync(join(repoPath, SKILL_REL), '#!/usr/bin/env bash\necho guard\n');
  const hook = new BrainHook({
    author: 'repo=test/role=tester',
    event: 'onTool',
    command: './node_modules/.bin/rhx guard --mode hook',
    timeout: 'PT5S',
    filter: { what: 'Bash' },
  });
  const manifestPath = join(repoPath, '.claude', 'hooks.dispatch.manifest');
  mkdirSync(join(repoPath, '.claude'), { recursive: true });
  await setHookDispatchManifest({
    path: manifestPath,
    rules: [getOneHookDispatchRuleOfBrainHook({ hook, repoPath })],
  });
  return { repoPath, manifestPath };
};

describe('setHookDispatchManifestRederived', () => {
  given('[case1] a manifest whose rows still match their files', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'dispatch-rederive-unchanged' }),
    );

    when('[t0] the rules are derived again', () => {
      const result = useBeforeAll(async () => {
        const textBefore = readFileSync(scene.manifestPath, 'utf-8');
        const mtimeBefore = statSync(scene.manifestPath).mtimeMs;
        const { rules } = await setHookDispatchManifestRederived({
          manifestPath: scene.manifestPath,
          repoPath: scene.repoPath,
        });
        return {
          rules,
          textBefore,
          textAfter: readFileSync(scene.manifestPath, 'utf-8'),
          mtimeBefore,
          mtimeAfter: statSync(scene.manifestPath).mtimeMs,
        };
      });

      then('the row reads as the bash skill it was synced as', () => {
        expect(result.rules.map((rule) => rule.kind)).toEqual(['rhx-skill']);
      });

      then('the manifest is not rewritten', () => {
        expect(result.textAfter).toEqual(result.textBefore);
        expect(result.mtimeAfter).toEqual(result.mtimeBefore);
      });
    });
  });

  given(
    '[case2] a skill whose shebang turned from bash to node after the sync',
    () => {
      const scene = useBeforeAll(async () => {
        const base = await genScene({ slug: 'dispatch-rederive-shebang' });
        writeFileSync(
          join(base.repoPath, SKILL_REL),
          "#!/usr/bin/env node\nconsole.log('guard');\n",
        );
        return base;
      });

      when('[t0] the rules are derived again', () => {
        const result = useBeforeAll(async () => {
          const { rules } = await setHookDispatchManifestRederived({
            manifestPath: scene.manifestPath,
            repoPath: scene.repoPath,
          });
          const manifest = await getOneHookDispatchManifest({
            path: scene.manifestPath,
          });
          return { rules, manifest };
        });

        then(
          'the row runs the file as its own process, never sourced as bash',
          () => {
            expect(result.rules.map((rule) => rule.kind)).toEqual(['exec']);
          },
        );

        then('the manifest on disk holds the fresh row', () => {
          expect(result.manifest?.rules.map((rule) => rule.kind)).toEqual([
            'exec',
          ]);
        });

        then('the declared command is unchanged', () => {
          expect(result.manifest?.rules.map((rule) => rule.command)).toEqual([
            './node_modules/.bin/rhx guard --mode hook',
          ]);
        });
      });
    },
  );

  given(
    '[case3] a manifest of an older text shape, its rows still true (no label lines)',
    () => {
      // a manifest written before the label lines held the same rules, so a diff of rules alone
      //   called it unchanged and it never converged to the readable form a sync writes
      const scene = useBeforeAll(async () => {
        const base = await genScene({ slug: 'dispatch-rederive-older-shape' });
        const textCurrent = readFileSync(base.manifestPath, 'utf-8');
        const textOlder = textCurrent
          .split('\n')
          .filter((line, index) => index === 0 || !line.startsWith('# '))
          .join('\n');
        writeFileSync(base.manifestPath, textOlder);
        return { ...base, textCurrent, textOlder };
      });

      when('[t0] the rules are derived again', () => {
        const result = useBeforeAll(async () => {
          await setHookDispatchManifestRederived({
            manifestPath: scene.manifestPath,
            repoPath: scene.repoPath,
          });
          return { textAfter: readFileSync(scene.manifestPath, 'utf-8') };
        });

        then('the older text differs from the current one', () => {
          expect(scene.textOlder).not.toEqual(scene.textCurrent);
        });

        then('the manifest is rewritten to the text a sync writes', () => {
          expect(result.textAfter).toEqual(scene.textCurrent);
        });
      });
    },
  );

  given('[case4] no manifest', () => {
    when('[t0] the rules are derived again', () => {
      const result = useBeforeAll(async () =>
        setHookDispatchManifestRederived({
          manifestPath: join(
            genTempDir({ slug: 'dispatch-rederive-absent' }),
            'hooks.dispatch.manifest',
          ),
          repoPath: genTempDir({ slug: 'dispatch-rederive-absent-repo' }),
        }),
      );

      then('there are no rules, and naught is written', () => {
        expect(result.rules).toEqual([]);
      });
    });
  });
});
