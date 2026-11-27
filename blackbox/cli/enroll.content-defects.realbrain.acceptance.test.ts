import { delimiter } from 'node:path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';

import { asRoleContentDefectReceiptBlock } from '@/blackbox/.test/infra/asRoleContentDefectReceiptBlock';
import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genIsolatedClaudeHome } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import { genRepoWithRoleContentDefect } from '@/blackbox/.test/infra/genRepoWithRoleContentDefect';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

jest.setTimeout(300_000);

/**
 * .what = the proof that a REAL brain-cli is born past a content defect: a haiku clone of a repo
 *         whose own role holds an orphan `.md.min` answers its prompt
 * .why = the birth clamp (`enroll.content-defects.integration.test.ts`) proves rhachet births the
 *        clone with a stub brain on PATH; only a real claude proves the spawn it births is a brain
 *        that runs (`rule.require.test-claude-cli-against-haiku`)
 *
 * .note = a live turn on a paid key, so it runs only on the named flag
 *   (`rule.require.live-brain-tests-run-on-a-named-flag`): `rhx test.acceptance.brainlive`
 */
describeBrainLiveOnDemand('rhx enroll, a real brain is born past a content defect (acceptance, real haiku)', () => {
  given('[case1] a .this role with an orphan .md.min, and a real claude on PATH', () => {
    const scene = useBeforeAll(async () => {
      const { home, binDir } = genIsolatedClaudeHome({ slug: 'content-defects-realbrain-home' });
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      const env = {
        ...repo.env,
        ...envIsolated(home),
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        CLAUDE_CONFIG_DIR: undefined,
      };
      return { dir: repo.dir, env };
    });

    when('[t0] a haiku clone is enrolled with one prompt', () => {
      const run = useThen('it returns', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--await', '--model', 'haiku', '-p', 'reply with exactly: PONG'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 240_000,
        }),
      );

      then('🔴 the clone is born and the real brain answers', () => {
        // a failed birth names its cause: the brain-cli prints its errors to stdout
        expect(
          run.status === 0
            ? { status: 0 }
            : { status: run.status, stdout: run.stdout.slice(-500), stderr: run.stderr.slice(-500) },
        ).toEqual({ status: 0 });
        expect(run.stdout).toContain('PONG');
      });

      then('the receipt names the orphan the boot set aside', () => {
        expect(run.stderr).toContain('🟡 boot set aside 1 role content defect');
        expect(run.stderr).toContain('.agent/repo=.this/role=any/briefs/lost.md.min');
        expect(run.stderr).not.toContain('ConstraintError');
      });

      then('the receipt a live birth prints is locked', () => {
        // the receipt is deterministic; the live reply and the serial sit outside the block
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });
});
