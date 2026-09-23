import { Command } from 'commander';
import { MalfunctionError } from 'helpful-errors';

import { getBrainCliPassthroughArgs } from '@src/domain.operations/enroll/getBrainCliPassthroughArgs';

import { invokeEnroll } from './invokeEnroll';

/**
 * .what = read the flags `enroll` actually registers with commander, off the
 *   registered command itself
 * .why = the drift clamp below must compare against the LIVE registration, never a
 *   hand-copied list — a second hardcoded list would drift in exactly the way the
 *   clamp exists to catch
 */
const getEnrollFlags = (): {
  long: string;
  short: string | null;
  takesValue: boolean;
}[] => {
  const program = new Command();
  invokeEnroll({ program });
  const enroll = program.commands.find((c) => c.name() === 'enroll');
  if (enroll === undefined)
    throw new MalfunctionError('invokeEnroll registered no `enroll` command', {
      registered: program.commands.map((c) => c.name()),
    });
  return enroll.options.map((option) => {
    if (option.long === undefined)
      throw new MalfunctionError('an enroll option has no long form', {
        flags: option.flags,
      });
    return {
      long: option.long,
      short: option.short ?? null,
      // commander marks a value flag `required` (`--as <x>`) or `optional` (`--as [x]`);
      // a boolean or a `--no-*` negation is neither
      takesValue: option.required || option.optional,
    };
  });
};

/**
 * .what = the contract between enroll's REGISTERED flags and the passthrough stripper
 * .why =
 *   - enroll reads its own args off the RAW argv (the tail goes verbatim to the brain
 *     cli), so every flag it registers must ALSO be listed in
 *     getBrainCliPassthroughArgs. the two lists are one contract with no compiler tie
 *     between them
 *   - this test IS that tie. it lives in the contract layer because it must read
 *     `invokeEnroll`, and a domain.operations test may not import contract/
 *     (rule.require.directional-deps)
 *
 * 🔴 .the defect it clamps = `--watch` and `--async` were registered on enroll and
 *   ABSENT from the stripper, so both leaked into the child argv. a brain cli does
 *   not merely shrug at an unknown option — it answers
 *   `error: unknown option '--async'` and EXITS, which cascades: the pty child dies,
 *   `finalize` closes and unlinks the socket, the detached host's loop drains, the
 *   host exits. so `enroll --async` handed back an address and every `say` to it read
 *   DEAD seconds later (measured 2026-09-17, four clones, one per flag form).
 *
 * ⚠️ .why the acceptance tier missed it = the no-tty acceptance case asserted
 *   `socketEligible: true` — a FLAG on the handoff — and never that the clone
 *   ANSWERS. and it passed no explicit `--watch`/`--async` at all (the mode is
 *   inferred from the tty), so the leak was never on the path it exercised
 */
describe('invokeEnroll ⇄ getBrainCliPassthroughArgs (the registered-flag contract)', () => {
  const flags = getEnrollFlags();

  /**
   * .the floor = a registration wiped to zero must not make every row below vacuous.
   *   a dynamic clamp over an empty set passes trivially, so the set itself is asserted
   */
  const FLAGS_EXPECTED = [
    '--brain',
    '--roles',
    '--as',
    '--no-socket',
    '--reason',
    '--watch',
    '--async',
    '--output',
  ];
  FLAGS_EXPECTED.forEach((long) =>
    test(`[floor] enroll still registers ${long}`, () => {
      expect(flags.map((f) => f.long)).toContain(long);
    }),
  );

  describe('[clamp] EVERY registered enroll flag is stripped from the brain passthrough', () => {
    flags.forEach((flag) =>
      test(`${flag.long}${flag.takesValue ? ' <value>' : ''} (spaced form)`, () => {
        const args = [
          'claude',
          flag.long,
          ...(flag.takesValue ? ['somevalue'] : []),
          '--print',
        ];
        expect(
          getBrainCliPassthroughArgs({ args, positionalBrain: 'claude' }),
        ).toEqual(['--print']);
      }),
    );
  });

  describe('[clamp] EVERY registered value flag is stripped in the inline form too', () => {
    // the stripper carries a SECOND hardcoded list for `--flag=value`, so a new value
    // flag added to the spaced list alone would still leak in the inline form
    flags
      .filter((flag) => flag.takesValue)
      .forEach((flag) =>
        test(`${flag.long}=value (inline form)`, () => {
          const args = ['claude', `${flag.long}=somevalue`, '--print'];
          expect(
            getBrainCliPassthroughArgs({ args, positionalBrain: 'claude' }),
          ).toEqual(['--print']);
        }),
      );
  });

  describe('[clamp] EVERY registered short form is stripped', () => {
    flags
      .filter((flag) => flag.short !== null)
      .forEach((flag) =>
        test(`${flag.short} (short form of ${flag.long})`, () => {
          const args = [
            'claude',
            flag.short as string,
            ...(flag.takesValue ? ['somevalue'] : []),
            '--print',
          ];
          expect(
            getBrainCliPassthroughArgs({ args, positionalBrain: 'claude' }),
          ).toEqual(['--print']);
        }),
      );
  });
});
