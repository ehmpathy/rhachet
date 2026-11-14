import { appendFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';

import {
  askClaudePrintForSentinels,
  asMaskedClaudeEnvelope,
  asSentinel,
} from '@/blackbox/.test/infra/brainDirBootJourney';
import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genIsolatedClaudeHome } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

jest.setTimeout(300_000);

const NONCE = getUuid().replace(/-/g, '').slice(0, 10);
const sentinelOf = (of: string): string => asSentinel({ of, nonce: NONCE });

/**
 * .what = the proof that a mod reaches a real brain: a haiku quotes what the mod shadows in and
 *         adds, and never quotes what the mod shadows out or nots
 * .why = the boot.md render is proven on disk by the roles.mods and init.mods suites; only a real
 *        brain proves the render is the corpus the brain-cli was handed
 */
describeBrainLiveOnDemand('roles mods reach a real brain (acceptance, real haiku)', () => {
  given('[case1] a repo whose surfer mod shadows one brief, adds one, and nots one', () => {
    const scene = useBeforeAll(async () => {
      const { home, binDir, binPath } = genIsolatedClaudeHome({ slug: 'mods-realbrain-home' });
      const repo = await genTestTempRepo({ fixture: 'with-mods' });

      // a sentinel in each brief whose fate the mod decides
      const rolesDir = join(repo.path, 'node_modules', 'rhachet-roles-test', 'roles');
      const modDir = join(repo.path, '.agent', 'repo=.mods', 'role=surfer', 'briefs');
      const mark = (input: { path: string; of: string }): void =>
        appendFileSync(input.path, `\nthe ${input.of} sentinel is ${sentinelOf(input.of)}.\n`);
      mark({ path: join(modDir, 'rule.require.surf-wax.md'), of: 'shadowin' });
      mark({ path: join(modDir, 'rule.require.reef-etiquette.md'), of: 'added' });
      mark({ path: join(rolesDir, 'surfer', 'briefs', 'rule.require.surf-wax.md'), of: 'shadowout' });
      mark({ path: join(rolesDir, 'surfer', 'briefs', 'rule.require.surf-wax.md.min'), of: 'shadowout' });
      mark({ path: join(rolesDir, 'surfer', 'briefs', 'rule.forbid.wipeouts.md'), of: 'notted' });
      mark({ path: join(rolesDir, 'surfer', 'briefs', 'howto.paddle-out.md'), of: 'untouched' });

      const env = {
        ...envIsolated(home),
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        CLAUDE_CONFIG_DIR: undefined,
      };
      return { dir: repo.path, env, binPath };
    });

    when('[t0] init links the surfer, and a bare claude -p is asked for its sentinels', () => {
      const init = useThen('init succeeds', () =>
        invokeRhachetCliBinary({ args: ['init', '--roles', 'surfer'], cwd: scene.dir, env: scene.env }),
      );

      // json output, so the envelope's deterministic shape can be locked beside the sentinels
      const ask = useThen('a bare claude -p answers', async () => {
        const asked = await askClaudePrintForSentinels({
          dir: scene.dir,
          env: scene.env,
          binPath: scene.binPath,
          args: ['--output-format', 'json'],
        });
        const envelope = asked.status === 0 ? (JSON.parse(asked.stdout) as object) : null;
        return { ...asked, envelope };
      });

      then('init exits 0', () => {
        expect(init.status).toEqual(0);
      });

      then('init output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(init.stdout),
          stderr: asSnapshotSafe(init.stderr),
        }).toMatchSnapshot();
      });

      then('the json envelope shape is locked, its live values masked', () => {
        expect(asMaskedClaudeEnvelope({ value: ask.envelope ?? {} })).toMatchSnapshot();
      });

      then('the brain answers', () => {
        // a failed ask names its cause: `claude -p` prints its errors to stdout
        expect(
          ask.status === 0
            ? { status: 0 }
            : { status: ask.status, stdout: ask.stdout.slice(-500), stderr: ask.stderr.slice(-500) },
        ).toEqual({ status: 0 });
      });

      then('the brain quotes the mod shadow, the mod addition, and the untouched brief', () => {
        expect(ask.sentinels).toContain(sentinelOf('shadowin'));
        expect(ask.sentinels).toContain(sentinelOf('added'));
        expect(ask.sentinels).toContain(sentinelOf('untouched'));
      });

      then('the brain never quotes the shadowed published brief, nor the noted one', () => {
        expect(ask.sentinels).not.toContain(sentinelOf('shadowout'));
        expect(ask.sentinels).not.toContain(sentinelOf('notted'));
      });
    });
  });
});
