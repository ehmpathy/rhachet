import { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { invokeKeyrack } from './invokeKeyrack';

/**
 * .what = integration tests for keyrack source command
 * .why = verify fail-fast behavior for sudo credentials
 */
describe('invokeKeyrack source (integration)', () => {
  given('[fix] sudo credentials require --key', () => {
    /**
     * .what = sudo env requires --key flag
     * .why = sudo keys are stored in host manifest only, not keyrack.yml
     *
     * without --key, the source command would silently return empty results
     * because getAllKeyrackGrantsByRepo reads from keyrack.yml which
     * does not contain sudo keys. fail-fast with clear error instead.
     */
    when('[t0] source called with --env sudo but no --key', () => {
      then('throws ConstraintError with helpful hint', async () => {
        const program = new Command('rhachet');
        program.exitOverride(); // throw instead of process.exit

        invokeKeyrack({ program });

        // capture the error thrown by the command
        let thrownError: Error | null = null;
        try {
          await program.parseAsync([
            'node',
            'rhachet',
            'keyrack',
            'source',
            '--env',
            'sudo',
          ]);
        } catch (err) {
          thrownError = err as Error;
        }

        // verify ConstraintError thrown
        expect(thrownError).not.toBeNull();
        expect(thrownError).toBeInstanceOf(ConstraintError);
        expect(thrownError?.message).toContain('sudo credentials require --key');
        expect(thrownError?.message).toContain('not stored in keyrack.yml');
      });
    });

    when('[t1] source called with --env sudo and --key', () => {
      then('does not throw ConstraintError (proceeds to key lookup)', async () => {
        const program = new Command('rhachet');
        program.exitOverride();

        // mock process.exit to prevent Commander from throwing on exit
        const exitSpy = jest
          .spyOn(process, 'exit')
          .mockImplementation(() => undefined as never);

        invokeKeyrack({ program });

        // this will fail later (no daemon, key absent, etc) but should NOT
        // fail with ConstraintError about missing --key
        let thrownError: Error | null = null;
        try {
          await program.parseAsync([
            'node',
            'rhachet',
            'keyrack',
            'source',
            '--env',
            'sudo',
            '--key',
            'TEST_KEY',
          ]);
        } catch (err) {
          thrownError = err as Error;
        }

        exitSpy.mockRestore();

        // should NOT be a ConstraintError about --key
        // (may be exit error from key absent, that's expected)
        if (thrownError instanceof ConstraintError) {
          expect(thrownError.message).not.toContain(
            'sudo credentials require --key',
          );
        }
      });
    });
  });
});
