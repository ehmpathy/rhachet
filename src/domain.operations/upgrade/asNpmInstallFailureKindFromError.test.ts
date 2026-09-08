import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asNpmInstallFailureError } from './asNpmInstallFailureError';
import {
  NPM_INSTALL_FAILURE_KINDS,
  type NpmInstallFailureKind,
} from './asNpmInstallFailureKind';
import { asNpmInstallFailureKindFromError } from './asNpmInstallFailureKindFromError';

describe('asNpmInstallFailureKindFromError', () => {
  given('[case1] EVERY kind the classifier can produce', () => {
    // 🚨 THE DRIFT CLAMP, and the reason this file exists at all.
    //
    //   this function is the READER of a fact `asNpmInstallFailureKind` is the WRITER
    //   of, and it used to hand-copy the union's members into an inline `||` chain.
    //   the copy drifted the first time a member was added: `timed-out` landed in the
    //   union and was NOT copied here, so a KNOWN timeout degraded to `unclassified`
    //   and `execUpgrade` printed *"cause unclassified"* directly above a message that
    //   said the install exceeded its bound. the code held the cause; the orchestrator
    //   threw it away (`rule.forbid.failhide`).
    //
    //   so this row does NOT enumerate the kinds — it reads the SAME list the union is
    //   derived from. a member added tomorrow is covered with no edit here, which is
    //   the property the inline chain could never have.
    //
    //   the mutation that reddens this: drop any member from the membership test
    for (const kind of NPM_INSTALL_FAILURE_KINDS) {
      when(`[t0] the metadata carries kind='${kind}'`, () => {
        then('it reads back as ITSELF, never degraded', () => {
          const error = new MalfunctionError('install failed', { kind });
          expect(asNpmInstallFailureKindFromError({ error })).toEqual(kind);
        });
      });
    }
  });

  given('[case2] a real error the class-picker produced', () => {
    // .why = `[case1]` builds its metadata by hand, so on its own it proves only that
    //   the reader accepts a shape. this row closes the loop end to end: the picker
    //   WRITES the metadata and the reader READS it, so a rename of the `kind` field
    //   at either site reddens rather than passes on two hand-made fixtures that
    //   happen to match each other
    when('[t0] a timeout error round-trips through the pair', () => {
      then(
        'the orchestrator recovers "timed-out", never "unclassified"',
        () => {
          const error = asNpmInstallFailureError({
            kind: 'timed-out',
            target: 'global',
            packageManager: 'pnpm',
            exitCode: null,
            output: 'Progress: resolved 41, reused 0, downloaded 12',
            packages: ['rhachet@latest'],
            shellPresence: 'absent',
          });
          expect(asNpmInstallFailureKindFromError({ error })).toEqual(
            'timed-out',
          );
        },
      );
    });

    when('[t1] an absent-package error round-trips through the pair', () => {
      then('the orchestrator recovers "package-absent"', () => {
        const error = asNpmInstallFailureError({
          kind: 'package-absent',
          target: 'local',
          packageManager: 'pnpm',
          exitCode: 1,
          output: 'ERR_PNPM_FETCH_404  GET .../rhachet-roles-bhrian: Not Found',
          packages: ['rhachet-roles-bhrian@latest'],
          shellPresence: 'absent',
        });
        expect(asNpmInstallFailureKindFromError({ error })).toEqual(
          'package-absent',
        );
      });
    });
  });

  given('[case3] an error we cannot read a kind from', () => {
    // 🚨 the guard, and it must NOT over-fire in either direction: an unreadable error
    //   degrades to `unclassified` (we say we do not know), never to a nearest guess
    when('[t0] the error is not a HelpfulError at all', () => {
      then('it degrades to unclassified', () => {
        expect(
          asNpmInstallFailureKindFromError({ error: new Error('boom') }),
        ).toEqual('unclassified');
      });
    });

    when('[t1] the metadata carries a kind we do not declare', () => {
      then('an unknown kind is NOT trusted through', () => {
        // .why = the metadata is data, so a stale or hand-edited value can reach here.
        //   to return it unchecked would let a caller branch on a kind no row handles
        const error = new ConstraintError('install failed', {
          kind: 'disk-on-fire' as unknown as NpmInstallFailureKind,
        });
        expect(asNpmInstallFailureKindFromError({ error })).toEqual(
          'unclassified',
        );
      });
    });

    when('[t2] the error was redacted, so it carries no metadata', () => {
      then('it degrades rather than throw', () => {
        // .why = `execUpgrade` prints `error.redact(['metadata']).message`, so a
        //   redacted clone is a real value in this codebase, not a hypothetical
        const error = asNpmInstallFailureError({
          kind: 'timed-out',
          target: 'global',
          packageManager: 'pnpm',
          exitCode: null,
          output: '',
          packages: ['rhachet@latest'],
          shellPresence: 'absent',
        }).redact(['metadata']);
        expect(asNpmInstallFailureKindFromError({ error })).toEqual(
          'unclassified',
        );
      });
    });
  });
});
