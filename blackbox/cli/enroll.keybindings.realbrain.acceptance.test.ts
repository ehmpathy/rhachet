import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';

import { enrollRealClaudeAndWaitReach, setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genIsolatedClaudeHome } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

// a real claude boot (~30-90s) exceeds the 90s global hook cap
jest.setTimeout(300000);

// two keys in one block: claude tallies each key into its count of user bindings
const KEYBINDINGS_BYTES = `${JSON.stringify(
  { bindings: [{ context: 'Chat', bindings: { 'ctrl+g': 'chat:submit', 'ctrl+t': 'chat:newline' } }] },
  null,
  2,
)}\n`;

/**
 * .what = poll a file until its text matches a pattern, or fail loud with its tail
 * .why = claude writes its debug log as it boots; the keybindings lines land after the tui is up
 */
const pollFileForPattern = async (input: {
  path: string;
  pattern: RegExp;
  timeoutMs: number;
}): Promise<string> => {
  const deadline = Date.now() + input.timeoutMs;
  while (Date.now() < deadline) {
    const text = existsSync(input.path) ? readFileSync(input.path, 'utf-8') : '';
    if (input.pattern.test(text)) return text;
    await new Promise<void>((done) => setTimeout(done, 500));
  }
  const text = existsSync(input.path) ? readFileSync(input.path, 'utf-8') : '';
  throw new MalfunctionError('the debug log never matched the pattern', {
    path: input.path,
    pattern: input.pattern.source,
    tail: text.slice(-1500),
    hint: 'the tail shows how far claude booted; a tail with no [keybindings] line means the tui never loaded them',
  });
};

/**
 * .what = a real clone loads the human's keybindings through its brain dir's arrow
 * .why = the integration and acceptance suites prove the arrow is laid and resolves to the
 *        home file; only a real brain proves claude reads `keybindings.json` from the config
 *        dir a clone spawns with, and watches it for edits
 * .note = the witness is claude's own debug log (`--debug-file`): it names the path it loaded
 *        and the count of user bindings, so the read is deterministic
 * .note = a print clone (`-p`) loads no keybindings at all; only a tui clone proves this
 */
describeBrainLiveOnDemand('rhx enroll — a real clone loads the human keybindings (acceptance, real haiku)', () => {
  given('[case1] a HOME whose `.claude/keybindings.json` holds two chat keys', () => {
    const scene = useBeforeAll(async () => {
      // a temp HOME: only the credential is shared, so the host's keybindings never reach the run
      const { home, binDir } = genIsolatedClaudeHome({ slug: 'enroll-keybindings-home' });
      writeFileSync(join(home, '.claude', 'keybindings.json'), KEYBINDINGS_BYTES);

      const dir = genTempDir({ slug: 'enroll-keybindings-realbrain' });
      setupEnrollFixture({ dir });
      const debugLog = join(dir, 'claude.debug.log');

      // the isolated HOME; the cached claude first on PATH
      const env = {
        ...envIsolated(home),
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        CLAUDE_CONFIG_DIR: undefined,
      };
      const enrolled = await enrollRealClaudeAndWaitReach({
        dir,
        env,
        roles: ['-driver'],
        brainArgs: ['--debug-file', debugLog],
      });

      // the clone's brain dir, the config dir claude boots with. a throw here kills the brain
      // before it rethrows: afterAll cannot reach a scene that never resolved, so the host-wide
      // brain slot the enroll took would otherwise stay held
      const brainDir = await (async (): Promise<string> => {
        try {
          const repoPath = getOneRepoPath({ from: dir });
          const clone = getOneCloneByRef({ repoPath, ref: asCloneRef({ raw: enrolled.address }) });
          if (clone === null)
            throw new MalfunctionError('the enrolled clone was not found on disk', {
              address: enrolled.address,
              hint: 'check .agent/.actors/ under the fixture dir',
            });
          return getBrainOndiskDir({
            actorDir: getActorOndiskDir({ repoPath: clone.actor.repoPath, exid: clone.actor.exid }),
          });
        } catch (error) {
          await enrolled.bg.kill();
          throw error;
        }
      })();
      return { bg: enrolled.bg, debugLog, brainDir };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone boots its tui', () => {
      const log = useBeforeAll(async () => ({
        text: await pollFileForPattern({
          path: scene.debugLog,
          pattern: /\[keybindings\] Watching for changes to /,
          timeoutMs: 60000,
        }),
      }));

      then('claude loads the two user bindings from the brain dir arrow', () => {
        expect(log.text).toContain(
          `[keybindings] Loaded 2 user bindings from ${join(scene.brainDir, 'keybindings.json')}`,
        );
      });

      then('claude finds no fault in them', () => {
        expect(log.text).not.toMatch(/\[keybindings\] Found \d+ validation issue/);
        expect(log.text).not.toContain('[keybindings] Error loading');
      });

      then('claude registers a watch on the brain dir arrow', () => {
        // the log names the path claude watches; no case edits the home file live, so a reload is not proven
        expect(log.text).toContain(
          `[keybindings] Watching for changes to ${join(scene.brainDir, 'keybindings.json')}`,
        );
      });
    });
  });
});
