import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { genActorBootSpawned } from '@src/domain.operations/boot/genActorBootSpawned';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { syncAndReportBrainDirBoots } from './syncAndReportBrainDirBoots';

const REPO_ACTOR_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude';

/**
 * .what = a git repo with one synthetic role linked under `.agent/`, and its cli context
 * .why = the sweep needs a corpus to render, so the floor gate is exercised against a
 *   repo whose write would otherwise SUCCEED — else a pass proves naught
 */
const genRepoWithRole = (input: {
  slug: string;
}): { repoPath: string; context: ContextCli } => {
  const repoPath = genSampleRepoWithRoles({
    slug: input.slug,
    roles: [{ repo: '.this', role: 'any' }],
    gitignore: '.agent/.actors/\n',
  });
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
          expect(error.message).toContain('2.1.280');
          expect(error.message).toContain('claude update');

          // the refusal precedes the write — no corpus, and no repo symlink
          expect(
            existsSync(join(repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'boot.md')),
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
        const env = genShimEnv({ dir: repoPath, version: '2.1.280' });
        const result = await syncAndReportBrainDirBoots(
          { repoPath, env },
          context,
        );
        expect(result.exitCode).toEqual(0);
        expect(result.repoActorRendered).toEqual(true);
        expect(
          existsSync(join(repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'boot.md')),
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
          expect(result.repoActorRendered).toEqual(true);
          expect(
            existsSync(join(repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'boot.md')),
          ).toEqual(true);
        },
      );
    });
  });

  given(
    '[case4] two clones with spawn boots, one of which cannot be written',
    () => {
      when('[t0] a brief changes and the sweep runs', () => {
        then(
          'the other clone takes the drift, and the exit code names the fault',
          async () => {
            // render once; a clone spawns on that boot; the brief changes; a second clone spawns
            const { repoPath, context } = genRepoWithRole({
              slug: 'sweep-drift-fault',
            });
            const env = genShimEnv({ dir: repoPath, version: '2.1.280' });
            const actorDir = join(
              repoPath,
              REPO_ACTOR_BRAIN_DIR_REL,
              '..',
              '..',
            );
            const briefPath = join(
              repoPath,
              '.agent/repo=.this/role=any/briefs/core.md',
            );
            await syncAndReportBrainDirBoots({ repoPath, env }, context);
            const spawnedFaulted = genActorBootSpawned({
              actorDir,
              serial: 'aaaa',
            })!;
            writeFileSync(briefPath, 'any brief body, second\n');
            await syncAndReportBrainDirBoots({ repoPath, env }, context);
            const spawnedOk = genActorBootSpawned({
              actorDir,
              serial: 'bbbb',
            })!;

            // the first spawn boot cannot take a write; the brief changes again
            chmodSync(spawnedFaulted.dir, 0o500);
            writeFileSync(briefPath, 'any brief body, third\n');
            try {
              const result = await syncAndReportBrainDirBoots(
                { repoPath, env },
                context,
              );
              expect(result.exitCode).toEqual(1);
              expect(
                readFileSync(join(spawnedOk.dir, 'CLAUDE.md'), 'utf8'),
              ).toContain('any brief body, third');
            } finally {
              chmodSync(spawnedFaulted.dir, 0o700);
            }
          },
        );
      });
    },
  );
});
