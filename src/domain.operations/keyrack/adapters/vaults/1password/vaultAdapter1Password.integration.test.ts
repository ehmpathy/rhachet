import { genTempDir, getError, given, then, when } from 'test-fns';

import { getOneGitRepoRootSync } from '@src/infra/git/getOneGitRepoRootSync';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { vaultAdapter1Password } from './vaultAdapter1Password';

/**
 * 🔴 .what = the mock `op` binary, the same one the acceptance tier already uses
 * .why = every case here needs `op` either PRESENT or ABSENT, and a host's inventory must
 *   decide neither (`rule.require.hermetic-tests`). the mock supplies presence; an op-free
 *   PATH supplies absence.
 */
const DIR_MOCK_OP_CLI = join(
  getOneGitRepoRootSync({ from: __dirname }) ?? process.cwd(),
  'blackbox/.test/assets/mock-op-cli',
);

/**
 * 🔴 .what = a PATH on which `op` cannot be found, and `which` still can
 * .why = `isOpCliInstalled` shells out to `which op`, so an absence must be CONSTRUCTED from a
 *   PATH that still carries `which` itself — an empty PATH would fail for the wrong reason, and
 *   the case would grade a broken shell rather than an absent binary.
 *
 * 🟡 .note = the `which` is WRITTEN, never found: a posix-builtin scan of $PATH, placed in a temp
 *   dir that PATH names alone. so no host path is probed (`rule.forbid.reads-outside-the-repo`),
 *   and a host with `op` in `/usr/bin` cannot defeat the case.
 */
const genOnePathWithoutOp = (): string => {
  const dir = genTempDir({ slug: 'op-absent-path' });
  writeFileSync(
    join(dir, 'which'),
    [
      '#!/bin/sh',
      'IFS=:',
      'for d in $PATH; do [ -x "$d/$1" ] && exit 0; done',
      'exit 1',
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  return dir;
};

/**
 * .what = run a body under a chosen PATH, then restore the one the suite inherited
 * .why = `execFile`/`exec` read `process.env.PATH` at call time, so a per-case override is how
 *   an in-process adapter test picks which `op` it meets. the restore keeps the override inside
 *   the case that set it, so no peer case inherits it.
 */
const withPath = async <T>(
  input: { path: string },
  body: () => Promise<T>,
): Promise<T> => {
  const pathBefore = process.env.PATH;
  process.env.PATH = input.path;
  try {
    return await body();
  } finally {
    process.env.PATH = pathBefore;
  }
};

describe('vaultAdapter1Password', () => {
  // 🔴 .note = each case CONSTRUCTS its own precondition — an op-free PATH, or the mock op on
  //   PATH. absence is constructible exactly as presence is, so no case reads the machine and
  //   every case runs everywhere; a host probe would degrade a case to a pass wherever `op` is
  //   absent (`rule.forbid.failhide`).

  given('[case1] op cli is not installed', () => {
    const pathWithoutOp = genOnePathWithoutOp();

    when('[t0] isUnlocked called', () => {
      then('returns false when op is unavailable', async () => {
        const result = await withPath({ path: pathWithoutOp }, () =>
          vaultAdapter1Password.isUnlocked(),
        );
        expect(result).toBe(false);
      });
    });
  });

  given('[case2] get requires exid', () => {
    when('[t0] get called without exid', () => {
      then('throws error about absent exid', async () => {
        const error = await getError(
          vaultAdapter1Password.get({ slug: 'TEST_KEY' }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('requires exid');
      });
    });
  });

  given('[case3] del is a noop (1password is refed vault)', () => {
    when('[t0] del called', () => {
      then(
        'completes without error (keyrack only removes manifest entry)',
        async () => {
          // 1password is a refed vault — keyrack stores pointer, not secret
          // del removes the pointer (manifest entry), not the 1password item
          // the adapter del is noop; delKeyrackKeyHost handles manifest removal
          await expect(
            vaultAdapter1Password.del({
              slug: 'TEST_KEY',
              mech: null,
              meta: null,
            }),
          ).resolves.toBeUndefined();
        },
      );
    });
  });

  given('[case4] op cli is available', () => {
    const pathWithMockOp = `${DIR_MOCK_OP_CLI}:${process.env.PATH}`;

    when('[t0] unlock called', () => {
      then('does not throw (noop)', async () => {
        // unlock is a noop for 1password - it relies on biometric or env var
        // .note = asserted via `resolves.toBeUndefined()`, the same shape `[case3]` uses above —
        //   the await is the real assertion (`rule.forbid.failhide`)
        await expect(
          vaultAdapter1Password.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });
    });

    when('[t1] isUnlocked called with op available', () => {
      // 🔴 asserted as `true`, never `typeof result === 'boolean'` — a type-only check
      //    would also pass on the `false` an absent op returns
      then('reports the vault unlocked', async () => {
        const result = await withPath({ path: pathWithMockOp }, () =>
          vaultAdapter1Password.isUnlocked(),
        );
        expect(result).toBe(true);
      });
    });

    when('[t2] get called with an exid whose item does not exist', () => {
      // 🟡 the vault segment is `keyrack`, never a made-up name: `assertVaultIsKeyrack` calls
      //    `process.exit(2)` on any other vault, which would kill the jest worker rather than
      //    reach the read this case grades
      // 🔴 .note = proves the adapter's absent-item allowlist by message content alone
      //    (`asErrorMessage`) — the `child_process` rejection reports `inst=false` under jest even
      //    as its message reads "could not be found", which is what `op` actually promises.
      then('returns null for absent item', async () => {
        const result = await withPath({ path: pathWithMockOp }, () =>
          vaultAdapter1Password.get({
            slug: 'FAKE_KEY',
            exid: 'op://keyrack/nonexistent-item/password',
          }),
        );
        expect(result).toBeNull();
      });
    });
  });

  given('[case5] set validates exid format', () => {
    const pathWithMockOp = `${DIR_MOCK_OP_CLI}:${process.env.PATH}`;

    when('[t0] set called with invalid exid format', () => {
      // 🟡 op must be PRESENT here: `set` calls `process.exit(2)` when `op` is absent, so an
      //    op-free run would take down the worker before it reached the format check
      then('throws ConstraintError about invalid format', async () => {
        const error = await withPath({ path: pathWithMockOp }, () =>
          getError(
            vaultAdapter1Password.set({
              slug: 'TEST_KEY',
              exid: 'not-a-valid-exid',
            }),
          ),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('secret reference uri');
      });
    });
  });
});
