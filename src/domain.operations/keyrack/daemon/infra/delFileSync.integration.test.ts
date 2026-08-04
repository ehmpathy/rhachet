import { getError, given, then, when } from 'test-fns';

import { delFileSync } from '@src/domain.operations/keyrack/daemon/infra/delFileSync';

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

/**
 * .what = clamps the one shape every daemon lifecycle path needs: delete a file, treat
 *         absence as success, and let every other fault through
 * .why = an integration test rather than a unit one, deliberately. this operation IS a
 *        filesystem boundary — its entire contract is which errno it allows and which it
 *        surfaces, and a mocked fs would assert only what the mock was told to raise
 *        (rule.forbid.unit.remote-boundaries)
 */
describe('delFileSync', () => {
  // a scoped dir, so no case can reach a file another case owns
  const workDir = mkdtempSync('/tmp/dfs-');

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  /**
   * [uc1] the happy path — a file that is present is removed
   */
  given('[case1] a file that is present', () => {
    when('[t0] it is deleted', () => {
      then('it is gone afterward', () => {
        const path = `${workDir}/present.sock`;
        writeFileSync(path, '');
        expect(existsSync(path)).toEqual(true);

        delFileSync({ path });

        expect(existsSync(path)).toEqual(false);
      });
    });
  });

  /**
   * [uc2] absence is the desired end state, not an error
   *
   * .why = this is the ENOENT allowlist, and it is the reason the operation exists. the
   * daemon's socket and pid files are unlinked from more than one exit route — the
   * SIGTERM handler, the 'exit' handler, and a prune from another process — so a delete
   * that raced another delete must read as success. any other verdict would turn a
   * benign, normal race into a daemon that fails on its way out
   */
  given('[case2] a path where no file is present', () => {
    when('[t0] it is deleted', () => {
      then('it does not throw', () => {
        const path = `${workDir}/never-was-here.sock`;
        expect(existsSync(path)).toEqual(false);

        expect(() => delFileSync({ path })).not.toThrow();
      });
    });

    when('[t1] the same path is deleted twice in a row', () => {
      then(
        'the second call is a benign no-op — the operation is idempotent',
        () => {
          const path = `${workDir}/twice.sock`;
          writeFileSync(path, '');

          delFileSync({ path });
          expect(() => delFileSync({ path })).not.toThrow();

          expect(existsSync(path)).toEqual(false);
        },
      );
    });
  });

  /**
   * [uc3] every OTHER errno surfaces — the allowlist is narrow on purpose
   *
   * .why = this half of the contract is the one a lazy `catch {}` would silently break. a
   * bare catch reads identically to this operation on [case1] and [case2] and differs only
   * here, so this case is what separates them. the harm it hides is concrete: `daemon
   * prune` unlinks a socket it could not actually remove, reports the daemon reaped, and
   * the caller never learns a live daemon outlived the prune (rule.forbid.failhide)
   *
   * .note = a directory is the portable way to provoke a non-ENOENT unlink fault. linux
   * raises EISDIR and macos raises EPERM; the assertion below pins neither, only that the
   * operation refused to swallow it
   */
  given('[case3] a path that names a directory rather than a file', () => {
    when('[t0] it is deleted', () => {
      then('the error is surfaced, not swallowed', () => {
        const error = getError(() => delFileSync({ path: workDir }));

        // assert on the errno, not on `instanceof Error`
        // .why = an fs error crosses a realm boundary under jest, so instanceof compares
        // two distinct Error constructors and fails on an error that is genuinely an
        // Error. the errno IS the contract here anyway — which code is allowed, which is
        // surfaced — so this asserts the property that matters rather than its wrapper
        const code = (error as NodeJS.ErrnoException | undefined)?.code;
        expect(code).toBeDefined();
        expect(code).not.toEqual('ENOENT');

        // and the directory survived — the throw happened instead of a delete
        expect(existsSync(workDir)).toEqual(true);
      });
    });
  });
});
