import { given, then, when } from 'test-fns';

import {
  getPreprocessedRoleArgv,
  INCREMENTAL_REMOVE_SENTINEL,
} from './getPreprocessedRoleArgv';

describe('getPreprocessedRoleArgv', () => {
  given('[case1] args with a `-role` remove token', () => {
    when('[t0] preprocessed', () => {
      then('rewrites the lead dash to the sentinel', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--roles', '+architect', '-reviewer'],
        });
        expect(out).toEqual([
          'init',
          '--roles',
          '+architect',
          `${INCREMENTAL_REMOVE_SENTINEL}reviewer`,
        ]);
      });
    });
  });

  given('[case2] args with an absolute role list', () => {
    when('[t0] preprocessed', () => {
      then('passes bare tokens through unchanged (e16)', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--roles', 'mechanic', 'behaver'],
        });
        expect(out).toEqual(['init', '--roles', 'mechanic', 'behaver']);
      });
    });
  });

  given('[case3] a `--roles` list followed by another flag', () => {
    when('[t0] preprocessed', () => {
      then('stops rewrite at the next --flag', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--roles', '-reviewer', '--hooks'],
        });
        expect(out).toEqual([
          'init',
          '--roles',
          `${INCREMENTAL_REMOVE_SENTINEL}reviewer`,
          '--hooks',
        ]);
      });
    });
  });

  given('[case4] a dash-like token NOT after --roles', () => {
    when('[t0] preprocessed', () => {
      then('leaves it untouched', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--mode', 'upsert'],
        });
        expect(out).toEqual(['init', '--mode', 'upsert']);
      });
    });
  });

  given('[case5] the `-r` short alias for `--roles` opens a value run', () => {
    when('[t0] `enroll claude -r -driver` is preprocessed', () => {
      then(
        'the `-r` alias encodes the lead-dash token just like `--roles`',
        () => {
          // commander exposes `-r` as the short alias of `--roles` on enroll, so
          // `-r -driver` must encode the same way `--roles -driver` does — else
          // commander drops `-driver` and the delta regression returns via `-r`
          const out = getPreprocessedRoleArgv({
            args: ['enroll', 'claude', '-r', '-driver'],
          });
          expect(out).toEqual([
            'enroll',
            'claude',
            '-r',
            `${INCREMENTAL_REMOVE_SENTINEL}driver`,
          ]);
        },
      );
    });
  });

  given(
    '[case6] `-r` on act/ask/run is the `--role` alias, NOT `--roles`',
    () => {
      when('[t0] `act -r mechanic -s say-hello` is preprocessed', () => {
        then('the argv is left fully intact — no short flag is mangled', () => {
          // on act/ask/run `-r` is the single-value `--role` alias, and a command
          // gate keeps the encoder off entirely here — so the later `-s` short
          // flag must survive verbatim (never rewritten to a `\u0000s` null byte)
          const out = getPreprocessedRoleArgv({
            args: ['act', '-r', 'mechanic', '-s', 'say-hello'],
          });
          expect(out).toEqual(['act', '-r', 'mechanic', '-s', 'say-hello']);
          expect(out.join('')).not.toContain(INCREMENTAL_REMOVE_SENTINEL);
        });
      });

      when('[t1] `ask -r driver -a "hi"` is preprocessed', () => {
        then('the `-a` short flag survives untouched', () => {
          const out = getPreprocessedRoleArgv({
            args: ['ask', '-r', 'driver', '-a', 'hi'],
          });
          expect(out).toEqual(['ask', '-r', 'driver', '-a', 'hi']);
          expect(out.join('')).not.toContain(INCREMENTAL_REMOVE_SENTINEL);
        });
      });

      when('[t2] `run -r mechanic -s say-hello` is preprocessed', () => {
        then('the `-s` short flag survives untouched', () => {
          const out = getPreprocessedRoleArgv({
            args: ['run', '-r', 'mechanic', '-s', 'say-hello'],
          });
          expect(out).toEqual(['run', '-r', 'mechanic', '-s', 'say-hello']);
          expect(out.join('')).not.toContain(INCREMENTAL_REMOVE_SENTINEL);
        });
      });
    },
  );

  given('[case7] a global `-c <path>` precedes the command', () => {
    when('[t0] `-c cfg.ts enroll claude -r -driver` is preprocessed', () => {
      then('the command is still found past `-c`, so `-driver` encodes', () => {
        // the config path sits between the global flag and the command; the
        // command lookup skips it, so enroll is still recognized and its
        // delta `-driver` is encoded as normal
        const out = getPreprocessedRoleArgv({
          args: ['-c', 'cfg.ts', 'enroll', 'claude', '-r', '-driver'],
        });
        expect(out).toEqual([
          '-c',
          'cfg.ts',
          'enroll',
          'claude',
          '-r',
          `${INCREMENTAL_REMOVE_SENTINEL}driver`,
        ]);
      });
    });

    when('[t1] `-c cfg.ts act -r mechanic -s x` is preprocessed', () => {
      then('act is still recognized, so its `-s` is left intact', () => {
        const out = getPreprocessedRoleArgv({
          args: ['-c', 'cfg.ts', 'act', '-r', 'mechanic', '-s', 'x'],
        });
        expect(out).toEqual([
          '-c',
          'cfg.ts',
          'act',
          '-r',
          'mechanic',
          '-s',
          'x',
        ]);
        expect(out.join('')).not.toContain(INCREMENTAL_REMOVE_SENTINEL);
      });
    });
  });

  given(
    "[case8] enroll's single-valued `--roles` holds exactly one value, then a brain passthrough flag",
    () => {
      // enroll declares `--roles <spec>` (single-valued), unlike init/upgrade's
      // variadic `<roles...>`. so only the ONE token after `--roles` is a role
      // value; any later dash token is a brain passthrough flag, NOT a `-role`
      // remove sigil. the encode must stop after the single value so passthrough
      // short flags reach the brain uncorrupted (never a `\u0000v` null byte)
      when('[t0] `enroll claude --roles -driver -v` is preprocessed', () => {
        then(
          'only `-driver` encodes; the `-v` passthrough is left intact',
          () => {
            const out = getPreprocessedRoleArgv({
              args: ['enroll', 'claude', '--roles', '-driver', '-v'],
            });
            expect(out).toEqual([
              'enroll',
              'claude',
              '--roles',
              `${INCREMENTAL_REMOVE_SENTINEL}driver`,
              '-v',
            ]);
          },
        );
      });

      when(
        '[t1] `enroll claude -r -driver -v` is preprocessed (short alias)',
        () => {
          then('the `-r` run closes after one value, so `-v` survives', () => {
            const out = getPreprocessedRoleArgv({
              args: ['enroll', 'claude', '-r', '-driver', '-v'],
            });
            expect(out).toEqual([
              'enroll',
              'claude',
              '-r',
              `${INCREMENTAL_REMOVE_SENTINEL}driver`,
              '-v',
            ]);
          });
        },
      );

      when(
        '[t2] `enroll claude --roles mechanic -v` is preprocessed (bare value)',
        () => {
          then(
            'the bare value consumes the run, so `-v` passes through',
            () => {
              const out = getPreprocessedRoleArgv({
                args: ['enroll', 'claude', '--roles', 'mechanic', '-v'],
              });
              expect(out).toEqual([
                'enroll',
                'claude',
                '--roles',
                'mechanic',
                '-v',
              ]);
              expect(out.join('')).not.toContain(INCREMENTAL_REMOVE_SENTINEL);
            },
          );
        },
      );
    },
  );

  given(
    "[case9] init's variadic `--roles` encodes across many `-role` values",
    () => {
      // contrast to case8: init/upgrade declare `--roles <roles...>` (variadic),
      // so the run stays open across every value token until the next `--flag`.
      // this guards that the arity split did NOT narrow the variadic behavior
      when(
        '[t0] `init --roles +architect -reviewer -driver` is preprocessed',
        () => {
          then('every `-role` value encodes, not just the first', () => {
            const out = getPreprocessedRoleArgv({
              args: ['init', '--roles', '+architect', '-reviewer', '-driver'],
            });
            expect(out).toEqual([
              'init',
              '--roles',
              '+architect',
              `${INCREMENTAL_REMOVE_SENTINEL}reviewer`,
              `${INCREMENTAL_REMOVE_SENTINEL}driver`,
            ]);
          });
        },
      );
    },
  );
});
