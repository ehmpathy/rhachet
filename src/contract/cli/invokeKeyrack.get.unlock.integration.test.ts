import { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { keyrack } from '@src/contract/sdk.keyrack';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';

import { invokeKeyrack } from './invokeKeyrack';

/**
 * .what = integration test for the cli `keyrack get --unlock` flag
 * .why = proves the flag routes a locked key through the get-or-unlock core: the command
 *        auto-unlocks it (narrowly) and reports it granted, instead of an exit 2 as locked
 */
describe('invokeKeyrack get --unlock (integration)', () => {
  const owner = 'ehmpathy';
  const env = 'test';
  const key = 'XAI_API_KEY';
  const slug = 'ehmpathy.test.XAI_API_KEY';

  /**
   * .what = fail fast (caller-fix) if the key is not granted on this host
   * .why = an absent host setup is a caller constraint — throw loud, not a silent skip
   */
  const assertKeyGranted = async (): Promise<void> => {
    const granted = await keyrack
      .get({ for: { key: slug }, env, owner })
      .then(({ attempt }) => attempt.status === 'granted')
      .catch(() => false);
    if (!granted)
      throw new ConstraintError(
        'keyrack not set up for XAI_API_KEY on this host',
        {
          hint: 'run: rhx keyrack unlock --owner ehmpathy --env test',
        },
      );
  };

  given('[case1] a locked key is requested with --unlock', () => {
    when('[t0] keyrack get --key XAI_API_KEY --unlock', () => {
      then(
        'it auto-unlocks and reports the key granted (no exit 2)',
        async () => {
          await assertKeyGranted();
          await relockKeyrack({ owner, slugs: [slug] });

          const program = new Command('rhachet');
          program.exitOverride();

          // capture stdout (vibes treestruct) + guard process.exit
          const logs: string[] = [];
          const logSpy = jest
            .spyOn(console, 'log')
            .mockImplementation((...args) => {
              logs.push(args.join(' '));
            });
          const exitSpy = jest
            .spyOn(process, 'exit')
            .mockImplementation(() => undefined as never);

          invokeKeyrack({ program });
          await program.parseAsync([
            'node',
            'rhachet',
            'keyrack',
            'get',
            '--key',
            key,
            '--owner',
            owner,
            '--env',
            env,
            '--unlock',
          ]);

          const output = logs.join('\n');
          const exitCalls = exitSpy.mock.calls.map((call) => call[0]);
          logSpy.mockRestore();
          exitSpy.mockRestore();

          // the output names the key and, after auto-unlock, no longer reports it locked
          expect(output).toContain(key);
          expect(output).not.toContain('locked');
          // granted → the command does not exit 2
          expect(exitCalls).not.toContain(2);
        },
      );
    });
  });
});
