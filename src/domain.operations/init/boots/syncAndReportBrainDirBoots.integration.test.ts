import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { syncAndReportBrainDirBoots } from './syncAndReportBrainDirBoots';

const DEFAULT_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.slug=.default/brain/.claude';

/**
 * .what = a git repo with one synthetic role linked under `.agent/`, and its cli context
 * .why = the sweep needs a corpus to render, so the floor gate is exercised against a
 *   repo whose write would otherwise SUCCEED — else a pass proves naught
 */
const genRepoWithRole = (input: {
  slug: string;
}): { repoPath: string; context: ContextCli } => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  const roleDir = join(repoPath, '.agent', 'repo=.this', 'role=any');
  mkdirSync(join(roleDir, 'briefs'), { recursive: true });
  writeFileSync(join(roleDir, 'readme.md'), 'any readme');
  writeFileSync(join(roleDir, 'briefs', 'core.md'), 'any brief body');
  writeFileSync(join(repoPath, '.gitignore'), '.agent/.actors/\n');
  return {
    repoPath,
    context: new ContextCli({ cwd: repoPath, gitroot: repoPath }),
  };
};

/**
 * .what = an env whose PATH finds a `claude` shim that reports the given version
 * .why = the floor gate reads the cli the corpus is written FOR, so the test supplies it
 */
const genShimEnv = (input: {
  dir: string;
  version: string;
}): NodeJS.ProcessEnv => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const shimPath = join(binDir, 'claude');
  writeFileSync(
    shimPath,
    `#!/usr/bin/env bash\necho "${input.version} (Claude Code)"\n`,
    'utf-8',
  );
  chmodSync(shimPath, 0o755);
  return { ...process.env, PATH: `${binDir}:/usr/bin:/bin` };
};

describe('syncAndReportBrainDirBoots', () => {
  given('[case1] a host whose brain-cli sits below the floor', () => {
    when('[t0] the sweep runs', () => {
      then(
        'a ConstraintError refuses before any corpus is written',
        async () => {
          const { repoPath, context } = genRepoWithRole({
            slug: 'sweep-floor-below',
          });
          const env = genShimEnv({ dir: repoPath, version: '2.1.276' });
          const error = await getError(() =>
            syncAndReportBrainDirBoots({ repoPath, env }, context),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('2.1.276');
          expect(error.message).toContain('2.1.277');
          expect(error.message).toContain('claude update');

          // the refusal precedes the write — no corpus, and no repo symlink
          expect(
            existsSync(join(repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md')),
          ).toEqual(false);
          expect(existsSync(join(repoPath, '.claude'))).toEqual(false);
        },
      );
    });
  });

  given('[case2] a host whose brain-cli sits at the floor', () => {
    when('[t0] the sweep runs', () => {
      then('the corpus is written and the exit code is clean', async () => {
        const { repoPath, context } = genRepoWithRole({
          slug: 'sweep-floor-at',
        });
        const env = genShimEnv({ dir: repoPath, version: '2.1.277' });
        const result = await syncAndReportBrainDirBoots(
          { repoPath, env },
          context,
        );
        expect(result.exitCode).toEqual(0);
        expect(result.defaultRendered).toEqual(true);
        expect(
          existsSync(join(repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md')),
        ).toEqual(true);
      });
    });
  });

  given('[case3] a host with NO brain-cli on PATH', () => {
    when('[t0] the sweep runs', () => {
      then(
        'the corpus is still written — the floor binds no reader',
        async () => {
          const { repoPath, context } = genRepoWithRole({
            slug: 'sweep-floor-absent',
          });

          // an empty bin dir on PATH: the shim is absent, so the probe reports ENOENT.
          // a ci box that installs no cli is exactly this shape, and its write is correct
          const binDir = join(repoPath, '.empty-bin');
          mkdirSync(binDir, { recursive: true });
          const env = { ...process.env, PATH: binDir };

          const result = await syncAndReportBrainDirBoots(
            { repoPath, env },
            context,
          );
          expect(result.exitCode).toEqual(0);
          expect(result.defaultRendered).toEqual(true);
          expect(
            existsSync(join(repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md')),
          ).toEqual(true);
        },
      );
    });
  });
});
