import { readFileSync } from 'fs';
import { join } from 'path';
import { given, then, when } from 'test-fns';

import { getBrainCliPassthroughArgs } from './getBrainCliPassthroughArgs';

/**
 * .what = the clamp `getBrainCliPassthroughArgs`'s docblock promises — that every option
 *   `invokeEnroll` registers is stripped before the raw args reach the brain cli
 * .why = the two lists are one contract with NO compiler tie between them. a flag added to
 *   `.option(...)` and not to the stripper is read by enroll AND forwarded to the child, and
 *   the child does not merely ignore it: it answers `error: unknown option` and EXITS, which
 *   cascades into a clone that reports an address and reads DEAD seconds later (measured
 *   2026-09-17, four clones, one per flag form)
 *
 * .note = it asserts BEHAVIOR, never set membership — each registered flag is fed through
 *   the real function. so `--roles`, which is stripped by `isRolesFlag` rather than by a
 *   literal in either set, is covered and the clamp never learns how
 *
 * .note = it reads `invokeEnroll.ts` as TEXT rather than as an import, so no dependency runs
 *   upward from domain.operations into contract (`rule.require.directional-deps`). that read
 *   is a filesystem boundary, which puts the clamp in the integration tier
 *   (`rule.forbid.unit.remote-boundaries`)
 */

const INVOKE_ENROLL_PATH = join(
  __dirname,
  '..',
  '..',
  'contract',
  'cli',
  'invokeEnroll.ts',
);

/**
 * .what = reads each long option `invokeEnroll` registers, and whether it holds a value
 * .why = the clamp's subject is the registered set, so it must be read from the registration
 *   site rather than restated here — a restated list drifts from the source it guards
 */
const getAllRegisteredEnrollOptions = (input: {
  source: string;
}): { flag: string; holdsValue: boolean }[] => {
  // `.option(` then its spec string — `'--watch'`, `'--as <address>'`, `'-r, --roles <spec>'`.
  // `\s*` spans the newline commander's multi-line registrations put before the spec
  const specs = [...input.source.matchAll(/\.option\(\s*'([^']+)'/g)].map(
    (match) => match[1]!,
  );

  return specs.map((spec) => ({
    flag: /--[\w-]+/.exec(spec)![0],
    // commander marks a value-holding option with `<required>` or `[optional]`
    holdsValue: /[<[]/.test(spec),
  }));
};

describe('getBrainCliPassthroughArgs', () => {
  given('every option `invokeEnroll` registers', () => {
    const options = getAllRegisteredEnrollOptions({
      source: readFileSync(INVOKE_ENROLL_PATH, 'utf8'),
    });

    then('the scan finds them — an empty scan would pass vacuously', () => {
      expect(options.length).toBeGreaterThan(0);
    });

    then(
      'the scan reaches the `-r, --roles <spec>` form, its hardest shape',
      () => {
        // the canary: a short alias, a multi-line registration, and a value placeholder in
        // one spec. a regex that reads this one reads every shape the file carries
        expect(options).toContainEqual({ flag: '--roles', holdsValue: true });
      },
    );

    when('[t0] each is handed to the stripper in its spaced form', () => {
      then('not one survives into the brain passthrough', () => {
        const leaked = options
          .filter(
            (option) =>
              getBrainCliPassthroughArgs({
                args: option.holdsValue
                  ? [option.flag, 'a-value', '--brain-own-flag']
                  : [option.flag, '--brain-own-flag'],
                positionalBrain: null,
              }).join(' ') !== '--brain-own-flag',
          )
          .map((option) => option.flag);

        expect(leaked).toEqual([]);
      });
    });

    when(
      '[t1] each value-holding option is handed to the stripper inline',
      () => {
        then('not one survives into the brain passthrough', () => {
          const leaked = options
            .filter((option) => option.holdsValue)
            .filter(
              (option) =>
                getBrainCliPassthroughArgs({
                  args: [`${option.flag}=a-value`, '--brain-own-flag'],
                  positionalBrain: null,
                }).join(' ') !== '--brain-own-flag',
            )
            .map((option) => option.flag);

          expect(leaked).toEqual([]);
        });
      },
    );
  });
});
